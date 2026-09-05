import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  FileText,
  IndianRupee,
  Loader2,
  Printer,
  RefreshCw,
  User,
  Wallet,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  getMyPayroll,
  getPayrollById,
  calculateSalaryBreakdown,
  normalizePayrollFinancials,
} from "../../services/payrollService";
import { getEmployeeById, getEmployeeByCode } from "../../services/employeeService";
import { downloadSalarySlipPdf } from "../../utils/salarySlipPdf";
import { getCompanyBranding } from "../../services/companyBrandingService";

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const formatCurrency = (value) => {
  const amount = Number(value) || 0;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  try {
    let date;

    if (value?.seconds) {
      date = new Date(value.seconds * 1000);
    } else {
      date = new Date(value);
    }

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

const getMonthName = (month) => {
  const monthNumber = Number(month);

  if (
    !monthNumber ||
    monthNumber < 1 ||
    monthNumber > 12
  ) {
    return "—";
  }

  return new Date(
    2000,
    monthNumber - 1,
    1
  ).toLocaleString("en-IN", {
    month: "long",
  });
};

const getPayrollPeriod = (payroll) => {
  if (!payroll) {
    return "—";
  }

  if (payroll.month && payroll.year) {
    return `${getMonthName(payroll.month)} ${payroll.year}`;
  }

  return payroll.monthKey || "—";
};

/*
|--------------------------------------------------------------------------
| STATUS BADGE
|--------------------------------------------------------------------------
*/

const StatusBadge = ({ status }) => {
  const normalizedStatus = status || "Pending";

  const statusConfig = {
    Paid: {
      icon: CheckCircle2,
      className:
        "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
    },

    Processing: {
      icon: Clock3,
      className:
        "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20",
    },

    Failed: {
      icon: XCircle,
      className:
        "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20",
    },

    Pending: {
      icon: Clock3,
      className:
        "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
    },
  };

  const config =
    statusConfig[normalizedStatus] ||
    statusConfig.Pending;

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${config.className}`}
    >
      <Icon size={14} />
      {normalizedStatus}
    </span>
  );
};

/*
|--------------------------------------------------------------------------
| SALARY ROW
|--------------------------------------------------------------------------
*/

const SalaryRow = ({
  label,
  value,
  type = "normal",
}) => {
  const valueClass =
    type === "addition"
      ? "text-emerald-600 dark:text-emerald-400"
      : type === "deduction"
      ? "text-red-600 dark:text-red-400"
      : "text-slate-900 dark:text-white";

  const prefix =
    type === "addition"
      ? "+ "
      : type === "deduction"
      ? "- "
      : "";

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {label}
      </span>

      <span className={`text-sm font-semibold ${valueClass}`}>
        {prefix}
        {formatCurrency(value)}
      </span>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| PAGE
|--------------------------------------------------------------------------
*/

const SalarySlip = () => {
  const [searchParams] = useSearchParams();

  const payrollId = searchParams.get("id");

  const [payroll, setPayroll] = useState(null);
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [branding, setBranding] = useState({});

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  /*
  |--------------------------------------------------------------------------
  | LOAD SALARY SLIP
  |--------------------------------------------------------------------------
  */

  const loadSalarySlip = useCallback(
    async (showRefresh = false) => {
      try {
        setError("");

        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        let payrollData = null;

        /*
        |--------------------------------------------------------------------------
        | If ID is present, load specific payroll.
        |--------------------------------------------------------------------------
        */

        if (payrollId) {
          payrollData =
            await getPayrollById(payrollId);
        } else {
          /*
          |--------------------------------------------------------------------------
          | Otherwise load latest payroll.
          |--------------------------------------------------------------------------
          */

          const payrollRecords =
            await getMyPayroll();

          if (
            Array.isArray(payrollRecords) &&
            payrollRecords.length > 0
          ) {
            payrollData =
              [...payrollRecords].sort(
                (a, b) => {
                  const first =
                    `${b.year || 0}-${String(
                      b.month || 0
                    ).padStart(2, "0")}`;

                  const second =
                    `${a.year || 0}-${String(
                      a.month || 0
                    ).padStart(2, "0")}`;

                  return first.localeCompare(
                    second
                  );
                }
              )[0];
          }
        }

        if (payrollData) {
          let employee = null;
          if (payrollData.employeeDocId) {
            employee = await getEmployeeById(payrollData.employeeDocId).catch(() => null);
          }
          if (!employee && payrollData.employeeCode) {
            employee = await getEmployeeByCode(payrollData.employeeCode).catch(() => null);
          }
          if (!employee && payrollData.employeeId) {
            employee = await getEmployeeById(payrollData.employeeId).catch(() => null);
          }
          setEmployeeProfile(employee);
        } else {
          setEmployeeProfile(null);
        }
        setPayroll(payrollData || null);
      } catch (loadError) {
        console.error(
          "Load salary slip error:",
          loadError
        );

        const message =
          loadError?.message ||
          "Unable to load salary slip.";

        setError(message);

        if (showRefresh) {
          toast.error(message);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [payrollId]
  );

  useEffect(() => {
    loadSalarySlip();
  }, [loadSalarySlip]);

  useEffect(() => {
    let mounted = true;
    getCompanyBranding()
      .then((data) => mounted && setBranding(data || {}))
      .catch(() => {
        if (mounted) setBranding({});
      });
    return () => { mounted = false; };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | BREAKDOWN
  |--------------------------------------------------------------------------
  */

  const breakdown = useMemo(() => {
    if (!payroll) {
      return normalizePayrollFinancials({});
    }
    return normalizePayrollFinancials(payroll);
  }, [payroll]);

  /*
  |--------------------------------------------------------------------------
  | PRINT
  |--------------------------------------------------------------------------
  */

  const handlePrint = () => {
    // Print is intentionally print-only. PDF downloads are handled by
    // handleDownload and never route through the browser print dialog.
    window.print();
  };

  /*
  |--------------------------------------------------------------------------
  | DOWNLOAD / PRINT
  |--------------------------------------------------------------------------
  */

  const handleDownload = async () => {
    try {
      await downloadSalarySlipPdf({
        payroll,
        employee: employeeProfile,
        branding,
      });
      toast.success("Salary slip PDF downloaded successfully.");
    } catch (downloadError) {
      console.error("Salary slip PDF error:", downloadError);
      toast.error("Unable to generate the salary slip PDF.");
    }
  };

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 p-4 dark:bg-slate-950 sm:p-6 lg:p-8">
        <div className="mx-auto flex min-h-[60vh] max-w-5xl items-center justify-center">
          <div className="text-center">
            <Loader2
              size={34}
              className="mx-auto animate-spin text-slate-500"
            />

            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Preparing salary slip...
            </p>
          </div>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | ERROR
  |--------------------------------------------------------------------------
  */

  if (error && !payroll) {
    return (
      <div className="min-h-full bg-slate-50 p-4 dark:bg-slate-950 sm:p-6 lg:p-8">
        <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center">
          <div className="w-full rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm dark:border-red-900/50 dark:bg-slate-900">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
              <XCircle size={24} />
            </div>

            <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
              Unable to load salary slip
            </h2>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {error}
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() =>
                  loadSalarySlip()
                }
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
              >
                <RefreshCw size={16} />
                Try Again
              </button>

              <Link
                to="/payroll"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <ArrowLeft size={16} />
                Payroll
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | NO PAYROLL
  |--------------------------------------------------------------------------
  */

  if (!payroll) {
    return (
      <div className="min-h-full bg-slate-50 p-4 dark:bg-slate-950 sm:p-6 lg:p-8">
        <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center">
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <FileText size={26} />
            </div>

            <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
              No salary slip available
            </h2>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              A salary slip will appear here once a payroll record has been generated.
            </p>

            <Link
              to="/payroll"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
            >
              <ArrowLeft size={16} />
              Back to Payroll
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | MAIN UI
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-full bg-slate-50 p-4 dark:bg-slate-950 sm:p-6 lg:p-8 print:bg-white print:p-0">
      <div className="mx-auto max-w-5xl">

        {/* =========================================================
            ACTION BAR
        ========================================================= */}

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">

          <div className="flex items-center gap-2">
            <Link
              to="/payroll"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ArrowLeft size={16} />
              Back
            </Link>

            <button
              type="button"
              onClick={() =>
                loadSalarySlip(true)
              }
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw
                size={16}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Printer size={16} />
              Print
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              <Download size={16} />
              Save PDF
            </button>
          </div>
        </div>

        {/* =========================================================
            SALARY SLIP
        ========================================================= */}

        <div
          id="salary-slip"
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 print:rounded-none print:border-0 print:shadow-none"
        >

          {/* =======================================================
              HEADER
          ======================================================= */}

          <div className="border-b border-slate-200 px-6 py-6 dark:border-slate-800 sm:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                    {branding.logoUrl ? <img src={branding.logoUrl} alt="Company logo" className="h-full w-full object-contain bg-white p-1" /> : <Wallet size={24} />}
                  </div>

                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                      {branding.companyName || "WorkSphere"}
                    </h1>

                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Employee Salary Slip
                    </p>
                  </div>
                </div>
              </div>

              <div className="sm:text-right">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Salary Period
                </p>

                <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  {getPayrollPeriod(
                    payroll
                  )}
                </p>

                <div className="mt-2">
                  <StatusBadge
                    status={payroll.status}
                  />
                </div>
              </div>

            </div>
          </div>

          {/* =======================================================
              EMPLOYEE INFORMATION
          ======================================================= */}

          <div className="border-b border-slate-200 px-6 py-6 dark:border-slate-800 sm:px-8">

            <div className="mb-4 flex items-center gap-2">
              <User
                size={18}
                className="text-slate-500"
              />

              <h2 className="font-semibold text-slate-900 dark:text-white">
                Employee Information
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Employee Name
                </p>

                <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                  {employeeProfile?.fullName || employeeProfile?.name || payroll.employeeName || "—"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Employee ID
                </p>

                <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                  {employeeProfile?.employeeCode ||
                    payroll.employeeCode ||
                    payroll.employeeId ||
                    "—"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Email
                </p>

                <p className="mt-1 break-all font-semibold text-slate-900 dark:text-white">
                  {employeeProfile?.email || payroll.employeeEmail || "—"}
                </p>
              </div>

            </div>
          </div>

          {/* =======================================================
              PAYROLL DETAILS
          ======================================================= */}

          <div className="grid gap-4 border-b border-slate-200 px-6 py-6 dark:border-slate-800 sm:grid-cols-3 sm:px-8">

            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <CalendarDays size={15} />
                Payroll Period
              </div>

              <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                {getPayrollPeriod(
                  payroll
                )}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <CreditCard size={15} />
                Payment Date
              </div>

              <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                {formatDate(
                  payroll.paymentDate
                )}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Banknote size={15} />
                Payment Method
              </div>

              <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                {payroll.paymentMethod ||
                  "—"}
              </p>
            </div>

          </div>

          {/* =======================================================
              EARNINGS / DEDUCTIONS
          ======================================================= */}

          <div className="grid gap-6 px-6 py-6 sm:px-8 lg:grid-cols-2">

            {/* Earnings */}

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800">

              <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <h2 className="font-semibold text-slate-900 dark:text-white">
                  Earnings
                </h2>
              </div>

              <div className="divide-y divide-slate-100 px-5 dark:divide-slate-800">

                <SalaryRow
                  label="Basic Salary"
                  value={
                    breakdown.basicSalary
                  }
                />

                <SalaryRow
                  label="Allowances"
                  value={
                    breakdown.allowances
                  }
                  type="addition"
                />

                {Number(breakdown.overtimePay || 0) > 0 && (
                  <SalaryRow label="Overtime" value={breakdown.overtimePay} type="addition" />
                )}

                <div className="flex items-center justify-between gap-4 border-t border-slate-200 py-4 dark:border-slate-800">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Gross Salary
                  </span>

                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatCurrency(
                      breakdown.grossSalary
                    )}
                  </span>
                </div>

              </div>
            </div>

            {/* Deductions */}

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800">

              <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <h2 className="font-semibold text-slate-900 dark:text-white">
                  Deductions
                </h2>
              </div>

              <div className="px-5">

                {Number(breakdown.attendanceDeduction || 0) > 0 && (
                  <SalaryRow label="Attendance / Unpaid Absence" value={breakdown.attendanceDeduction} type="deduction" />
                )}

                <SalaryRow
                  label="Other / Fixed Deductions"
                  value={breakdown.fixedDeductions ?? breakdown.deductions}
                  type="deduction"
                />

                <SalaryRow
                  label="Total Deductions"
                  value={breakdown.deductions}
                  type="deduction"
                />

                <div className="mt-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      Net Payable
                    </span>

                    <span className="text-xl font-bold text-slate-900 dark:text-white">
                      {formatCurrency(
                        breakdown.netSalary
                      )}
                    </span>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* =======================================================
              NET SALARY
          ======================================================= */}

          <div className="mx-6 mb-6 rounded-2xl bg-slate-900 px-6 py-6 text-white dark:bg-white dark:text-slate-900 sm:mx-8">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <p className="text-sm opacity-70">
                  Net Salary
                </p>

                <p className="mt-1 text-3xl font-bold tracking-tight">
                  {formatCurrency(
                    breakdown.netSalary
                  )}
                </p>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-xs opacity-70">
                  Gross Salary
                </p>

                <p className="mt-1 font-semibold">
                  {formatCurrency(
                    breakdown.grossSalary
                  )}
                </p>

                <p className="mt-2 text-xs opacity-70">
                  Less deductions
                </p>

                <p className="mt-1 font-semibold">
                  {formatCurrency(
                    breakdown.deductions
                  )}
                </p>
              </div>

            </div>
          </div>

          {payroll.attendanceSummary && (
            <div className="border-t border-slate-200 px-6 py-5 dark:border-slate-800 sm:px-8">
              <div className="rounded-2xl bg-indigo-50 p-4 dark:bg-indigo-950/20">
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Attendance-linked payroll</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
                  <div><span className="text-slate-500">Working</span><p className="font-bold">{payroll.attendanceSummary.workingDays ?? 0}</p></div>
                  <div><span className="text-slate-500">Present</span><p className="font-bold">{payroll.attendanceSummary.presentDays ?? 0}</p></div>
                  <div><span className="text-slate-500">Paid leave</span><p className="font-bold">{payroll.attendanceSummary.paidLeaveDays ?? 0}</p></div>
                  <div><span className="text-slate-500">Unpaid / absent</span><p className="font-bold">{payroll.attendanceSummary.unpaidDays ?? 0}</p></div>
                  <div><span className="text-slate-500">OT</span><p className="font-bold">{Math.floor((payroll.attendanceSummary.overtimeMinutes || 0) / 60)}h {(payroll.attendanceSummary.overtimeMinutes || 0) % 60}m</p></div>
                </div>
              </div>
            </div>
          )}

          {/* =======================================================
              TRANSACTION DETAILS
          ======================================================= */}

          {(payroll.transactionId ||
            payroll.notes) && (
            <div className="border-t border-slate-200 px-6 py-6 dark:border-slate-800 sm:px-8">

              <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">
                Payment Details
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">

                {payroll.transactionId && (
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Transaction ID
                    </p>

                    <p className="mt-1 break-all text-sm font-medium text-slate-900 dark:text-white">
                      {payroll.transactionId}
                    </p>
                  </div>
                )}

                {payroll.notes && (
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Notes
                    </p>

                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                      {payroll.notes}
                    </p>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* =======================================================
              FOOTER
          ======================================================= */}

          <div className="border-t border-slate-200 px-6 py-5 dark:border-slate-800 sm:px-8">

            <div className="flex flex-col gap-5 text-xs text-slate-500 dark:text-slate-400 sm:flex-row sm:items-end sm:justify-between">
              <p>
                This is a computer-generated salary slip.
              </p>
              <div className="text-right">
                {branding.signatureUrl && <img src={branding.signatureUrl} alt="Authorized signature" className="ml-auto h-12 max-w-[160px] object-contain" />}
                <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{branding.signerName || "Authorized Signatory"}</p>
                <p>{branding.signerTitle || "Authorized Signatory"}</p>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* =========================================================
          PRINT STYLES
      ========================================================= */}

      <style>
        {`
          @media print {
            @page { size: A4 portrait; margin: 7mm; }
            html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
            body { font-size: 10px !important; }
            body * { visibility: hidden !important; }
            #salary-slip, #salary-slip * { visibility: visible !important; }
            #salary-slip { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; max-width: none !important; margin: 0 !important; border: 0 !important; box-shadow: none !important; overflow: visible !important; zoom: 0.78; }
            #salary-slip > div { break-inside: avoid; }
            #salary-slip .p-6, #salary-slip .sm\:p-8, #salary-slip .sm\:px-8 { padding: 8px !important; }
            #salary-slip .px-6 { padding-left: 8px !important; padding-right: 8px !important; }
            #salary-slip .py-6 { padding-top: 8px !important; padding-bottom: 8px !important; }
            #salary-slip .py-5 { padding-top: 6px !important; padding-bottom: 6px !important; }
            #salary-slip .py-4 { padding-top: 5px !important; padding-bottom: 5px !important; }
            #salary-slip .p-5 { padding: 7px !important; }
            #salary-slip .mb-6 { margin-bottom: 7px !important; }
            #salary-slip .mb-4 { margin-bottom: 5px !important; }
            #salary-slip .mt-3 { margin-top: 4px !important; }
            #salary-slip .mt-2 { margin-top: 3px !important; }
            #salary-slip .gap-6 { gap: 8px !important; }
            #salary-slip .gap-5 { gap: 7px !important; }
            #salary-slip .gap-4 { gap: 6px !important; }
            #salary-slip .text-3xl { font-size: 20px !important; line-height: 1.1 !important; }
            #salary-slip .text-2xl { font-size: 17px !important; }
            #salary-slip .text-xl { font-size: 15px !important; }
            #salary-slip .text-lg { font-size: 13px !important; }
            #salary-slip .text-sm { font-size: 9px !important; }
            #salary-slip .text-xs { font-size: 8px !important; }
            #salary-slip .h-12 { height: 32px !important; }
            #salary-slip .w-12 { width: 32px !important; }
            #salary-slip .h-10 { height: 28px !important; }
            #salary-slip .w-10 { width: 28px !important; }
            #salary-slip .rounded-2xl { border-radius: 8px !important; }
            #salary-slip .rounded-xl { border-radius: 6px !important; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
        `}
      </style>
    </div>
  );
};

export default SalarySlip;