import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

import {
  getAttendanceHistory,
  formatWorkingTime,
  formatAttendanceDate,
} from "../../services/attendanceService";
import { getAttendanceReport } from "../../services/reportService";

const getStatusClasses = (status) => {
  switch (status) {
    case "Present":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";

    case "Completed":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400";

    case "Absent":
      return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400";

    case "Late":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";

    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
};

function AttendanceReport() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { isManagement } = useAuth();

  const loadReport = async () => {
    try {
      setLoading(true);
      setError("");

      /*
       * IMPORTANT:
       * Do not directly query attendance collection here.
       *
       * attendanceService already filters:
       * where("userId", "==", user.uid)
       *
       * This matches the current Firestore rules.
       */
      const data = isManagement
        ? (await getAttendanceReport()).attendance
        : await getAttendanceHistory(100);

      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Attendance report error:", err);

      const message =
        err?.message || "Unable to load attendance report.";

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [isManagement]);

  const statistics = useMemo(() => {
    let totalWorkingMinutes = 0;
    let completed = 0;
    let present = 0;
    let absent = 0;
    let late = 0;

    records.forEach((record) => {
      totalWorkingMinutes += Number(record.workingMinutes) || 0;

      switch (record.status) {
        case "Completed":
          completed += 1;
          break;

        case "Present":
          present += 1;
          break;

        case "Absent":
          absent += 1;
          break;

        case "Late":
          late += 1;
          break;

        default:
          break;
      }
    });

    return {
      total: records.length,
      completed,
      present,
      absent,
      late,
      totalWorkingMinutes,
    };
  }, [records]);

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
              Attendance
            </span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            Attendance Report
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Company attendance, working hours and attendance status for the selected access level.
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
          <p className="font-semibold">Unable to load attendance report</p>

          <p className="mt-1">{error}</p>
        </div>
      )}

      {/* Statistics */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          title="Total Records"
          value={statistics.total}
        />

        <StatCard
          title="Completed"
          value={statistics.completed}
        />

        <StatCard
          title="Present"
          value={statistics.present}
        />

        <StatCard
          title="Absent"
          value={statistics.absent}
        />

        <StatCard
          title="Working Time"
          value={formatWorkingTime(
            statistics.totalWorkingMinutes
          )}
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-white">
            Attendance History
          </h2>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Showing attendance records available to your role.
          </p>
        </div>

        {loading ? (
          <LoadingTable />
        ) : records.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <TableHead>Date</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Working Time</TableHead>
                  <TableHead>Status</TableHead>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {records.map((record) => (
                  <tr
                    key={record.id}
                    className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <TableCell>
                      {formatAttendanceDate(record.date)}
                    </TableCell>

                    <TableCell>
                      {record.checkIn || "—"}
                    </TableCell>

                    <TableCell>
                      {record.checkOut || "—"}
                    </TableCell>

                    <TableCell>
                      {formatWorkingTime(
                        record.workingMinutes
                      )}
                    </TableCell>

                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                          record.status
                        )}`}
                      >
                        {record.status || "Unknown"}
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
      <div className="text-4xl">📅</div>

      <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
        No attendance records
      </h3>

      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Your attendance records will appear here after you check in.
      </p>
    </div>
  );
}

export default AttendanceReport;