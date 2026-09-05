import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

import {
  getMyLeaves,
  getLeaveStatistics,
} from "../../services/leaveService";
import { getLeaveReport } from "../../services/reportService";

const getStatusClasses = (status) => {
  switch (status) {
    case "Approved":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";

    case "Rejected":
      return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400";

    case "Cancelled":
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

    case "Pending":
    default:
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
  }
};

function LeaveReport() {
  const [leaves, setLeaves] = useState([]);
  const [statistics, setStatistics] = useState({
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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { isManagement } = useAuth();

  const loadReport = async () => {
    try {
      setLoading(true);
      setError("");

      if (isManagement) {
        const report = await getLeaveReport();
        setLeaves(Array.isArray(report.leaves) ? report.leaves : []);
        setStatistics({
          total: report.totalLeaves || 0,
          pending: report.pending || 0,
          approved: report.approved || 0,
          rejected: report.rejected || 0,
          cancelled: report.cancelled || 0,
          totalDays: report.totalDays || 0,
          approvedDays: (report.leaves || []).filter((x) => String(x.status || '').toLowerCase() === 'approved').reduce((a, x) => a + Number(x.totalDays ?? x.days ?? x.numberOfDays ?? 0), 0),
          pendingDays: (report.leaves || []).filter((x) => String(x.status || '').toLowerCase() === 'pending').reduce((a, x) => a + Number(x.totalDays ?? x.days ?? x.numberOfDays ?? 0), 0),
          rejectedDays: (report.leaves || []).filter((x) => String(x.status || '').toLowerCase() === 'rejected').reduce((a, x) => a + Number(x.totalDays ?? x.days ?? x.numberOfDays ?? 0), 0),
        });
      } else {
        const [leaveData, stats] = await Promise.all([getMyLeaves(), getLeaveStatistics()]);
        setLeaves(Array.isArray(leaveData) ? leaveData : []);
        setStatistics(stats || { total: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0, totalDays: 0, approvedDays: 0, pendingDays: 0, rejectedDays: 0 });
      }
    } catch (err) {
      console.error("Leave report error:", err);

      const message =
        err?.message || "Unable to load leave report.";

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [isManagement]);

  const displayedDays = useMemo(() => {
    return Number(statistics.totalDays) || 0;
  }, [statistics]);

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
              Leave
            </span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            Leave Report
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Company leave requests, approval status and leave-day summary for your role.
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
          <p className="font-semibold">Unable to load leave report</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {/* Statistics */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Total Requests"
          value={statistics.total}
        />

        <StatCard
          title="Pending"
          value={statistics.pending}
        />

        <StatCard
          title="Approved"
          value={statistics.approved}
        />

        <StatCard
          title="Rejected"
          value={statistics.rejected}
        />

        <StatCard
          title="Cancelled"
          value={statistics.cancelled}
        />

        <StatCard
          title="Total Days"
          value={displayedDays}
        />
      </div>

      {/* Day Summary */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          title="Approved Days"
          value={statistics.approvedDays}
          description="Days approved"
        />

        <SummaryCard
          title="Pending Days"
          value={statistics.pendingDays}
          description="Days waiting for approval"
        />

        <SummaryCard
          title="Rejected Days"
          value={statistics.rejectedDays}
          description="Days rejected"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-white">
            Leave History
          </h2>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Leave requests available to your role.
          </p>
        </div>

        {loading ? (
          <LoadingTable />
        ) : leaves.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {leaves.map((leave) => (
                  <tr
                    key={leave.id}
                    className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <TableCell>
                      {leave.leaveType || "—"}
                    </TableCell>

                    <TableCell>
                      {formatDate(leave.startDate)}
                    </TableCell>

                    <TableCell>
                      {formatDate(leave.endDate)}
                    </TableCell>

                    <TableCell>
                      <span className="font-semibold">
                        {Number(leave.totalDays) || 0}
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="max-w-xs truncate">
                        {leave.reason || "—"}
                      </div>
                    </TableCell>

                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                          leave.status
                        )}`}
                      >
                        {leave.status || "Pending"}
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

function StatCard({ title, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {title}
      </p>

      <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm font-semibold text-slate-900 dark:text-white">
        {title}
      </p>

      <p className="mt-2 text-3xl font-bold text-indigo-600 dark:text-indigo-400">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {description}
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
      <div className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-5 text-white shadow-xl sm:p-7 dark:border-slate-800">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-slate-200">
              LEAVE MANAGEMENT WORKSPACE
            </span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Time off, managed simply.
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Apply for leave, review requests and keep your leave history organized in one responsive workspace.
            </p>
          </div>
        </div>
      </div>
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
      <div className="text-4xl">🏖️</div>

      <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
        No leave requests
      </h3>

      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Your leave requests will appear here.
      </p>
    </div>
  );
}

export default LeaveReport;