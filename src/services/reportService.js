import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";

import { auth, db } from "../config/firebase";
import { ADMIN_EMAIL } from "../context/AuthContext";
import { normalizePayrollFinancials } from "./payrollService";

/*
|--------------------------------------------------------------------------
| COLLECTIONS
|--------------------------------------------------------------------------
*/

const EMPLOYEES_COLLECTION = "employees";
const ATTENDANCE_COLLECTION = "attendance";
const LEAVES_COLLECTION = "leaves";
const PAYROLL_COLLECTION = "payrolls";
const DOCUMENTS_COLLECTION = "documents";

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const toNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

const normalizeStatus = (value) => {
  if (!value) {
    return "";
  }

  return String(value).trim().toLowerCase();
};

const getMonthKey = (month, year) => {
  if (!month || !year) {
    return "";
  }

  return `${year}-${String(month).padStart(2, "0")}`;
};

/*
|--------------------------------------------------------------------------
| GET COLLECTION DATA
|--------------------------------------------------------------------------
*/

const getCollectionData = async (
  collectionName,
  sortField = null
) => {
  try {
    const collectionReference = collection(
      db,
      collectionName
    );

    let dataQuery = collectionReference;

    if (sortField) {
      dataQuery = query(
        collectionReference,
        orderBy(sortField, "desc")
      );
    }

    const snapshot = await getDocs(
      dataQuery
    );

    return snapshot.docs.map(
      (documentSnapshot) => ({
        id: documentSnapshot.id,
        ...documentSnapshot.data(),
      })
    );
  } catch (error) {
    /*
    |--------------------------------------------------------------------------
    | FALLBACK
    |--------------------------------------------------------------------------
    |
    | If orderBy requires an index or some records do not contain
    | the sorting field, fetch the collection without ordering.
    |
    */

    try {
      const snapshot = await getDocs(
        collection(db, collectionName)
      );

      return snapshot.docs.map(
        (documentSnapshot) => ({
          id: documentSnapshot.id,
          ...documentSnapshot.data(),
        })
      );
    } catch (fallbackError) {
      console.error(
        `Error fetching ${collectionName}:`,
        fallbackError
      );

      throw fallbackError;
    }
  }
};

/*
|--------------------------------------------------------------------------
| EMPLOYEE REPORT
|--------------------------------------------------------------------------
*/

export const getEmployeeReport = async () => {
  try {
    const employees = (await getCollectionData(
      EMPLOYEES_COLLECTION,
      "createdAt"
    )).filter((employee) => employee.role === "employee" || employee.isEmployee === true);

    const totalEmployees =
      employees.length;

    const activeEmployees =
      employees.filter((employee) => {
        const status =
          normalizeStatus(
            employee.status
          );

        return (
          !status ||
          status === "active"
        );
      }).length;

    const inactiveEmployees =
      employees.filter((employee) => {
        const status =
          normalizeStatus(
            employee.status
          );

        return (
          status === "inactive" ||
          status === "terminated" ||
          status === "resigned"
        );
      }).length;

    const departments = {};

    employees.forEach((employee) => {
      const department =
        employee.department?.trim() ||
        "Unassigned";

      departments[department] =
        (departments[department] || 0) + 1;
    });

    return {
      employees,
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      departments,
    };
  } catch (error) {
    console.error(
      "Employee report error:",
      error
    );

    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| ATTENDANCE REPORT
|--------------------------------------------------------------------------
*/

export const getAttendanceReport = async () => {
  try {
    const attendance =
      await getCollectionData(
        ATTENDANCE_COLLECTION,
        "date"
      );

    const statistics = {
      totalRecords: attendance.length,
      present: 0,
      absent: 0,
      late: 0,
      halfDay: 0,
      leave: 0,
    };

    attendance.forEach((record) => {
      const status =
        normalizeStatus(
          record.status
        );

      switch (status) {
        case "present":
          statistics.present += 1;
          break;

        case "absent":
          statistics.absent += 1;
          break;

        case "late":
          statistics.late += 1;
          break;

        case "half day":
        case "half-day":
        case "halfday":
          statistics.halfDay += 1;
          break;

        case "leave":
          statistics.leave += 1;
          break;

        default:
          break;
      }
    });

    const attendanceRate =
      statistics.totalRecords > 0
        ? Number(
            (
              (statistics.present /
                statistics.totalRecords) *
              100
            ).toFixed(2)
          )
        : 0;

    return {
      attendance,
      ...statistics,
      attendanceRate,
    };
  } catch (error) {
    console.error(
      "Attendance report error:",
      error
    );

    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| LEAVE REPORT
|--------------------------------------------------------------------------
*/

export const getLeaveReport = async () => {
  try {
    const leaves =
      await getCollectionData(
        LEAVES_COLLECTION,
        "createdAt"
      );

    const statistics = {
      totalLeaves: leaves.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
      totalDays: 0,
    };

    leaves.forEach((leave) => {
      const status =
        normalizeStatus(
          leave.status
        );

      const days =
        toNumber(
          leave.totalDays ??
            leave.days ??
            leave.numberOfDays
        );

      statistics.totalDays += days;

      switch (status) {
        case "approved":
          statistics.approved += 1;
          break;

        case "rejected":
          statistics.rejected += 1;
          break;

        case "cancelled":
        case "canceled":
          statistics.cancelled += 1;
          break;

        case "pending":
        default:
          statistics.pending += 1;
          break;
      }
    });

    return {
      leaves,
      ...statistics,
    };
  } catch (error) {
    console.error(
      "Leave report error:",
      error
    );

    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| PAYROLL REPORT
|--------------------------------------------------------------------------
*/

export const getPayrollReport = async () => {
  try {
    const payroll =
      await getCollectionData(
        PAYROLL_COLLECTION,
        "createdAt"
      );

    const statistics = {
      totalRecords: payroll.length,

      totalBasicSalary: 0,

      totalAllowances: 0,

      totalDeductions: 0,

      totalNetSalary: 0,

      pending: 0,

      paid: 0,

      processing: 0,

      failed: 0,
    };

    payroll.forEach((record) => {
      // Older payroll documents may not contain a persisted netSalary field.
      // Reports must use the same canonical financial calculation as the
      // salary-slip screen/PDF instead of displaying a misleading zero.
      const financials = normalizePayrollFinancials(record);
      record.reportFinancials = financials;

      statistics.totalBasicSalary += financials.basicSalary;
      statistics.totalAllowances += financials.allowances;
      statistics.totalDeductions += financials.deductions;
      statistics.totalNetSalary += financials.netSalary;

      const status =
        normalizeStatus(
          record.status
        );

      switch (status) {
        case "paid":
          statistics.paid += 1;
          break;

        case "processing":
          statistics.processing += 1;
          break;

        case "failed":
          statistics.failed += 1;
          break;

        case "pending":
        default:
          statistics.pending += 1;
          break;
      }
    });

    return {
      payroll,

      ...statistics,

      totalBasicSalary:
        Number(
          statistics.totalBasicSalary.toFixed(
            2
          )
        ),

      totalAllowances:
        Number(
          statistics.totalAllowances.toFixed(
            2
          )
        ),

      totalDeductions:
        Number(
          statistics.totalDeductions.toFixed(
            2
          )
        ),

      totalNetSalary:
        Number(
          statistics.totalNetSalary.toFixed(
            2
          )
        ),
    };
  } catch (error) {
    console.error(
      "Payroll report error:",
      error
    );

    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| DOCUMENT REPORT
|--------------------------------------------------------------------------
*/

export const getDocumentReport = async () => {
  try {
    const documents =
      await getCollectionData(
        DOCUMENTS_COLLECTION,
        "createdAt"
      );

    const totalDocuments =
      documents.length;

    const categories = {};

    documents.forEach((document) => {
      const category =
        document.category?.trim() ||
        document.type?.trim() ||
        "Other";

      categories[category] =
        (categories[category] || 0) + 1;
    });

    return {
      documents,
      totalDocuments,
      categories,
    };
  } catch (error) {
    console.error(
      "Document report error:",
      error
    );

    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| DEPARTMENT REPORT
|--------------------------------------------------------------------------
*/

export const getDepartmentReport = async () => {
  try {
    const employees = (await getCollectionData(
      EMPLOYEES_COLLECTION,
      "createdAt"
    )).filter((employee) => employee.role === "employee" || employee.isEmployee === true);

    const departments = {};

    employees.forEach((employee) => {
      const department =
        employee.department?.trim() ||
        "Unassigned";

      if (!departments[department]) {
        departments[department] = {
          name: department,
          employeeCount: 0,
          activeEmployees: 0,
          inactiveEmployees: 0,
        };
      }

      departments[department]
        .employeeCount += 1;

      const status =
        normalizeStatus(
          employee.status
        );

      if (
        !status ||
        status === "active"
      ) {
        departments[department]
          .activeEmployees += 1;
      } else {
        departments[department]
          .inactiveEmployees += 1;
      }
    });

    return Object.values(
      departments
    ).sort(
      (a, b) =>
        b.employeeCount -
        a.employeeCount
    );
  } catch (error) {
    console.error(
      "Department report error:",
      error
    );

    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| MONTHLY PAYROLL REPORT
|--------------------------------------------------------------------------
*/

export const getMonthlyPayrollReport =
  async () => {
    try {
      const payroll =
        await getCollectionData(
          PAYROLL_COLLECTION
        );

      const monthlyData = {};

      payroll.forEach((record) => {
        const financials = normalizePayrollFinancials(record);
        let monthKey =
          record.monthKey;

        if (
          !monthKey &&
          record.month &&
          record.year
        ) {
          monthKey = getMonthKey(
            record.month,
            record.year
          );
        }

        if (!monthKey) {
          return;
        }

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            monthKey,
            basicSalary: 0,
            allowances: 0,
            deductions: 0,
            netSalary: 0,
            records: 0,
          };
        }

        monthlyData[monthKey]
          .basicSalary += financials.basicSalary;

        monthlyData[monthKey]
          .allowances += financials.allowances;

        monthlyData[monthKey]
          .deductions += financials.deductions;

        monthlyData[monthKey]
          .netSalary += financials.netSalary;

        monthlyData[monthKey]
          .records += 1;
      });

      return Object.values(
        monthlyData
      )
        .map((item) => ({
          ...item,

          basicSalary:
            Number(
              item.basicSalary.toFixed(
                2
              )
            ),

          allowances:
            Number(
              item.allowances.toFixed(
                2
              )
            ),

          deductions:
            Number(
              item.deductions.toFixed(
                2
              )
            ),

          netSalary:
            Number(
              item.netSalary.toFixed(
                2
              )
            ),
        }))
        .sort((a, b) =>
          b.monthKey.localeCompare(
            a.monthKey
          )
        );
    } catch (error) {
      console.error(
        "Monthly payroll report error:",
        error
      );

      throw error;
    }
  };

/*
|--------------------------------------------------------------------------
| COMPLETE REPORT
|--------------------------------------------------------------------------
*/

export const getCompleteReport = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("User is not authenticated.");

    let role = "employee";
    if (String(currentUser.email || "").trim().toLowerCase() === String(ADMIN_EMAIL).trim().toLowerCase()) {
      role = "admin";
    } else {
      try {
        const userSnapshot = await getDoc(doc(db, "users", currentUser.uid));
        role = userSnapshot.exists() ? String(userSnapshot.data()?.role || "employee").toLowerCase() : "employee";
      } catch {
        role = "employee";
      }
    }

    const canViewPayroll = role === "admin" || role === "hr";

    const [
      employeeReport,
      attendanceReport,
      leaveReport,
      payrollReport,
      documentReport,
      departmentReport,
      monthlyPayrollReport,
    ] = await Promise.all([
      getEmployeeReport(),
      getAttendanceReport(),
      getLeaveReport(),
      canViewPayroll ? getPayrollReport() : Promise.resolve({
        totalRecords: 0,
        totalBasicSalary: 0,
        totalAllowances: 0,
        totalDeductions: 0,
        totalGrossSalary: 0,
        totalNetSalary: 0,
        paid: 0,
        processing: 0,
        pending: 0,
        failed: 0,
        payroll: [],
      }),
      getDocumentReport(),
      getDepartmentReport(),
      canViewPayroll ? getMonthlyPayrollReport() : Promise.resolve([]),
    ]);

    return {
      employees:
        employeeReport,

      attendance:
        attendanceReport,

      leaves:
        leaveReport,

      payroll:
        payrollReport,

      documents:
        documentReport,

      departments:
        departmentReport,

      monthlyPayroll:
        monthlyPayrollReport,

      generatedAt:
        new Date(),
    };
  } catch (error) {
    console.error(
      "Complete report error:",
      error
    );

    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| DEFAULT EXPORT
|--------------------------------------------------------------------------
*/

export default {
  getEmployeeReport,
  getAttendanceReport,
  getLeaveReport,
  getPayrollReport,
  getDocumentReport,
  getDepartmentReport,
  getMonthlyPayrollReport,
  getCompleteReport,
};
