import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, CalendarCheck2, CalendarDays, FileText, FolderOpen,
  Loader2, RefreshCw, UserCheck, UserPlus, Users, WalletCards,
} from "lucide-react";
import { Link } from "react-router-dom";
import { getEmployees, getEmployeeForUser } from "../../services/employeeService";
import { getDocuments } from "../../services/documentService";
import { useAuth } from "../../context/AuthContext";
import { ROLES, ROLE_LABELS } from "../../constants/roleConstants";

const toMillis = (v) => {
  if (!v) return 0;
  if (typeof v.toMillis === "function") return v.toMillis();
  return new Date(v).getTime() || 0;
};

export default function Dashboard() {
  const { user, role, isManagement } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [myEmployee, setMyEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (refresh = false) => {
    try {
      refresh ? setRefreshing(true) : setLoading(true);
      setError("");
      const docsPromise = getDocuments();
      if (isManagement) {
        const [people, docs] = await Promise.all([getEmployees(), docsPromise]);
        setEmployees((people || []).filter((e) => e.role === ROLES.EMPLOYEE || e.isEmployee === true));
        setDocuments(Array.isArray(docs) ? docs : []);
      } else {
        const [mine, docs] = await Promise.all([getEmployeeForUser(user), docsPromise]);
        setMyEmployee(mine);
        setDocuments(Array.isArray(docs) ? docs : []);
      }
    } catch (e) {
      console.error(e);
      setError(e?.code === "permission-denied" ? "Permission denied. Check your Firestore rules." : e?.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isManagement, user]);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((e) => String(e.status).toLowerCase() === "active").length;
    const onLeave = employees.filter((e) => String(e.status).toLowerCase() === "on leave").length;
    return { total, active, onLeave, departments: new Set(employees.map((e) => e.department).filter(Boolean)).size };
  }, [employees]);

  if (loading) return <div className="flex min-h-[500px] items-center justify-center"><Loader2 className="animate-spin" /></div>;

  const label = ROLE_LABELS[role] || "Employee";

  if (!isManagement) {
    return (
      <div className="space-y-6">
        <section className="premium-card premium-hover rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label} Workspace</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">Welcome, {user?.displayName || "Employee"}.</h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Your personal WorkSphere workspace and daily tools.</p>
            </div>
            <button onClick={() => load(true)} disabled={refreshing} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold dark:border-slate-700">
              <RefreshCw size={17} className={refreshing ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </section>
        {error && <Alert message={error} />}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={UserCheck} label="Profile Status" value={myEmployee?.status || "Active"} />
          <Stat icon={Users} label="Employee Code" value={myEmployee?.employeeCode || "—"} />
          <Stat icon={CalendarDays} label="Department" value={myEmployee?.department || "Unassigned"} />
          <Stat icon={FileText} label="My Documents" value={documents.length} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Quick title="Attendance" text="Mark and review your attendance." to="/attendance" icon={CalendarCheck2} />
          <Quick title="Leave" text="Apply for leave and track requests." to="/leave" icon={CalendarDays} />
          <Quick title="Documents" text="View your personal documents." to="/documents" icon={FolderOpen} />
          <Quick title="Salary Slip" text="Open your latest salary information." to="/payroll/salary-slip" icon={WalletCards} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-950 sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400"><Activity size={15} /> {label} Workspace</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Business overview.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">Monitor your workforce, attendance, payroll and company operations from one place.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {role === ROLES.ADMIN && <Link to="/user-management" className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"><Users size={17} /> User Management</Link>}
            {(role === ROLES.ADMIN || role === ROLES.HR) && <Link to="/employees/add" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900"><UserPlus size={17} /> Add Employee</Link>}
            <button onClick={() => load(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900"><RefreshCw size={17} className={refreshing ? "animate-spin" : ""} /> Refresh</button>
          </div>
        </div>
      </section>
      {error && <Alert message={error} />}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Users} label="Total Employees" value={stats.total} />
        <Stat icon={UserCheck} label="Active Employees" value={stats.active} />
        <Stat icon={CalendarDays} label="On Leave" value={stats.onLeave} />
        <Stat icon={FileText} label="Documents" value={documents.length} />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Quick title="Employees" text={role === ROLES.MANAGER ? "Review workforce records." : "Manage workforce records."} to="/employees" icon={Users} />
        <Quick title="Attendance Reports" text="Review attendance data." to="/reports/attendance" icon={CalendarCheck2} />
        {(role === ROLES.ADMIN || role === ROLES.HR) ? (
          <Quick title="Payroll" text="Manage salary and payroll." to="/payroll" icon={WalletCards} />
        ) : (
          <Quick title="Requests" text="Review your operational requests." to="/requests" icon={FileText} />
        )}
        <Quick title="Departments" text={`${stats.departments} departments in records.`} to="/departments" icon={Activity} />
      </div>
      <section className="premium-card premium-hover rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-bold">Recent employees</h2>
        <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {employees.sort((a,b) => toMillis(b.createdAt)-toMillis(a.createdAt)).slice(0,6).map((e) => (
            <Link key={e.id} to={`/employees/${e.id}`} className="flex items-center justify-between gap-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <div><p className="text-sm font-semibold">{e.fullName || e.name}</p><p className="text-xs text-slate-500">{e.email}</p></div>
              <span className="text-xs font-semibold text-slate-500">{e.department || "Unassigned"}</span>
            </Link>
          ))}
          {!employees.length && <p className="py-6 text-sm text-slate-500">No employees found.</p>}
        </div>
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return <div className="premium-card premium-hover rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800"><Icon size={19} /></span><span className="max-w-[65%] truncate text-xl font-bold">{value}</span></div><p className="mt-3 text-xs font-semibold text-slate-500">{label}</p></div>;
}
function Quick({ title, text, to, icon: Icon }) {
  return <Link to={to} className="premium-card premium-hover rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900"><Icon size={20} /><h3 className="mt-4 font-bold">{title}</h3><p className="mt-1 text-sm text-slate-500">{text}</p></Link>;
}
function Alert({ message }) { return <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">{message}</div>; }
