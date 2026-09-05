import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FilePlus2,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";

import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../constants/roleConstants";

import {
  cancelLeave,
  getLeaveStatistics,
  getMyLeaves,
  getAllLeaves,
  reviewLeave,
} from "../../services/leaveService";

const Leave = () => {
  const { role } = useAuth();
  const isManagement = [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER].includes(role);
  const [leaves, setLeaves] =
    useState([]);

  const [statistics, setStatistics] =
    useState({
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
      totalDays: 0,
      approvedDays: 0,
      pendingDays: 0,
      rejectedDays: 0,
    });

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  /*
  |--------------------------------------------------------------------------
  | LOAD DATA
  |--------------------------------------------------------------------------
  */

  const loadLeaveData = useCallback(
    async () => {
      try {
        setLoading(true);

        const [
          leaveData,
          statisticsData,
        ] = await Promise.all([
          isManagement ? getAllLeaves() : getMyLeaves(),
          isManagement ? Promise.resolve(null) : getLeaveStatistics(),
        ]);

        setLeaves(
          Array.isArray(leaveData)
            ? leaveData
            : []
        );

        if (statisticsData) {
          setStatistics(statisticsData);
        } else {
          const data = Array.isArray(leaveData) ? leaveData : [];
          setStatistics(data.reduce((acc, item) => {
            const status = item.status || "Pending";
            const days = Number(item.totalDays) || 0;
            acc.total += 1; acc.totalDays += days;
            if (status === "Approved") { acc.approved += 1; acc.approvedDays += days; }
            else if (status === "Rejected") { acc.rejected += 1; acc.rejectedDays += days; }
            else if (status === "Cancelled") acc.cancelled += 1;
            else { acc.pending += 1; acc.pendingDays += days; }
            return acc;
          }, { total: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0, totalDays: 0, approvedDays: 0, pendingDays: 0, rejectedDays: 0 }));
        }
      } catch (error) {
        console.error(
          "Load leave data error:",
          error
        );

        toast.error(
          error?.message ||
            "Unable to load leave data."
        );
      } finally {
        setLoading(false);
      }
    },
    [isManagement]
  );

  useEffect(() => {
    loadLeaveData();
  }, [loadLeaveData]);

  /*
  |--------------------------------------------------------------------------
  | REFRESH
  |--------------------------------------------------------------------------
  */

  const handleRefresh = async () => {
    try {
      setRefreshing(true);

      const [
        leaveData,
        statisticsData,
      ] = await Promise.all([
        isManagement ? getAllLeaves() : getMyLeaves(),
        isManagement ? Promise.resolve(null) : getLeaveStatistics(),
      ]);

      setLeaves(
        Array.isArray(leaveData)
          ? leaveData
          : []
      );

      setStatistics(
        statisticsData
      );

      toast.success(
        "Leave data refreshed."
      );
    } catch (error) {
      toast.error(
        error?.message ||
          "Unable to refresh."
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handleReview = async (leaveId, status) => {
    const action = status === "Approved" ? "approve" : "reject";
    if (!window.confirm(`Are you sure you want to ${action} this leave request?`)) return;
    try {
      await reviewLeave(leaveId, status);
      toast.success(`Leave request ${status.toLowerCase()}.`);
      await loadLeaveData();
    } catch (error) {
      console.error("Leave review error:", error);
      toast.error(error?.message || `Unable to ${action} leave.`);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | CANCEL
  |--------------------------------------------------------------------------
  */

  const handleCancel = async (
    leaveId
  ) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to cancel this leave request?"
      );

    if (!confirmed) {
      return;
    }

    try {
      await cancelLeave(
        leaveId
      );

      toast.success(
        "Leave request cancelled."
      );

      await loadLeaveData();
    } catch (error) {
      console.error(
        "Cancel leave error:",
        error
      );

      toast.error(
        error?.message ||
          "Unable to cancel leave."
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | FILTER
  |--------------------------------------------------------------------------
  */

  const filteredLeaves = useMemo(() => {
    const searchValue =
      search
        .trim()
        .toLowerCase();

    return leaves.filter(
      (leave) => {
        const matchesSearch =
          !searchValue ||
          leave.leaveType
            ?.toLowerCase()
            .includes(searchValue) ||
          leave.reason
            ?.toLowerCase()
            .includes(searchValue) ||
          leave.status
            ?.toLowerCase()
            .includes(searchValue);

        const matchesStatus =
          statusFilter === "All" ||
          leave.status ===
            statusFilter;

        return (
          matchesSearch &&
          matchesStatus
        );
      }
    );
  }, [
    leaves,
    search,
    statusFilter,
  ]);

  /*
  |--------------------------------------------------------------------------
  | FORMAT DATE
  |--------------------------------------------------------------------------
  */

  const formatDate = (date) => {
    if (!date) {
      return "-";
    }

    try {
      return new Date(
        `${date}T00:00:00`
      ).toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );
    } catch {
      return date;
    }
  };

  /*
  |--------------------------------------------------------------------------
  | STATUS STYLE
  |--------------------------------------------------------------------------
  */

  const getStatusClasses = (
    status
  ) => {
    switch (status) {
      case "Approved":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400";

      case "Rejected":
        return "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400";

      case "Cancelled":
        return "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300";

      case "Pending":
      default:
        return "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
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
        <div className="mx-auto max-w-7xl">

          <div className="animate-pulse">

            <div className="h-8 w-40 rounded-lg bg-slate-200 dark:bg-slate-800" />

            <div className="mt-3 h-4 w-72 rounded bg-slate-200 dark:bg-slate-800" />

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

              {[
                1,
                2,
                3,
                4,
              ].map((item) => (
                <div
                  key={item}
                  className="h-28 rounded-2xl bg-white dark:bg-slate-900"
                />
              ))}

            </div>

          </div>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-full bg-slate-50 p-4 dark:bg-slate-950 sm:p-6 lg:p-8">

      <div className="mx-auto max-w-7xl">

        {/* Header */}

        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Leave Management
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage your leave requests and track their status.
            </p>

          </div>

          <div className="flex flex-wrap gap-3">

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <RefreshCw
                size={17}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>

            <Link
              to="/leave/apply"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              <FilePlus2
                size={17}
              />

              Apply Leave
            </Link>

          </div>
        </div>

        {/* Statistics */}

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {/* Total */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Total Requests
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                  {statistics.total}
                </p>

              </div>

              <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">

                <CalendarDays
                  size={22}
                  className="text-slate-700 dark:text-slate-300"
                />

              </div>

            </div>

          </div>

          {/* Pending */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Pending
                </p>

                <p className="mt-2 text-3xl font-bold text-amber-600 dark:text-amber-400">
                  {statistics.pending}
                </p>

              </div>

              <div className="rounded-xl bg-amber-100 p-3 dark:bg-amber-500/10">

                <Clock3
                  size={22}
                  className="text-amber-600 dark:text-amber-400"
                />

              </div>

            </div>

          </div>

          {/* Approved */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Approved
                </p>

                <p className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {statistics.approved}
                </p>

              </div>

              <div className="rounded-xl bg-emerald-100 p-3 dark:bg-emerald-500/10">

                <CheckCircle2
                  size={22}
                  className="text-emerald-600 dark:text-emerald-400"
                />

              </div>

            </div>

          </div>

          {/* Rejected */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Rejected
                </p>

                <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">
                  {statistics.rejected}
                </p>

              </div>

              <div className="rounded-xl bg-red-100 p-3 dark:bg-red-500/10">

                <XCircle
                  size={22}
                  className="text-red-600 dark:text-red-400"
                />

              </div>

            </div>

          </div>

        </div>

        {/* Days Summary */}

        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <div className="grid gap-5 sm:grid-cols-3">

            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Total Leave Days
              </p>

              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                {statistics.totalDays}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Approved Days
              </p>

              <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {statistics.approvedDays}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Pending Days
              </p>

              <p className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">
                {statistics.pendingDays}
              </p>
            </div>

          </div>
        </div>

        {/* Search / Filter */}

        <div className="mb-5 flex flex-col gap-3 sm:flex-row">

          <div className="relative flex-1">

            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search leave requests..."
              className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-slate-700"
            />

          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value="All">
              All Status
            </option>

            <option value="Pending">
              Pending
            </option>

            <option value="Approved">
              Approved
            </option>

            <option value="Rejected">
              Rejected
            </option>

            <option value="Cancelled">
              Cancelled
            </option>
          </select>

        </div>

        {/* Leave List */}

        {filteredLeaves.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">

            <CalendarDays
              size={42}
              className="mx-auto text-slate-400"
            />

            <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
              No leave requests found
            </h2>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {leaves.length === 0
                ? "You haven't submitted any leave requests yet."
                : "Try changing your search or filter."}
            </p>

            {leaves.length === 0 && (
              <Link
                to="/leave/apply"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
              >
                <FilePlus2
                  size={17}
                />

                Apply for Leave
              </Link>
            )}

          </div>
        ) : (
          <div className="space-y-4">

            {filteredLeaves.map(
              (leave) => (
                <div
                  key={leave.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >

                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

                    <div className="min-w-0 flex-1">

                      <div className="flex flex-wrap items-center gap-3">

                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                          {leave.leaveType ||
                            "Leave"}
                        </h3>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                            leave.status
                          )}`}
                        >
                          {leave.status ||
                            "Pending"}
                        </span>

                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">

                        <div>
                          <p className="text-xs text-slate-400">
                            Start Date
                          </p>

                          <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                            {formatDate(
                              leave.startDate
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-400">
                            End Date
                          </p>

                          <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                            {formatDate(
                              leave.endDate
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-400">
                            Total Days
                          </p>

                          <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                            {leave.totalDays ||
                              0}{" "}
                            {leave.totalDays ===
                            1
                              ? "day"
                              : "days"}
                          </p>
                        </div>

                      </div>

                      <div className="mt-4">

                        <p className="text-xs text-slate-400">
                          Reason
                        </p>

                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">
                          {leave.reason ||
                            "-"}
                        </p>

                      </div>

                      {leave.adminComment && (
                        <div className="mt-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">

                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Admin Comment
                          </p>

                          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                            {leave.adminComment}
                          </p>

                        </div>
                      )}

                    </div>

                    {leave.status === "Pending" && isManagement ? (
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => handleReview(leave.id, "Approved")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700">
                          <CheckCircle2 size={17} /> Approve
                        </button>
                        <button type="button" onClick={() => handleReview(leave.id, "Rejected")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700">
                          <XCircle size={17} /> Reject
                        </button>
                      </div>
                    ) : leave.status === "Pending" ? (
                      <button type="button" onClick={() => handleCancel(leave.id)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-500/10">
                        <XCircle size={17} /> Cancel
                      </button>
                    ) : null}

                  </div>
                </div>
              )
            )}

          </div>
        )}

      </div>
    </div>
  );
};

export default Leave;