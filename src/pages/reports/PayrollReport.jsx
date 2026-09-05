import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

import {
  getMyPayroll,
  getAllPayroll,
  getPayrollStatistics,
  subscribeAllPayroll,
  normalizePayrollFinancials,
} from "../../services/payrollService";

const normalizeReportRows = (rows) =>
  (Array.isArray(rows) ? rows : []).map((record) => ({
    ...record,
    ...normalizePayrollFinancials(record),
  }));

const getStatusClasses = (status) => {
  switch (status) {
    case "Paid":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";

    case "Processing":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400";

    case "Failed":
      return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400";

    case "Pending":
    default:
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
  }
};

function PayrollReport() {
  const [payroll, setPayroll] = useState([]);

  const [statistics, setStatistics] = useState({
    totalRecords: 0,
    totalBasicSalary: 0,
    totalAllowances: 0,
    totalDeductions: 0,
    totalNetSalary: 0,
    pending: 0,
    paid: 0,
    processing: 0,
    failed: 0,
  });

  const { isAdmin, isHR } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Manual refresh for the report page. The admin/HR view uses the full
  // payroll collection; employees only load their own payroll records.
  const loadReport = async () => {
    try {
      setLoading(true);
      setError("");
      const data = (isAdmin || isHR)
        ? await getAllPayroll()
        : await getMyPayroll();
      const safe = normalizeReportRows(data);
      setPayroll(safe);
      setStatistics(await getPayrollStatistics(safe));
    } catch (err) {
      setError(err?.message || "Unable to load payroll report.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let unsubscribe;
    let cancelled = false;

    const start = async () => {
      try {
        setLoading(true);
        setError("");
        if (isAdmin || isHR) {
          unsubscribe = subscribeAllPayroll((data) => {
            if (cancelled) return;
            const safe = Array.isArray(data) ? data : [];
            setPayroll(safe);
            getPayrollStatistics(safe).then((stats) => !cancelled && setStatistics(stats)).catch((err) => !cancelled && setError(err?.message || "Unable to calculate payroll report."));
            setLoading(false);
          }, (err) => {
            if (!cancelled) {
              setError(err?.message || "Unable to load payroll report.");
              setLoading(false);
            }
          });
        } else {
          const data = await getMyPayroll();
          if (cancelled) return;
          setPayroll(Array.isArray(data) ? data : []);
          setStatistics(await getPayrollStatistics(data));
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Unable to load payroll report.");
          setLoading(false);
        }
      }
    };
    start();
    return () => { cancelled = true; if (unsubscribe) unsubscribe(); };
  }, [isAdmin, isHR]);

  const currency = useMemo(() => {
    const record = payroll[0];

    return record?.currency || "INR";
  }, [payroll]);

  const formatMoney = (value) => {
    const number = Number(value) || 0;

    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(number);
    } catch {
      return `₹${number.toLocaleString("en-IN")}`;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 dark:bg-slate-950 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm">
            <Link
              to="/reports"
              className="text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Reports
            </Link>

            <span className="text-slate-400">/</span>

            <span className="text-slate-500 dark:text-slate-400">
              Payroll
            </span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            Payroll Report
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Your payroll history, salary breakdown and payment status.
          </p>
        </div>

        <button
          type="button"
          onClick={loadReport}
          disabled={loading}
          className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          <p className="font-semibold">Unable to load payroll report</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {/* Statistics */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <MoneyCard
          title="Total Net Salary"
          value={formatMoney(
            statistics.totalNetSalary
          )}
        />

        <MoneyCard
          title="Basic Salary"
          value={formatMoney(
            statistics.totalBasicSalary
          )}
        />

        <MoneyCard
          title="Allowances"
          value={formatMoney(
            statistics.totalAllowances
          )}
        />

        <MoneyCard
          title="Deductions"
          value={formatMoney(
            statistics.totalDeductions
          )}
        />

        <MoneyCard
          title="Payroll Records"
          value={statistics.totalRecords}
        />
      </div>

      {/* Status */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatusCard
          title="Paid"
          value={statistics.paid}
        />

        <StatusCard
          title="Processing"
          value={statistics.processing}
        />

        <StatusCard
          title="Pending"
          value={statistics.pending}
        />

        <StatusCard
          title="Failed"
          value={statistics.failed}
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-white">
            Payroll History
          </h2>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Your latest payroll records.
          </p>
        </div>

        {loading ? (
          <LoadingTable />
        ) : payroll.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <TableHead>Period</TableHead>
                  <TableHead>Basic Salary</TableHead>
                  <TableHead>Allowances</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Salary</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Status</TableHead>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {payroll.map((record) => (
                  <tr
                    key={record.id}
                    className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <TableCell>
                      {getMonthName(
                        record.month,
                        record.year
                      )}
                    </TableCell>

                    <TableCell>
                      {formatMoney(
                        record.basicSalary
                      )}
                    </TableCell>

                    <TableCell>
                      {formatMoney(
                        record.allowances
                      )}
                    </TableCell>

                    <TableCell>
                      {formatMoney(
                        record.deductions
                      )}
                    </TableCell>

                    <TableCell>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatMoney(
                          normalizePayrollFinancials(record).netSalary
                        )}
                      </span>
                    </TableCell>

                    <TableCell>
                      {formatDate(
                        record.paymentDate
                      )}
                    </TableCell>

                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                          record.status
                        )}`}
                      >
                        {record.status || "Pending"}
                      </span>
                    </TableCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function MoneyCard({ title, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {title}
      </p>

      <p className="mt-2 break-words text-xl font-bold text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function StatusCard({ title, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function TableHead({ children }) {
  return (
    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {children}
    </th>
  );
}

function TableCell({ children }) {
  return (
    <td className="px-5 py-4 text-sm text-slate-700 dark:text-slate-300">
      {children}
    </td>
  );
}

function getMonthName(month, year) {
  const safeMonth = Number(month);
  const safeYear = Number(year);

  if (
    !safeMonth ||
    !safeYear ||
    safeMonth < 1 ||
    safeMonth > 12
  ) {
    return "—";
  }

  const date = new Date(
    safeYear,
    safeMonth - 1,
    1
  );

  return date.toLocaleDateString([], {
    month: "long",
    year: "numeric",
  });
}

function formatDate(date) {
  if (!date) {
    return "—";
  }

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function LoadingTable() {
  return (
    <div className="space-y-4 p-6">
      {[1, 2, 3, 4, 5].map((item) => (
        <div
          key={item}
          className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="px-6 py-16 text-center">
      <div className="text-4xl">💰</div>

      <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
        No payroll records
      </h3>

      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Your payroll records will appear here when available.
      </p>
    </div>
  );
}

export default PayrollReport;