import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  IndianRupee,
  Loader2,
  RefreshCw,
  Wallet,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  getMyPayroll,
  getMySalary,
  getPayrollStatistics,
  normalizePayrollFinancials,
  calculateSalaryBreakdown,
} from "../../services/payrollService";

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
    return `${getMonthName(
      payroll.month
    )} ${payroll.year}`;
  }

  return payroll.monthKey || "—";
};

/*
|--------------------------------------------------------------------------
| STATUS BADGE
|--------------------------------------------------------------------------
*/

const StatusBadge = ({ status }) => {
  const normalizedStatus =
    status || "Pending";

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
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${config.className}`}
    >
      <Icon size={13} />
      {normalizedStatus}
    </span>
  );
};

/*
|--------------------------------------------------------------------------
| STAT CARD
|--------------------------------------------------------------------------
*/

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {value}
          </p>

          {subtitle && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <Icon size={21} />
        </div>
      </div>

      {trend && (
        <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          {trend === "up" ? (
            <ArrowUpRight size={14} />
          ) : (
            <ArrowDownRight size={14} />
          )}

          Updated from payroll records
        </div>
      )}
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| PAGE
|--------------------------------------------------------------------------
*/

const Payroll = () => {
  const [payroll, setPayroll] = useState([]);
  const [salary, setSalary] = useState(null);
  const [statistics, setStatistics] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  /*
  |--------------------------------------------------------------------------
  | LOAD DATA
  |--------------------------------------------------------------------------
  */

  const loadPayrollData = useCallback(
    async (showRefresh = false) => {
      try {
        setError("");

        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const [
          payrollData,
          salaryData,
          statisticsData,
        ] = await Promise.all([
          getMyPayroll(),
          getMySalary(),
          getPayrollStatistics(),
        ]);

        setPayroll(
          Array.isArray(payrollData)
            ? payrollData
            : []
        );

        setSalary(salaryData || null);

        setStatistics(
          statisticsData || null
        );
      } catch (loadError) {
        console.error(
          "Load payroll data error:",
          loadError
        );

        const message =
          loadError?.message ||
          "Unable to load payroll data.";

        setError(message);

        if (showRefresh) {
          toast.error(message);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadPayrollData();
  }, [loadPayrollData]);

  /*
  |--------------------------------------------------------------------------
  | CURRENT / LATEST PAYROLL
  |--------------------------------------------------------------------------
  */

  const latestPayroll = useMemo(() => {
    if (!payroll.length) {
      return null;
    }

    return [...payroll].sort((a, b) => {
      const first =
        `${b.year || 0}-${String(
          b.month || 0
        ).padStart(2, "0")}`;

      const second =
        `${a.year || 0}-${String(
          a.month || 0
        ).padStart(2, "0")}`;

      return first.localeCompare(second);
    })[0];
  }, [payroll]);

  /*
  |--------------------------------------------------------------------------
  | LATEST BREAKDOWN
  |--------------------------------------------------------------------------
  */

  const latestBreakdown = useMemo(() => {
    if (!latestPayroll) {
      return {
        basicSalary: 0,
        allowances: 0,
        grossSalary: 0,
        deductions: 0,
        netSalary: 0,
      };
    }

    try {
      return calculateSalaryBreakdown(
        latestPayroll
      );
    } catch {
      return {
        basicSalary:
          Number(
            latestPayroll.basicSalary
          ) || 0,

        allowances:
          Number(
            latestPayroll.allowances
          ) || 0,

        grossSalary:
          (Number(
            latestPayroll.basicSalary
          ) || 0) +
          (Number(
            latestPayroll.allowances
          ) || 0),

        deductions:
          Number(
            latestPayroll.deductions
          ) || 0,

        netSalary:
          Number(
            latestPayroll.netSalary
          ) || 0,
      };
    }
  }, [latestPayroll]);

  /*
  |--------------------------------------------------------------------------
  | RENDER LOADING
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 p-4 dark:bg-slate-950 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center">
              <Loader2
                size={32}
                className="mx-auto animate-spin text-slate-500"
              />

              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                Loading payroll...
              </p>
            </div>
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

  if (error && !payroll.length && !salary) {
    return (
      <div className="min-h-full bg-slate-50 p-4 dark:bg-slate-950 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm dark:border-red-900/50 dark:bg-slate-900">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                <XCircle size={24} />
              </div>

              <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
                Unable to load payroll
              </h2>

              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {error}
              </p>

              <button
                type="button"
                onClick={() =>
                  loadPayrollData()
                }
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                <RefreshCw size={16} />
                Try Again
              </button>
            </div>
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
    <div className="min-h-full bg-slate-50 p-4 dark:bg-slate-950 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Wallet size={16} />

              <span>Payroll</span>
            </div>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Salary & Payroll
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              View your salary details, payroll records and payment history.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                loadPayrollData(true)
              }
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
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

            <Link
              to="/payroll/history"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              <FileText size={16} />
              History
            </Link>
          </div>
        </div>

        {/* Refresh Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-500/10 dark:text-amber-300">
            {error}
          </div>
        )}

        {/* Statistics */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <StatCard
            title="Total Net Salary"
            value={formatCurrency(
              statistics?.totalNetSalary
            )}
            subtitle={`${statistics?.totalRecords || 0} payroll records`}
            icon={IndianRupee}
            trend="up"
          />

          <StatCard
            title="Basic Salary"
            value={formatCurrency(
              latestBreakdown.basicSalary
            )}
            subtitle="Latest payroll"
            icon={Banknote}
          />

          <StatCard
            title="Allowances"
            value={formatCurrency(
              latestBreakdown.allowances
            )}
            subtitle="Latest payroll"
            icon={ArrowUpRight}
          />

          <StatCard
            title="Deductions"
            value={formatCurrency(
              latestBreakdown.deductions
            )}
            subtitle="Latest payroll"
            icon={ArrowDownRight}
          />
        </div>

        {/* Salary Overview */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">

          {/* Latest Payroll */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">
                  Latest Payroll
                </h2>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Your most recent salary record
                </p>
              </div>

              {latestPayroll && (
                <StatusBadge
                  status={
                    latestPayroll.status
                  }
                />
              )}
            </div>

            {latestPayroll ? (
              <div className="p-5">

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <CalendarDays size={16} />

                      Payroll Period
                    </div>

                    <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                      {getPayrollPeriod(
                        latestPayroll
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <CreditCard size={16} />

                      Payment Date
                    </div>

                    <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                      {formatDate(
                        latestPayroll.paymentDate
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Net Salary
                      </p>

                      <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
                        {formatCurrency(
                          latestBreakdown.netSalary
                        )}
                      </p>
                    </div>

                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      After deductions
                    </span>
                  </div>

                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-slate-900 dark:bg-white"
                      style={{
                        width: `${
                          latestBreakdown.grossSalary > 0
                            ? Math.min(
                                100,
                                Math.max(
                                  0,
                                  (latestBreakdown.netSalary /
                                    latestBreakdown.grossSalary) *
                                    100
                                )
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Basic
                      </p>

                      <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(
                          latestBreakdown.basicSalary
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Allowances
                      </p>

                      <p className="mt-1 font-semibold text-emerald-600 dark:text-emerald-400">
                        +{" "}
                        {formatCurrency(
                          latestBreakdown.allowances
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Deductions
                      </p>

                      <p className="mt-1 font-semibold text-red-600 dark:text-red-400">
                        -{" "}
                        {formatCurrency(
                          latestBreakdown.deductions
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <Wallet size={22} />
                </div>

                <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
                  No payroll records
                </h3>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Your salary information will appear here once payroll is created.
                </p>
              </div>
            )}
          </div>

          {/* Salary Structure */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Salary Structure
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Current salary configuration
              </p>
            </div>

            {salary ? (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">

                <div className="flex items-center justify-between px-5 py-4">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Basic Salary
                  </span>

                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(
                      salary.basicSalary
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between px-5 py-4">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Allowances
                  </span>

                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    +{" "}
                    {formatCurrency(
                      salary.allowances
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between px-5 py-4">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Deductions
                  </span>

                  <span className="font-semibold text-red-600 dark:text-red-400">
                    -{" "}
                    {formatCurrency(
                      salary.deductions
                    )}
                  </span>
                </div>

                <div className="bg-slate-50 px-5 py-5 dark:bg-slate-800/50">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      Net Salary
                    </span>

                    <span className="text-xl font-bold text-slate-900 dark:text-white">
                      {formatCurrency(
                        salary.netSalary
                      )}
                    </span>
                  </div>
                </div>

                <div className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Payment Frequency
                    </span>

                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {salary.paymentFrequency ||
                        "Monthly"}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Status
                    </span>

                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      {salary.status ||
                        "Active"}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Effective From
                    </span>

                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {formatDate(
                        salary.effectiveFrom
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-10 text-center">
                <Banknote
                  size={28}
                  className="mx-auto text-slate-400"
                />

                <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">
                  Salary structure unavailable
                </h3>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Your salary structure has not been configured yet.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Payroll History */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Recent Payroll
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Your latest salary payment records
              </p>
            </div>

            <Link
              to="/payroll/history"
              className="text-sm font-semibold text-slate-700 hover:underline dark:text-slate-200"
            >
              View all
            </Link>
          </div>

          {payroll.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="px-5 py-3 font-semibold">
                      Period
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Basic
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Allowances
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Deductions
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Net Salary
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {payroll
                    .slice(0, 5)
                    .map((record) => (
                      <tr
                        key={record.id}
                        className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {getPayrollPeriod(
                              record
                            )}
                          </div>

                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {formatDate(
                              record.paymentDate
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-700 dark:text-slate-300">
                          {formatCurrency(
                            record.basicSalary
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                          +{" "}
                          {formatCurrency(
                            record.allowances
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm font-medium text-red-600 dark:text-red-400">
                          -{" "}
                          {formatCurrency(
                            record.deductions
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm font-bold text-slate-900 dark:text-white">
                          {formatCurrency(
                            normalizePayrollFinancials(record).netSalary
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            status={
                              record.status
                            }
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-10 text-center">
              <FileText
                size={28}
                className="mx-auto text-slate-400"
              />

              <h3 className="mt-3 font-semibold text-slate-900 dark:text-white">
                No payroll history
              </h3>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Payroll records will appear here after they are generated.
              </p>
            </div>
          )}
        </div>

        {/* Footer Summary */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Paid
            </p>

            <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {statistics?.paid || 0}
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Completed payroll payments
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pending
            </p>

            <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
              {statistics?.pending || 0}
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Awaiting payment
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Processing
            </p>

            <p className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
              {statistics?.processing || 0}
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Currently being processed
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payroll;