import { collection, getDocs, query, where, getDoc, doc } from "firebase/firestore";
import { db } from "../config/firebase";

export const DEFAULT_PAYROLL_POLICY = Object.freeze({
  workingDaysPerMonth: 26,
  standardHoursPerDay: 8,
  paidLeaveEnabled: true,
  overtimeEnabled: false,
  overtimeMultiplier: 1.5,
  halfDayFactor: 0.5,
});

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const round = (value) => Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;

const periodBounds = (month, year) => ({
  start: `${year}-${String(month).padStart(2, "0")}-01`,
  end: `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`,
});

const isWeekday = (date) => {
  const day = new Date(`${date}T00:00:00`).getDay();
  return day !== 0 && day !== 6;
};

const eachDate = (startDate, endDate) => {
  const result = [];
  const cursor = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  while (cursor <= end) {
    result.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
};

const getPolicy = async () => {
  try {
    const snapshot = await getDoc(doc(db, "companySettings", "payrollPolicy"));
    if (!snapshot.exists()) return DEFAULT_PAYROLL_POLICY;
    return { ...DEFAULT_PAYROLL_POLICY, ...snapshot.data() };
  } catch {
    return DEFAULT_PAYROLL_POLICY;
  }
};

const fetchByUser = async (collectionName, userId, email) => {
  const queries = [];
  if (userId) queries.push(query(collection(db, collectionName), where("userId", "==", userId)));
  if (email) queries.push(query(collection(db, collectionName), where("userEmail", "==", email)));
  const seen = new Set();
  const rows = [];
  for (const q of queries) {
    const snapshot = await getDocs(q);
    snapshot.docs.forEach((item) => {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        rows.push({ id: item.id, ...item.data() });
      }
    });
  }
  return rows;
};

const leaveDates = (leave) => {
  if (!leave?.startDate || !leave?.endDate) return [];
  return eachDate(leave.startDate, leave.endDate).filter(isWeekday);
};

const isApproved = (leave) => String(leave?.status || "").toLowerCase() === "approved";
const isUnpaidLeave = (leave) => /unpaid|lop|loss.of.pay|without.pay/i.test(String(leave?.leaveType || ""));

export const calculateAttendancePayroll = async ({ employee, month, year }) => {
  if (!employee) throw new Error("Employee is required for payroll calculation.");
  const numericMonth = toNumber(month);
  const numericYear = toNumber(year);
  if (numericMonth < 1 || numericMonth > 12) throw new Error("Invalid payroll month.");
  if (numericYear < 2000 || numericYear > 3000) throw new Error("Invalid payroll year.");

  const policy = await getPolicy();
  const bounds = periodBounds(numericMonth, numericYear);
  const userId = employee.uid || employee.userId || "";
  const email = String(employee.email || employee.employeeEmail || "").trim().toLowerCase();

  const [attendance, leaves] = await Promise.all([
    fetchByUser("attendance", userId, email),
    fetchByUser("leaves", userId, email),
  ]);

  const attendanceInPeriod = attendance.filter((row) => row.date >= bounds.start && row.date <= bounds.end);
  const leaveInPeriod = leaves.filter((row) => isApproved(row) && row.startDate <= bounds.end && row.endDate >= bounds.start);

  const attendanceByDate = new Map();
  attendanceInPeriod.forEach((row) => {
    if (!row.date || !isWeekday(row.date)) return;
    const status = String(row.status || "").toLowerCase();
    const factor = status.includes("half") ? toNumber(policy.halfDayFactor, 0.5) : 1;
    const previous = attendanceByDate.get(row.date) || 0;
    attendanceByDate.set(row.date, Math.max(previous, factor));
  });

  const paidLeaveDates = new Set();
  const unpaidLeaveDates = new Set();
  leaveInPeriod.forEach((leave) => {
    leaveDates(leave).forEach((date) => {
      if (date < bounds.start || date > bounds.end) return;
      if (isUnpaidLeave(leave)) unpaidLeaveDates.add(date);
      else if (policy.paidLeaveEnabled !== false) paidLeaveDates.add(date);
    });
  });

  // Attendance takes precedence over leave only when a worked attendance record exists.
  const workedDates = new Set(attendanceByDate.keys());
  paidLeaveDates.forEach((date) => { if (workedDates.has(date)) paidLeaveDates.delete(date); });
  unpaidLeaveDates.forEach((date) => { if (workedDates.has(date)) unpaidLeaveDates.delete(date); });

  const presentEquivalent = Array.from(attendanceByDate.values()).reduce((sum, value) => sum + value, 0);
  const paidLeaveDays = paidLeaveDates.size;
  const unpaidLeaveDays = unpaidLeaveDates.size;
  const configuredWorkingDays = Math.max(1, Math.round(toNumber(policy.workingDaysPerMonth, 26)));
  const now = new Date();
  const isCurrentMonth = numericMonth === now.getMonth() + 1 && numericYear === now.getFullYear();
  const cutoff = isCurrentMonth ? `${numericYear}-${String(numericMonth).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}` : bounds.end;
  const elapsedWeekdays = eachDate(bounds.start, cutoff).filter(isWeekday).length;
  // Never manufacture absent days beyond the actual working dates in the
  // selected month. The policy value remains the monthly salary divisor,
  // while attendance counting is capped by real weekdays.
  const monthWorkingDays = eachDate(bounds.start, bounds.end).filter(isWeekday).length;
  const expectedWorkingDays = isCurrentMonth
    ? Math.min(configuredWorkingDays, elapsedWeekdays)
    : Math.min(configuredWorkingDays, monthWorkingDays);
  const halfDays = Array.from(attendanceByDate.values()).filter((value) => value === toNumber(policy.halfDayFactor, 0.5)).length;

  const protectedDays = presentEquivalent + paidLeaveDays;
  const absentDays = Math.max(0, round(expectedWorkingDays - protectedDays - unpaidLeaveDays));
  const unpaidDays = round(unpaidLeaveDays + absentDays);

  const overtimeMinutes = attendanceInPeriod.reduce((sum, row) => {
    if (!row.checkInTimestamp || !row.checkOutTimestamp || policy.overtimeEnabled !== true) return sum;
    const start = row.checkInTimestamp?.toDate?.();
    const end = row.checkOutTimestamp?.toDate?.();
    if (!start || !end) return sum;
    const minutes = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60000));
    return sum + Math.max(0, minutes - Math.round(toNumber(policy.standardHoursPerDay, 8) * 60));
  }, 0);

  return {
    policy,
    period: `${numericYear}-${String(numericMonth).padStart(2, "0")}`,
    workingDays: expectedWorkingDays,
    presentDays: round(presentEquivalent),
    paidLeaveDays,
    unpaidLeaveDays,
    absentDays,
    unpaidDays,
    halfDays,
    overtimeMinutes,
    attendanceRecords: attendanceInPeriod.length,
    leaveRecords: leaveInPeriod.length,
  };
};

export const applyAttendanceToSalary = ({ salary, attendance }) => {
  const basicSalary = toNumber(salary?.basicSalary);
  const allowances = toNumber(salary?.allowances);
  const fixedDeductions = toNumber(salary?.deductions);
  const grossSalary = round(basicSalary + allowances);
  // The configured monthly payroll divisor is the salary basis. For the
  // current month, attendance.workingDays intentionally represents only
  // elapsed working days; it must NOT reduce the monthly divisor.
  const policyWorkingDays = Math.max(1, Math.round(toNumber(attendance?.policy?.workingDaysPerMonth, 26)));
  const unpaidDays = Math.max(0, toNumber(attendance?.unpaidDays));
  const dailyRate = grossSalary / policyWorkingDays;
  const attendanceDeduction = round(dailyRate * unpaidDays);
  const hourlyRate = dailyRate / Math.max(1, toNumber(attendance?.policy?.standardHoursPerDay, 8));
  const overtimePay = attendance?.policy?.overtimeEnabled === true
    ? round((toNumber(attendance?.overtimeMinutes) / 60) * hourlyRate * toNumber(attendance?.policy?.overtimeMultiplier, 1.5))
    : 0;
  const deductions = round(fixedDeductions + attendanceDeduction);
  const netSalary = round(Math.max(0, grossSalary + overtimePay - deductions));
  return {
    basicSalary: round(basicSalary),
    allowances: round(allowances),
    grossSalary,
    fixedDeductions: round(fixedDeductions),
    attendanceDeduction,
    overtimePay,
    deductions,
    netSalary,
  };
};
