import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDepartments, mergeDepartmentOptions } from "../../hooks/useDepartments";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock3, IndianRupee, RefreshCw, WalletCards, Search, SlidersHorizontal, X, Pencil } from "lucide-react";
import toast from "react-hot-toast";
import { normalizePayrollFinancials, subscribeAllPayroll } from "../../services/payrollService";
import { useAuth } from "../../context/AuthContext";
import { ROLE_LABELS } from "../../constants/roleConstants";

const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value) || 0);
const date = (value) => {
  if (!value) return "—";
  const d = value?.toDate ? value.toDate() : value?.seconds ? new Date(value.seconds * 1000) : new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export default function ManagementPayroll() {
  const { role } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("All");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const { departments } = useDepartments();
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const subscriptionRef = useRef(null);

  const load = useCallback((refresh = false) => {
    try {
      if (subscriptionRef.current) subscriptionRef.current();
      refresh ? setRefreshing(true) : setLoading(true);
      setError("");
      const unsubscribe = subscribeAllPayroll(
        (data) => {
          setRecords(Array.isArray(data) ? data.map((record) => ({ ...record, ...normalizePayrollFinancials(record) })) : []);
          setLoading(false);
          setRefreshing(false);
        },
        (e) => {
          console.error(e);
          setError(e?.message || "Unable to load payroll.");
          setLoading(false);
          setRefreshing(false);
          if (refresh) toast.error(e?.message || "Unable to load payroll.");
        }
      );
      subscriptionRef.current = unsubscribe;
      return unsubscribe;
    } catch (e) {
      console.error(e);
      setError(e?.message || "Unable to load payroll.");
      setLoading(false);
      setRefreshing(false);
      return undefined;
    }
  }, []);

  useEffect(() => {
    load();
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }
    };
  }, [load]);

  const departmentOptions = useMemo(() => mergeDepartmentOptions(departments, records), [departments, records]);

  const years = useMemo(() => [...new Set(records.map((r) => Number(r.year)).filter((v) => v > 0))].sort((a,b) => b-a), [records]);
  const paymentMethods = useMemo(() => [...new Set(records.map((r) => String(r.paymentMethod || "").trim()).filter(Boolean))].sort(), [records]);

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      const financials = normalizePayrollFinancials(r);
      const haystack = [r.employeeName, r.employeeEmail, r.employeeId, r.transactionId, r.paymentMethod, r.period, r.month, r.year].filter((v) => v !== undefined && v !== null).join(" ").toLowerCase();
      const status = String(r.status || "Pending");
      const recordDepartment = String(r.department || r.departmentName || "").toLowerCase();
      return (!q || haystack.includes(q))
        && (statusFilter === "All" || status.toLowerCase() === statusFilter.toLowerCase())
        && (monthFilter === "All" || Number(r.month) === Number(monthFilter))
        && (yearFilter === "All" || Number(r.year) === Number(yearFilter))
        && (paymentMethodFilter === "All" || String(r.paymentMethod || "") === paymentMethodFilter)
        && (departmentFilter === "All" || recordDepartment === departmentFilter.toLowerCase())
        && (minAmount === "" || financials.netSalary >= Number(minAmount))
        && (maxAmount === "" || financials.netSalary <= Number(maxAmount));
    });
  }, [records, search, statusFilter, monthFilter, yearFilter, paymentMethodFilter, departmentFilter, minAmount, maxAmount]);

  const clearFilters = () => { setSearch(""); setStatusFilter("All"); setMonthFilter("All"); setYearFilter("All"); setPaymentMethodFilter("All"); setDepartmentFilter("All"); setMinAmount(""); setMaxAmount(""); };
  const hasFilters = Boolean(search || statusFilter !== "All" || monthFilter !== "All" || yearFilter !== "All" || paymentMethodFilter !== "All" || departmentFilter !== "All" || minAmount || maxAmount);

  const filteredAmount = useMemo(() => filteredRecords.reduce((sum, record) => sum + normalizePayrollFinancials(record).netSalary, 0), [filteredRecords]);
  const pendingAmount = useMemo(() => filteredRecords.filter((record) => !["paid", "completed"].includes(String(record.status || "Pending").toLowerCase())).reduce((sum, record) => sum + normalizePayrollFinancials(record).netSalary, 0), [filteredRecords]);

  const stats = useMemo(() => {
    const result = { total: records.length, paid: 0, pending: 0, processing: 0, cancelled: 0, amount: 0 };
    records.forEach((r) => {
      result.amount += normalizePayrollFinancials(r).netSalary;
      const status = String(r.status || "Pending").toLowerCase();
      if (status === "paid" || status === "completed") result.paid += 1;
      else if (status === "processing" || status === "processed") result.processing += 1;
      else if (["cancelled", "canceled", "rejected"].includes(status)) result.cancelled += 1;
      else result.pending += 1;
    });
    return result;
  }, [records]);

  if (loading) return <div className="flex min-h-[500px] items-center justify-center"><RefreshCw className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-950 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{ROLE_LABELS[role]} Payroll</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Payroll management.</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Review payroll records, salary totals and payment status from one place.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/payroll/generate" className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">Generate Payroll</Link>
            <Link to="/payroll/history" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900">Payroll History</Link>
            <button onClick={() => load(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900"><RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> Refresh</button>
          </div>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat title="Payroll Records" value={stats.total} icon={WalletCards} />
        <Stat title="Paid" value={stats.paid} icon={CheckCircle2} />
        <Stat title="Pending" value={stats.pending} icon={Clock3} />
        <Stat title="Processing" value={stats.processing} icon={RefreshCw} />
        <Stat title="Net Payroll" value={money(stats.amount)} icon={IndianRupee} />
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto_auto_auto_auto]">
          <div className="relative">
            <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee, email, code, transaction..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"><option>All</option><option>Pending</option><option>Processing</option><option>Paid</option><option>Failed</option></select>
          <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="All">All months</option>{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{new Date(2000,i,1).toLocaleString("en-US",{month:"long"})}</option>)}</select>
          <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="All">All years</option>{years.map((y)=><option key={y} value={y}>{y}</option>)}</select>
          <select value={paymentMethodFilter} onChange={(e) => setPaymentMethodFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="All">All payment methods</option>{paymentMethods.map((m)=><option key={m} value={m}>{m}</option>)}</select>
          <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="All">All departments</option>{departmentOptions.map((d)=><option key={d} value={d}>{d}</option>)}</select>
          <input type="number" min="0" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="Min ₹" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-950" />
          <input type="number" min="0" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder="Max ₹" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-950" />
          <button type="button" onClick={clearFilters} disabled={!hasFilters} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold disabled:opacity-40 dark:border-slate-700"><X size={16}/> Clear</button>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500"><SlidersHorizontal size={15}/> Showing {filteredRecords.length} of {records.length} payroll records • Live synced • Filtered total {money(filteredAmount)} • Payable {money(pendingAmount)}</div>
        <div className="flex items-center justify-between gap-4">
          <div><h2 className="text-lg font-bold">Recent payroll</h2><p className="text-sm text-slate-500 dark:text-slate-400">Latest generated payroll records.</p></div>
          <Link to="/payroll/history" className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">View all</Link>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-400 dark:border-slate-800"><th className="px-3 py-3">Employee</th><th className="px-3 py-3">Period</th><th className="px-3 py-3">Net Salary</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Created</th><th className="px-3 py-3">Action</th></tr></thead>
            <tbody>
              {filteredRecords.slice(0, 10).map((r) => <tr key={r.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800"><td className="px-3 py-3 font-semibold">{r.employeeName || r.employeeEmail || "Employee"}</td><td className="px-3 py-3">{r.month && r.year ? `${r.month}/${r.year}` : r.period || "—"}</td><td className="px-3 py-3 font-semibold">{money(normalizePayrollFinancials(r).netSalary)}</td><td className="px-3 py-3"><span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold dark:bg-slate-800">{r.status || "Pending"}</span></td><td className="px-3 py-3 text-slate-500">{date(r.createdAt)}</td><td className="px-3 py-3"><Link to={`/payroll/generate?id=${r.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"><Pencil size={13}/> Edit</Link></td></tr>)}
              {!filteredRecords.length && <tr><td colSpan="6" className="px-3 py-10 text-center text-slate-500">No payroll records yet. Generate the first payroll to see it here.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ title, value, icon: Icon }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800"><Icon size={18} /></span><span className="text-xl font-bold">{value}</span></div><p className="mt-3 text-xs font-semibold text-slate-500">{title}</p></div>;
}
