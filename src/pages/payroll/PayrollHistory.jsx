import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "react-router-dom";

import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  CreditCard,
  FileText,
  IndianRupee,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  Wallet,
  X,
  XCircle,
} from "lucide-react";

import toast from "react-hot-toast";

import { normalizePayrollFinancials, subscribeAllPayroll, subscribeMyPayroll } from "../../services/payrollService";
import { useAuth } from "../../hooks/useAuth";
import { ROLES } from "../../constants/roleConstants";

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
    } else if (value?.toDate) {
      date = value.toDate();
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

const getPayrollSortValue = (record) => {
  const year = Number(record?.year) || 0;
  const month = Number(record?.month) || 0;

  return year * 100 + month;
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
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${config.className}`}
    >
      <Icon size={13} />
      {normalizedStatus}
    </span>
  );
};

/*
|--------------------------------------------------------------------------
| SUMMARY CARD
|--------------------------------------------------------------------------
*/

const SummaryCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| PAGE
|--------------------------------------------------------------------------
*/

const PayrollHistory = () => {
  const { role } = useAuth();
  const isEmployeeView = role === ROLES.EMPLOYEE;
  const [payroll, setPayroll] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [yearFilter, setYearFilter] =
    useState("All");

  const [monthFilter, setMonthFilter] =
    useState("All");

  const [paymentMethodFilter, setPaymentMethodFilter] =
    useState("All");

  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  /*
  |--------------------------------------------------------------------------
  | LOAD PAYROLL
  |--------------------------------------------------------------------------
  */

  const loadPayroll = useCallback(
    (showRefresh = false) => {
      try {
        setError("");

        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        // Keep payroll history live so payment/status edits made by Admin/HR
        // appear immediately without a manual refresh.
        if (loadPayroll.unsubscribe) {
          loadPayroll.unsubscribe();
          loadPayroll.unsubscribe = null;
        }
        const subscribePayroll = isEmployeeView ? subscribeMyPayroll : subscribeAllPayroll;
        const unsubscribe = subscribePayroll(
          (data) => {
            setPayroll(Array.isArray(data) ? data : []);
            setLoading(false);
            setRefreshing(false);
          },
          (subscriptionError) => {
            console.error("Payroll realtime error:", subscriptionError);
            const message = subscriptionError?.message || "Unable to load payroll history.";
            setError(message);
            setLoading(false);
            setRefreshing(false);
            if (showRefresh) toast.error(message);
          }
        );
        loadPayroll.unsubscribe = unsubscribe;
        return unsubscribe;
      } catch (loadError) {
        console.error(
          "Load payroll history error:",
          loadError
        );

        const message =
          loadError?.message ||
          "Unable to load payroll history.";

        setError(message);

        if (showRefresh) {
          toast.error(message);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isEmployeeView]
  );

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const unsubscribe = loadPayroll();
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
      loadPayroll.unsubscribe = null;
    };
  }, [loadPayroll]);

  /*
  |--------------------------------------------------------------------------
  | SORT PAYROLL
  |--------------------------------------------------------------------------
  */

  const sortedPayroll = useMemo(() => {
    return [...payroll].sort(
      (a, b) =>
        getPayrollSortValue(b) -
        getPayrollSortValue(a)
    );
  }, [payroll]);

  /*
  |--------------------------------------------------------------------------
  | AVAILABLE YEARS
  |--------------------------------------------------------------------------
  */

  const availableYears = useMemo(() => {
    const years = sortedPayroll
      .map((record) => Number(record?.year))
      .filter((year) => year > 0);

    return [...new Set(years)].sort(
      (a, b) => b - a
    );
  }, [sortedPayroll]);

  const availablePaymentMethods = useMemo(() => [...new Set(sortedPayroll.map((record) => String(record?.paymentMethod || "").trim()).filter(Boolean))].sort(), [sortedPayroll]);

  /*
  |--------------------------------------------------------------------------
  | FILTER PAYROLL
  |--------------------------------------------------------------------------
  */

  const filteredPayroll = useMemo(() => {
    const search =
      searchTerm.trim().toLowerCase();

    return sortedPayroll.filter((record) => {
      const period =
        getPayrollPeriod(record).toLowerCase();

      const employeeName =
        String(
          record?.employeeName || ""
        ).toLowerCase();

      const employeeEmail =
        String(
          record?.employeeEmail || ""
        ).toLowerCase();

      const transactionId =
        String(
          record?.transactionId || ""
        ).toLowerCase();

      const status =
        record?.status || "Pending";

      const year =
        Number(record?.year) || 0;

      const month =
        Number(record?.month) || 0;

      const matchesSearch =
        !search ||
        period.includes(search) ||
        employeeName.includes(search) ||
        employeeEmail.includes(search) ||
        String(record?.employeeCode || record?.employeeId || "").toLowerCase().includes(search) ||
        transactionId.includes(search);

      const matchesStatus =
        statusFilter === "All" ||
        status === statusFilter;

      const matchesYear =
        yearFilter === "All" ||
        year === Number(yearFilter);

      const matchesMonth =
        monthFilter === "All" ||
        month === Number(monthFilter);

      const matchesPaymentMethod = paymentMethodFilter === "All" || String(record?.paymentMethod || "") === paymentMethodFilter;
      const netSalary = normalizePayrollFinancials(record).netSalary;
      const matchesMinAmount = minAmount === "" || netSalary >= Number(minAmount);
      const matchesMaxAmount = maxAmount === "" || netSalary <= Number(maxAmount);

      return (matchesSearch && matchesStatus && matchesYear && matchesMonth && matchesPaymentMethod && matchesMinAmount && matchesMaxAmount);
    });
  }, [
    sortedPayroll,
    searchTerm,
    statusFilter,
    yearFilter,
    monthFilter,
    paymentMethodFilter,
    minAmount,
    maxAmount,
  ]);

  /*
  |--------------------------------------------------------------------------
  | SUMMARY
  |--------------------------------------------------------------------------
  */

  const summary = useMemo(() => {
    const totalNetSalary =
      sortedPayroll.reduce(
        (total, record) =>
          total +
          normalizePayrollFinancials(record).netSalary,
        0
      );

    const totalBasicSalary =
      sortedPayroll.reduce(
        (total, record) =>
          total +
          (Number(record?.basicSalary) || 0),
        0
      );

    const totalAllowances =
      sortedPayroll.reduce(
        (total, record) =>
          total +
          (Number(record?.allowances) || 0),
        0
      );

    const totalDeductions =
      sortedPayroll.reduce(
        (total, record) =>
          total +
          (Number(record?.deductions) || 0),
        0
      );

    const paid = sortedPayroll.filter(
      (record) =>
        (record?.status || "Pending") ===
        "Paid"
    ).length;

    const pending = sortedPayroll.filter(
      (record) =>
        (record?.status || "Pending") ===
        "Pending"
    ).length;

    const processing =
      sortedPayroll.filter(
        (record) =>
          record?.status === "Processing"
      ).length;

    const failed = sortedPayroll.filter(
      (record) =>
        record?.status === "Failed"
    ).length;

    return {
      totalNetSalary,
      totalBasicSalary,
      totalAllowances,
      totalDeductions,
      paid,
      pending,
      processing,
      failed,
    };
  }, [sortedPayroll]);

  /*
  |--------------------------------------------------------------------------
  | CLEAR FILTERS
  |--------------------------------------------------------------------------
  */

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
    setYearFilter("All");
    setMonthFilter("All");
    setPaymentMethodFilter("All");
    setMinAmount("");
    setMaxAmount("");
  };

  const hasActiveFilters =
    searchTerm ||
    statusFilter !== "All" ||
    yearFilter !== "All" ||
    monthFilter !== "All" ||
    paymentMethodFilter !== "All" ||
    minAmount ||
    maxAmount;

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 p-4 dark:bg-slate-950 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center">
              <Loader2
                size={34}
                className="mx-auto animate-spin text-slate-500"
              />

              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                Loading payroll history...
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

  if (error && !payroll.length) {
    return (
      <div className="min-h-full bg-slate-50 p-4 dark:bg-slate-950 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm dark:border-red-900/50 dark:bg-slate-900">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                <XCircle size={24} />
              </div>

              <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
                Unable to load payroll history
              </h2>

              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {error}
              </p>

              <button
                type="button"
                onClick={() =>
                  loadPayroll()
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
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              to={isEmployeeView ? "/payroll/salary-slip" : "/payroll"}
              className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              <ChevronLeft size={16} />
              Back to Payroll
            </Link>

            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <FileText size={16} />

              <span>Payroll</span>
            </div>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              {isEmployeeView ? "My Salary Slips" : "Payroll History"}
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {isEmployeeView
                ? "View every salary slip generated for your account. Each slip is private to you."
                : "View and track all salary payment records."}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              loadPayroll(true)
            }
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 lg:self-auto"
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

        {/* Refresh Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-500/10 dark:text-amber-300">
            {error}
          </div>
        )}

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Net Salary"
            value={formatCurrency(
              summary.totalNetSalary
            )}
            subtitle={`${sortedPayroll.length} total records`}
            icon={IndianRupee}
          />

          <SummaryCard
            title="Total Basic Salary"
            value={formatCurrency(
              summary.totalBasicSalary
            )}
            subtitle="Across all payroll records"
            icon={Wallet}
          />

          <SummaryCard
            title="Total Allowances"
            value={formatCurrency(
              summary.totalAllowances
            )}
            subtitle="Total additional earnings"
            icon={ArrowUpRight}
          />

          <SummaryCard
            title="Total Deductions"
            value={formatCurrency(
              summary.totalDeductions
            )}
            subtitle="Total deductions"
            icon={ArrowDownRight}
          />
        </div>

        {/* Filters */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4">

            {/* Search */}
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
                placeholder="Search by period, employee, email or transaction ID..."
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-800"
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() =>
                    setSearchTerm("")
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700 dark:hover:text-white"
                  aria-label="Clear search"
                >
                  <X size={17} />
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">

              {/* Status */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Status
                </label>

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:border-slate-500 dark:focus:ring-slate-800"
                >
                  <option value="All">
                    All Status
                  </option>

                  <option value="Paid">
                    Paid
                  </option>

                  <option value="Pending">
                    Pending
                  </option>

                  <option value="Processing">
                    Processing
                  </option>

                  <option value="Failed">
                    Failed
                  </option>
                </select>
              </div>

              {/* Year */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Year
                </label>

                <select
                  value={yearFilter}
                  onChange={(event) =>
                    setYearFilter(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:border-slate-500 dark:focus:ring-slate-800"
                >
                  <option value="All">
                    All Years
                  </option>

                  {availableYears.map(
                    (year) => (
                      <option
                        key={year}
                        value={year}
                      >
                        {year}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* Month */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Month
                </label>

                <select
                  value={monthFilter}
                  onChange={(event) =>
                    setMonthFilter(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:border-slate-500 dark:focus:ring-slate-800"
                >
                  <option value="All">
                    All Months
                  </option>

                  {Array.from(
                    { length: 12 },
                    (_, index) =>
                      index + 1
                  ).map((month) => (
                    <option
                      key={month}
                      value={month}
                    >
                      {getMonthName(
                        month
                      )}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Payment Method</label>
                <select value={paymentMethodFilter} onChange={(event) => setPaymentMethodFilter(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                  <option value="All">All Payment Methods</option>
                  {availablePaymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
                </select>

                <input type="number" min="0" value={minAmount} onChange={(event) => setMinAmount(event.target.value)} placeholder="Min ₹" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200" />

                <input type="number" min="0" value={maxAmount} onChange={(event) => setMaxAmount(event.target.value)} placeholder="Max ₹" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200" />
              </div>


              {/* Clear */}
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <X size={16} />
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Result Info */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {filteredPayroll.length}{" "}
              {filteredPayroll.length === 1
                ? "record"
                : "records"}{" "}
              found
            </p>

            {hasActiveFilters && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Showing filtered payroll records
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              <CheckCircle2 size={13} />
              Paid {summary.paid}
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1.5 font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
              <Clock3 size={13} />
              Pending {summary.pending}
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1.5 font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
              <Clock3 size={13} />
              Processing {summary.processing}
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1.5 font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">
              <XCircle size={13} />
              Failed {summary.failed}
            </span>
          </div>
        </div>

        {/* Payroll Table */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

          {filteredPayroll.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">

                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                    <th className="px-5 py-4 font-semibold">
                      Payroll Period
                    </th>

                    {!isEmployeeView && (
                      <th className="px-5 py-4 font-semibold">
                        Employee
                      </th>
                    )}

                    <th className="px-5 py-4 font-semibold">
                      Basic
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      Allowances
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      Deductions
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      Net Salary
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      Payment
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      Status
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      {isEmployeeView ? "Salary Slip" : "Action"}
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">

                  {filteredPayroll.map(
                    (record) => (
                      <tr
                        key={record.id}
                        className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        {/* Period */}
                        <td className="px-5 py-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              <CalendarDays
                                size={18}
                              />
                            </div>

                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {getPayrollPeriod(
                                  record
                                )}
                              </p>

                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {record.monthKey ||
                                  "Payroll record"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Employee */}
                        {!isEmployeeView && (
                          <td className="px-5 py-4">
                            <p className="font-medium text-slate-900 dark:text-white">
                              {record.employeeName || "—"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {record.employeeEmail || "—"}
                            </p>
                          </td>
                        )}

                        {/* Basic */}
                        <td className="px-5 py-4">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {formatCurrency(
                              record.basicSalary
                            )}
                          </span>
                        </td>

                        {/* Allowances */}
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                            <ArrowUpRight
                              size={14}
                            />

                            {formatCurrency(
                              record.allowances
                            )}
                          </span>
                        </td>

                        {/* Deductions */}
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1 text-sm font-medium text-red-600 dark:text-red-400">
                            <ArrowDownRight
                              size={14}
                            />

                            {formatCurrency(
                              record.deductions
                            )}
                          </span>
                        </td>

                        {/* Net */}
                        <td className="px-5 py-4">
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              {formatCurrency(
                                normalizePayrollFinancials(record).netSalary
                              )}
                            </p>

                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              Net payable
                            </p>
                          </div>
                        </td>

                        {/* Payment */}
                        <td className="px-5 py-4">
                          <div className="flex items-start gap-2">
                            <CreditCard
                              size={16}
                              className="mt-0.5 shrink-0 text-slate-400"
                            />

                            <div>
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {formatDate(
                                  record.paymentDate
                                )}
                              </p>

                              {record.paymentMethod && (
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  {
                                    record.paymentMethod
                                  }
                                </p>
                              )}

                              {record.transactionId && (
                                <p className="mt-1 max-w-[150px] truncate text-xs text-slate-400">
                                  {
                                    record.transactionId
                                  }
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <StatusBadge
                            status={
                              record.status
                            }
                          />
                        </td>

                        <td className="px-5 py-4">
                          {isEmployeeView ? (
                            <Link
                              to={`/payroll/salary-slip?id=${record.id}`}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                            >
                              <FileText size={13} />
                              View Slip
                            </Link>
                          ) : (
                            <Link
                              to={`/payroll/generate?id=${record.id}`}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              <Pencil size={13} />
                              Edit
                            </Link>
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* Empty Filter State */
            <div className="px-5 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {hasActiveFilters ? (
                  <Search size={25} />
                ) : (
                  <FileText size={25} />
                )}
              </div>

              <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
                {hasActiveFilters
                  ? "No matching payroll records"
                  : "No payroll history"}
              </h3>

              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
                {hasActiveFilters
                  ? "Try changing your search or filters to find the payroll record you are looking for."
                  : "Your payroll records will appear here once salary payments are generated."}
              </p>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  <X size={16} />
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bottom Summary */}
        {sortedPayroll.length > 0 && (
          <div className="mt-6 grid gap-4 sm:grid-cols-3">

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <CheckCircle2 size={19} />
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Paid
                  </p>

                  <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {summary.paid}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Completed payroll payments
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                  <Clock3 size={19} />
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Pending
                  </p>

                  <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {summary.pending}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Awaiting payment
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  <Clock3 size={19} />
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Processing
                  </p>

                  <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {summary.processing}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Currently being processed
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 flex flex-col gap-2 border-t border-slate-200 pt-5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <FileText size={14} />
            <span>
              Showing {filteredPayroll.length} of{" "}
              {sortedPayroll.length} payroll records • Filtered total {formatCurrency(filteredPayroll.reduce((sum, record) => sum + normalizePayrollFinancials(record).netSalary, 0))}
            </span>
          </div>

          <Link
            to="/payroll"
            className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:underline dark:text-slate-200"
          >
            <Wallet size={14} />
            Payroll Overview
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PayrollHistory;