import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { auth, db } from "../config/firebase";
import { getEmployeeById, getEmployeeByUid } from "./employeeService";
import { createNotification, notifyManagementSafely } from "./notificationService";
import { applyAttendanceToSalary } from "./payrollAutomationService";

const PAYROLL_COLLECTION = "payrolls";
const SALARY_COLLECTION = "employeeSalaries";

const getCurrentUser = () => {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be logged in.");
  return user;
};

const normalizeText = (value) => typeof value === "string" ? value.trim() : "";
const toNumber = (value) => { const n = Number(value); return Number.isFinite(n) ? n : 0; };
const roundAmount = (value) => Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;

const notifyPayrollSafely = async ({ userId, title, message, type = "payroll", link }) => {
  if (!userId) return;
  try {
    await createNotification({ userId, title, message, type, link });
  } catch (notificationError) {
    // A notification must never make a successful payroll operation fail.
    // Notification delivery is optional and must never pollute the console or
    // make a successful payroll operation look like a failure.
  }
};

const calculateTotal = (data = {}) => Object.values(data).reduce((t, v) => t + toNumber(v), 0);

// Payroll records are historical data, so older records may contain a stale
// `deductions` total. Always derive the canonical total from its components
// before showing, updating, or exporting a salary slip.
export const normalizePayrollFinancials = (data = {}) => {
  const has = (key) => data?.[key] !== undefined && data?.[key] !== null && data?.[key] !== "";
  const persistedNetSalary = roundAmount(data.netSalary);

  // Payroll documents exist across several releases, so do not trust a stale
  // `netSalary: 0` field. Rebuild the amount from the canonical components.
  // If an old document contains only a persisted net value, preserve that value
  // rather than replacing it with zero.
  const allowances = roundAmount(data.allowances);
  const recordedGross = roundAmount(data.grossSalary);
  const basicSalary = has("basicSalary")
    ? roundAmount(data.basicSalary)
    : roundAmount(Math.max(0, recordedGross - allowances));
  const grossSalary = recordedGross > 0
    ? recordedGross
    : roundAmount(basicSalary + allowances);

  const attendanceDeduction = roundAmount(Math.max(0, data.attendanceDeduction));
  const fixedDeductions = roundAmount(
    has("fixedDeductions")
      ? Math.max(0, data.fixedDeductions)
      : Math.max(0, toNumber(data.deductions) - attendanceDeduction)
  );
  const overtimePay = roundAmount(Math.max(0, data.overtimePay));
  const deductions = roundAmount(attendanceDeduction + fixedDeductions);

  const financialKeys = [
    "basicSalary", "allowances", "grossSalary", "deductions",
    "fixedDeductions", "attendanceDeduction", "overtimePay"
  ];
  const hasMeaningfulComponents = financialKeys.some((key) => has(key) && toNumber(data[key]) !== 0);

  const calculatedNetSalary = roundAmount(
    Math.max(0, grossSalary + overtimePay - deductions)
  );
  const netSalary = hasMeaningfulComponents || persistedNetSalary === 0
    ? calculatedNetSalary
    : persistedNetSalary;

  return {
    basicSalary,
    allowances,
    grossSalary,
    attendanceDeduction,
    fixedDeductions,
    overtimePay,
    deductions,
    netSalary,
  };
};

export const calculateSalaryBreakdown = (salaryData = {}) => {
  if (!salaryData) throw new Error("Salary data is required.");
  const basicSalary = toNumber(salaryData.basicSalary);
  const allowances = salaryData.allowances !== undefined ? toNumber(salaryData.allowances) : calculateTotal(salaryData.allowanceDetails || {});
  const deductions = salaryData.deductions !== undefined ? toNumber(salaryData.deductions) : calculateTotal(salaryData.deductionDetails || {});
  const grossSalary = roundAmount(basicSalary + allowances);
  const netSalary = roundAmount(grossSalary - deductions);
  return { basicSalary: roundAmount(basicSalary), allowances: roundAmount(allowances), grossSalary, deductions: roundAmount(deductions), netSalary };
};

export const createSalary = async (salaryData) => {
  const user = getCurrentUser();
  if (!salaryData?.employeeId) throw new Error("Employee ID is required.");
  const breakdown = calculateSalaryBreakdown(salaryData);
  const record = {
    employeeId: normalizeText(salaryData.employeeId),
    userId: normalizeText(salaryData.userId || salaryData.uid),
    employeeName: normalizeText(salaryData.employeeName),
    employeeEmail: normalizeText(salaryData.employeeEmail),
    ...breakdown,
    currency: normalizeText(salaryData.currency) || "INR",
    paymentFrequency: normalizeText(salaryData.paymentFrequency) || "Monthly",
    effectiveFrom: normalizeText(salaryData.effectiveFrom),
    status: normalizeText(salaryData.status) || "Active",
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, SALARY_COLLECTION), record);
  await notifyPayrollSafely({
    userId: record.userId,
    title: "Salary details added",
    message: `Your salary details have been added. Net salary: Rs. ${record.netSalary.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
    type: "success",
    link: "/payroll/salary-slip",
  });
  await notifyManagementSafely({
    title: "Salary details added",
    message: `${record.employeeName || "Employee"}'s salary details were added successfully.`,
    type: "success",
    link: "/payroll",
  });
  return { id: ref.id, ...record, createdAt: new Date(), updatedAt: new Date() };
};

export const getEmployeeSalary = async (employeeOrId) => {
  getCurrentUser();
  const employee = employeeOrId && typeof employeeOrId === "object" ? employeeOrId : null;
  const candidates = [
    employee?.id,
    employee?.employeeCode,
    employee?.employeeId,
    typeof employeeOrId === "string" ? employeeOrId : null,
  ].map(normalizeText).filter(Boolean);
  const userId = normalizeText(employee?.uid || employee?.userId);
  const email = normalizeText(employee?.email || employee?.employeeEmail).toLowerCase();
  if (!candidates.length && !userId && !email) return null;

  const queries = [];
  candidates.forEach((id) => {
    queries.push(query(collection(db, SALARY_COLLECTION), where("employeeId", "==", id)));
    queries.push(query(collection(db, SALARY_COLLECTION), where("employeeCode", "==", id)));
    queries.push(query(collection(db, SALARY_COLLECTION), where("employeeDocId", "==", id)));
  });
  if (userId) queries.push(query(collection(db, SALARY_COLLECTION), where("userId", "==", userId)));
  if (email) queries.push(query(collection(db, SALARY_COLLECTION), where("employeeEmail", "==", email)));

  const seen = new Set();
  const records = [];
  for (const q of queries) {
    try {
      const snap = await getDocs(q);
      snap.docs.forEach((d) => {
        if (!seen.has(d.id)) {
          seen.add(d.id);
          records.push({ id: d.id, ...d.data() });
        }
      });
    } catch {
      // Try the next rule-compatible identifier.
    }
  }
  records.sort((a,b) => (b.updatedAt?.seconds || b.createdAt?.seconds || 0) - (a.updatedAt?.seconds || a.createdAt?.seconds || 0));
  return records[0] || null;
};

export const getMySalary = async () => {
  const user = getCurrentUser();

  // IMPORTANT: do not query employeeSalaries by employeeId here.
  // Firestore evaluates security rules against the whole query, and an
  // employeeId-only query cannot prove that every returned record belongs
  // to the signed-in employee. Query by the protected userId field instead.
  const queries = [
    query(collection(db, SALARY_COLLECTION), where("userId", "==", user.uid)),
  ];

  // Keep a safe email fallback for older salary records that were created
  // before userId was stored. The security rule explicitly checks the same
  // authenticated email, so this query remains rule-compatible.
  if (user.email) {
    queries.push(
      query(collection(db, SALARY_COLLECTION), where("employeeEmail", "==", user.email))
    );
  }

  const seen = new Set();
  const records = [];
  for (const q of queries) {
    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      if (!seen.has(d.id)) {
        seen.add(d.id);
        records.push({ id: d.id, ...d.data() });
      }
    });
  }

  return records.sort(
    (a, b) => (b.updatedAt?.seconds || b.createdAt?.seconds || 0) -
              (a.updatedAt?.seconds || a.createdAt?.seconds || 0)
  )[0] || null;
};

export const updateSalary = async (salaryId, salaryData) => {
  getCurrentUser();
  if (!salaryId) throw new Error("Salary ID is required.");
  const breakdown = calculateSalaryBreakdown(salaryData || {});
  const payload = { ...breakdown, updatedAt: serverTimestamp() };
  ["currency","paymentFrequency","effectiveFrom","status","employeeName","employeeEmail","userId"].forEach(k => { if (salaryData?.[k] !== undefined) payload[k] = salaryData[k]; });
  await updateDoc(doc(db, SALARY_COLLECTION, salaryId), payload);
  const updated = await getDoc(doc(db, SALARY_COLLECTION, salaryId));
  const updatedSalary = { id: updated.id, ...updated.data() };
  if (updatedSalary.userId) {
    await notifyPayrollSafely({
      userId: updatedSalary.userId,
      title: "Salary details updated",
      message: `Your salary details were updated. Current net salary: Rs. ${Number(updatedSalary.netSalary || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
      type: "info",
      link: "/payroll/salary-slip",
    });
  }
  await notifyManagementSafely({
    title: "Salary details updated",
    message: `${updatedSalary.employeeName || "Employee"}'s salary details were updated.`,
    type: "info",
    link: "/payroll",
  });
  return updatedSalary;
};

export const deleteSalary = async (salaryId) => {
  getCurrentUser();
  if (!salaryId) throw new Error("Salary ID is required.");
  const existing = await getDoc(doc(db, SALARY_COLLECTION, salaryId));
  await deleteDoc(doc(db, SALARY_COLLECTION, salaryId));
  const data = existing.exists() ? existing.data() : {};
  if (data.userId) {
    await notifyPayrollSafely({ userId: data.userId, title: "Salary details removed", message: "Your salary details were removed by management.", type: "warning", link: "/payroll/salary-slip" });
  }
  await notifyManagementSafely({ title: "Salary details removed", message: `${data.employeeName || "Employee"}'s salary details were removed.`, type: "warning", link: "/payroll" });
  return true;
};

export const createPayroll = async (payrollData) => {
  const user = getCurrentUser();
  if (!payrollData?.employeeId) throw new Error("Employee ID is required.");
  const employee = await getEmployeeById(payrollData.employeeId).catch(() => null);
  const month = toNumber(payrollData.month) || new Date().getMonth() + 1;
  const calculatedBreakdown = payrollData.attendanceSummary
    ? applyAttendanceToSalary({ salary: payrollData, attendance: payrollData.attendanceSummary })
    : calculateSalaryBreakdown(payrollData);
  const breakdown = normalizePayrollFinancials({
    ...payrollData,
    ...calculatedBreakdown,
    fixedDeductions: calculatedBreakdown.fixedDeductions ?? payrollData.fixedDeductions,
    attendanceDeduction: calculatedBreakdown.attendanceDeduction ?? payrollData.attendanceDeduction,
    overtimePay: calculatedBreakdown.overtimePay ?? payrollData.overtimePay,
  });
  const year = toNumber(payrollData.year) || new Date().getFullYear();
  const employeeCode = normalizeText(
    payrollData.employeeCode || employee?.employeeCode || payrollData.employeeId
  ).toUpperCase();
  const employeeDocId = normalizeText(
    payrollData.employeeDocId || employee?.id || payrollData.employeeId
  );
  const record = {
    // employeeId is the human-facing employee code everywhere in payroll.
    // employeeDocId keeps the Firestore document id for internal lookups.
    employeeId: employeeCode,
    employeeCode,
    employeeDocId,
    userId: normalizeText(payrollData.userId || payrollData.uid || employee?.uid),
    employeeName: normalizeText(payrollData.employeeName || employee?.name || employee?.displayName),
    employeeEmail: normalizeText(payrollData.employeeEmail || employee?.email),
    month, year,
    period: `${year}-${String(month).padStart(2,"0")}`,
    ...breakdown,
    fixedDeductions: toNumber(payrollData.fixedDeductions ?? payrollData.deductions),
    attendanceDeduction: toNumber(payrollData.attendanceDeduction ?? breakdown.attendanceDeduction),
    overtimePay: toNumber(payrollData.overtimePay ?? breakdown.overtimePay),
    attendanceSummary: payrollData.attendanceSummary || null,
    allowanceDetails: payrollData.allowanceDetails || {},
    deductionDetails: payrollData.deductionDetails || {},
    currency: normalizeText(payrollData.currency) || "INR",
    status: normalizeText(payrollData.status) || "Pending",
    paymentDate: payrollData.paymentDate || (String(payrollData.status || "").toLowerCase() === "paid" ? new Date().toISOString().slice(0, 10) : ""),
    paymentMethod: payrollData.paymentMethod || "",
    transactionId: payrollData.transactionId || "",
    notes: payrollData.notes || "",
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  // Keep exactly one payroll record for an employee in a payroll period.
  // Accidental double-clicks or repeated generation must not create duplicate slips.
  const duplicateQueries = [];
  if (employeeDocId) {
    duplicateQueries.push(query(collection(db, PAYROLL_COLLECTION), where("employeeDocId", "==", employeeDocId)));
  }
  if (record.employeeCode) {
    duplicateQueries.push(query(collection(db, PAYROLL_COLLECTION), where("employeeCode", "==", employeeCode)));
  }
  const duplicateIds = new Set();
  for (const duplicateQuery of duplicateQueries) {
    const duplicateSnapshot = await getDocs(duplicateQuery);
    duplicateSnapshot.docs.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      if (Number(data.month) === month && Number(data.year) === year) duplicateIds.add(docSnapshot.id);
    });
  }
  if (duplicateIds.size > 0) {
    throw new Error(`${getMonthLabel(month)} ${year} payroll already exists for ${record.employeeName || employeeCode}. Open Payroll History and edit the existing record instead of generating another one.`);
  }

  const ref = await addDoc(collection(db, PAYROLL_COLLECTION), record);

  await notifyPayrollSafely({
    userId: record.userId,
    title: "New payroll slip available",
    message: `Your ${getMonthLabel(month)} ${year} payroll has been generated. Net payable: Rs. ${record.netSalary.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
    type: "success",
    link: `/payroll/salary-slip?id=${ref.id}`,
  });
  await notifyManagementSafely({
    title: "Payroll generated",
    message: `${record.employeeName || "Employee"}'s ${getMonthLabel(month)} ${year} payroll was generated for Rs. ${record.netSalary.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
    type: "success",
    link: "/payroll",
  });

  return { id: ref.id, ...record, createdAt: new Date(), updatedAt: new Date() };
};

const getMonthLabel = (month) => {
  const monthNumber = Number(month);
  if (!monthNumber || monthNumber < 1 || monthNumber > 12) return "Payroll";
  return new Date(2000, monthNumber - 1, 1).toLocaleString("en-IN", { month: "long" });
};

const sortPayroll = (records) => records.sort((a,b) => {
  const ay = toNumber(a.year), by = toNumber(b.year), am = toNumber(a.month), bm = toNumber(b.month);
  if (by !== ay) return by - ay;
  if (bm !== am) return bm - am;
  return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
});

export const getMyPayroll = async () => {
  const user = getCurrentUser();

  // Query only fields that the employee is allowed to use in the Firestore
  // rule. An employeeId-only query can fail with "Missing or insufficient
  // permissions" because Firestore rules are not filters.
  const queries = [
    query(collection(db, PAYROLL_COLLECTION), where("userId", "==", user.uid)),
  ];

  // Backward-compatible fallback for payroll records created before userId
  // was stored. The Firestore rule also validates employeeEmail against the
  // authenticated user's email.
  if (user.email) {
    queries.push(
      query(collection(db, PAYROLL_COLLECTION), where("employeeEmail", "==", user.email))
    );
  }

  const seen = new Set();
  const records = [];
  for (const q of queries) {
    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      if (!seen.has(d.id)) {
        seen.add(d.id);
        records.push({ id: d.id, ...d.data() });
      }
    });
  }

  return sortPayroll(records.map((record) => ({ ...record, ...normalizePayrollFinancials(record) })));
};

export const subscribeMyPayroll = (onData, onError) => {
  const user = getCurrentUser();
  const queries = [
    query(collection(db, PAYROLL_COLLECTION), where("userId", "==", user.uid)),
  ];
  if (user.email) {
    queries.push(query(collection(db, PAYROLL_COLLECTION), where("employeeEmail", "==", user.email)));
  }

  const rowsByQuery = new Map();
  let closed = false;
  const emit = () => {
    if (closed) return;
    const merged = new Map();
    rowsByQuery.forEach((rows) => rows.forEach((row) => merged.set(row.id, row)));
    onData(sortPayroll(Array.from(merged.values()).map((record) => ({ ...record, ...normalizePayrollFinancials(record) }))));
  };

  const unsubscribers = queries.map((q, index) => onSnapshot(
    q,
    (snap) => {
      rowsByQuery.set(index, snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      emit();
    },
    (error) => {
      // The UID query is authoritative. An optional legacy email query must
      // never blank a valid payroll history if that legacy query is unavailable.
      if (index === 0) onError?.(error);
    }
  ));

  return () => {
    closed = true;
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
};

export const getAllPayroll = async () => {
  getCurrentUser();
  const snap = await getDocs(collection(db, PAYROLL_COLLECTION));
  return sortPayroll(snap.docs.map((d) => { const record = { id: d.id, ...d.data() }; return { ...record, ...normalizePayrollFinancials(record) }; }));
};

export const subscribeAllPayroll = (onData, onError) => {
  getCurrentUser();
  return onSnapshot(
    collection(db, PAYROLL_COLLECTION),
    (snap) => onData(sortPayroll(snap.docs.map((d) => { const record = { id: d.id, ...d.data() }; return { ...record, ...normalizePayrollFinancials(record) }; }))),
    onError
  );
};

export const getPayrollById = async (payrollId) => {
  getCurrentUser();
  if (!payrollId) throw new Error("Payroll ID is required.");
  const snap = await getDoc(doc(db, PAYROLL_COLLECTION, payrollId));
  if (!snap.exists()) return null;
  const record = { id: snap.id, ...snap.data() };
  return { ...record, ...normalizePayrollFinancials(record) };
};

export const getPayrollByMonth = async (month, year) => {
  getCurrentUser();
  const m = toNumber(month), y = toNumber(year);
  const snap = await getDocs(query(collection(db, PAYROLL_COLLECTION), where("month", "==", m)));
  return sortPayroll(
    snap.docs
      .map((d) => { const record = { id: d.id, ...d.data() }; return { ...record, ...normalizePayrollFinancials(record) }; })
      .filter((record) => toNumber(record.year) === y)
  );
};

export const updatePayroll = async (payrollId, payrollData) => {
  getCurrentUser();
  if (!payrollId) throw new Error("Payroll ID is required.");

  const existing = await getPayrollById(payrollId);
  if (!existing) throw new Error("Payroll record not found.");

  const calculated = payrollData?.attendanceSummary
    ? applyAttendanceToSalary({ salary: payrollData, attendance: payrollData.attendanceSummary })
    : calculateSalaryBreakdown(payrollData || {});
  const normalized = normalizePayrollFinancials({
    ...payrollData,
    ...calculated,
    fixedDeductions: calculated.fixedDeductions ?? payrollData?.fixedDeductions,
    attendanceDeduction: calculated.attendanceDeduction ?? payrollData?.attendanceDeduction,
    overtimePay: calculated.overtimePay ?? payrollData?.overtimePay,
  });
  const payload = { ...payrollData, ...normalized, updatedAt: serverTimestamp() };
  if (String(payrollData?.status || "").toLowerCase() === "paid" && !payload.paymentDate) {
    payload.paymentDate = new Date().toISOString().slice(0, 10);
  }
  delete payload.id; delete payload.createdAt;
  await updateDoc(doc(db, PAYROLL_COLLECTION, payrollId), payload);

  const updated = await getPayrollById(payrollId);
  await notifyManagementSafely({
    title: "Payroll updated",
    message: `${updated?.employeeName || "Employee"}'s payroll for ${getMonthLabel(updated?.month)} ${updated?.year || ""} was updated.`,
    type: "info",
    link: "/payroll",
  });
  const status = String(updated?.status || "Pending").toLowerCase();
  const oldStatus = String(existing?.status || "Pending").toLowerCase();
  const statusChanged = status !== oldStatus;
  const paymentChanged = Boolean(
    updated?.paymentDate && updated.paymentDate !== existing?.paymentDate
  ) || Boolean(
    updated?.transactionId && updated.transactionId !== existing?.transactionId
  );

  if (updated?.userId && (statusChanged || paymentChanged)) {
    const paid = status === "paid" || status === "completed";
    await notifyPayrollSafely({
      userId: updated.userId,
      title: paid ? "Payroll payment completed" : "Payroll updated",
      message: paid
        ? `Your ${getMonthLabel(updated.month)} ${updated.year} payroll payment is complete. Net paid: Rs. ${Number(updated.netSalary || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`
        : `Your ${getMonthLabel(updated.month)} ${updated.year} payroll record has been updated.`,
      type: paid ? "success" : "info",
      link: `/payroll/salary-slip?id=${payrollId}`,
    });
  }

  return updated;
};

export const deletePayroll = async (payrollId) => {
  getCurrentUser();
  if (!payrollId) throw new Error("Payroll ID is required.");
  const existing = await getDoc(doc(db, PAYROLL_COLLECTION, payrollId));
  await deleteDoc(doc(db, PAYROLL_COLLECTION, payrollId));
  const data = existing.exists() ? existing.data() : {};
  if (data.userId) {
    await notifyPayrollSafely({ userId: data.userId, title: "Payroll removed", message: `Your ${getMonthLabel(data.month)} ${data.year || ""} payroll record was removed by management.`, type: "warning", link: "/payroll/salary-slip" });
  }
  await notifyManagementSafely({ title: "Payroll removed", message: `${data.employeeName || "Employee"}'s payroll record was removed.`, type: "warning", link: "/payroll" });
  return true;
};

export const getPayrollStatistics = async (payrollRecords = null) => {
  const records = payrollRecords || await getMyPayroll();
  const statistics = {
    total: records.length,
    totalRecords: records.length,
    totalBasicSalary: 0,
    totalAllowances: 0,
    totalDeductions: 0,
    totalNetSalary: 0,
    paid: 0,
    pending: 0,
    processing: 0,
    cancelled: 0,
    failed: 0,
    totalAmount: 0,
    paidAmount: 0,
  };
  records.forEach((r) => {
    const financials = normalizePayrollFinancials(r);
    const status = normalizeText(r.status).toLowerCase();
    const basic = financials.basicSalary;
    const allowances = financials.allowances;
    const deductions = financials.deductions;
    const amount = financials.netSalary;
    statistics.totalBasicSalary += basic;
    statistics.totalAllowances += allowances;
    statistics.totalDeductions += deductions;
    statistics.totalNetSalary += amount;
    statistics.totalAmount += amount;
    if (status === "paid" || status === "completed") {
      statistics.paid++;
      statistics.paidAmount += amount;
    } else if (status === "processing" || status === "processed") {
      statistics.processing++;
    } else if (status === "cancelled" || status === "canceled" || status === "rejected" || status === "failed") {
      if (status === "failed") statistics.failed++;
      else statistics.cancelled++;
    } else {
      statistics.pending++;
    }
  });
  ["totalBasicSalary", "totalAllowances", "totalDeductions", "totalNetSalary", "totalAmount", "paidAmount"].forEach((key) => {
    statistics[key] = roundAmount(statistics[key]);
  });
  return statistics;
};

export default { createSalary, getEmployeeSalary, getMySalary, updateSalary, deleteSalary, createPayroll, getMyPayroll, getAllPayroll, subscribeAllPayroll, subscribeMyPayroll, getPayrollByMonth, getPayrollById, updatePayroll, deletePayroll, getPayrollStatistics, calculateSalaryBreakdown, normalizePayrollFinancials };
