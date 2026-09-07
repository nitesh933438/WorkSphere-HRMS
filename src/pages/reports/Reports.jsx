import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { FaUsers, FaCalendarCheck, FaUmbrellaBeach, FaMoneyBillWave, FaFileAlt, FaBuilding, FaClipboardList, FaArrowRight, FaSyncAlt } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../constants/roleConstants";
import { getCompleteReport } from "../../services/reportService";

const reportCards = [
  { title: "Employee Report", description: "Workforce count, active/inactive employees and department distribution.", path: "/reports/employees", icon: FaUsers, roles: [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER] },
  { title: "Attendance Report", description: "Company attendance, present, absent, late and working-time records.", path: "/reports/attendance", icon: FaCalendarCheck, roles: [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER] },
  { title: "Leave Report", description: "Leave requests, approval status, leave days and team statistics.", path: "/reports/leave", icon: FaUmbrellaBeach, roles: [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER] },
  { title: "Payroll Report", description: "Payroll totals, paid/processing/pending status and salary breakdown.", path: "/reports/payroll", icon: FaMoneyBillWave, roles: [ROLES.ADMIN, ROLES.HR] },
  { title: "Documents Report", description: "Company document count and category-wise document summary.", path: "/documents", icon: FaFileAlt, roles: [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER] },
  { title: "Department Report", description: "Department-wise employee distribution and active workforce.", path: "/departments", icon: FaBuilding, roles: [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER] },
  { title: "Requests", description: "Open the request workflow to review and manage employee requests.", path: "/requests", icon: FaClipboardList, roles: [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER] },
];

const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value) || 0);

function Reports() {
  const { role } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const visibleReports = useMemo(() => reportCards.filter((item) => item.roles.includes(role)), [role]);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError("");
      setReport(await getCompleteReport());
    } catch (err) {
      console.error("Reports overview error:", err);
      setError(err?.message || "Unable to load reports.");
      toast.error(err?.message || "Unable to load reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReport(); }, []);

  const employees = report?.employees || {};
  const attendance = report?.attendance || {};
  const leaves = report?.leaves || {};
  const payroll = report?.payroll || {};

  return (
    <div className="min-h-screen bg-slate-50 p-4 dark:bg-slate-950 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400">WorkSphere Analytics</p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Reports</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">Real-time workforce, attendance, leave and payroll reporting from your Firebase data.</p>
          </div>
          <button onClick={loadReport} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900">
            <FaSyncAlt className={loading ? "animate-spin" : ""} /> {loading ? "Loading..." : "Refresh Reports"}
          </button>
        </div>

        {error && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"><b>Reports could not be loaded.</b><div className="mt-1 break-words">{error}</div></div>}

        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Metric title="Employees" value={loading ? "—" : employees.totalEmployees ?? 0} />
          <Metric title="Attendance Records" value={loading ? "—" : attendance.totalRecords ?? 0} />
          <Metric title="Leave Requests" value={loading ? "—" : leaves.totalLeaves ?? 0} />
          {(role === ROLES.ADMIN || role === ROLES.HR) && <Metric title="Net Payroll" value={loading ? "—" : money(payroll.totalNetSalary)} />}
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleReports.map((item) => {
            const Icon = item.icon;
            return <Link key={item.title} to={item.path} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-lg text-slate-700 dark:bg-slate-800 dark:text-slate-200"><Icon /></span><FaArrowRight className="mt-2 text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-500" /></div>
              <h2 className="mt-5 font-semibold text-slate-900 dark:text-white">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{item.description}</p>
              <span className="mt-4 inline-block text-sm font-semibold text-indigo-600 dark:text-indigo-400">Open report →</span>
            </Link>;
          })}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-slate-900 dark:text-white">Current status</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Automatically calculated from current records.</p></div><span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Live data</span></div>
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Status title="Active Employees" value={employees.activeEmployees ?? 0} />
            <Status title="Pending Leave" value={leaves.pending ?? 0} />
            <Status title="Approved Leave" value={leaves.approved ?? 0} />
            <Status title="Paid Payroll" value={payroll.paid ?? 0} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ title, value }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-medium text-slate-500 dark:text-slate-400">{title}</p><p className="mt-2 truncate text-2xl font-bold text-slate-900 dark:text-white">{value}</p></div>; }
function Status({ title, value }) { return <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60"><p className="text-xs text-slate-500 dark:text-slate-400">{title}</p><p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{value}</p></div>; }

export default Reports;
