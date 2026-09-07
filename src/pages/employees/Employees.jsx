import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  Eye,
  Filter,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../constants/roleConstants";
import { subscribeDepartments } from "../../services/departmentService";

import {
  deleteEmployee,
  getEmployees,
  subscribeEmployees,
} from "../../services/employeeService";

function Employees() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const canManageEmployees = role === ROLES.ADMIN || role === ROLES.HR;

  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [departments, setDepartments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [deletingId, setDeletingId] = useState(null);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  const loadEmployees = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");
      const data = await getEmployees();
      setEmployees(
        (Array.isArray(data) ? data : []).filter(
          (employee) => employee.role === "employee" || employee.isEmployee === true
        )
      );
    } catch (err) {
      console.error("Error loading employees:", err);

      if (err?.code === "permission-denied") {
        setError(
          "You do not have permission to view employees. Check Firestore security rules."
        );
      } else {
        setError(
          err?.message ||
            "Unable to load employees right now. Please try again."
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadEmployees();
    const unsubscribeEmployees = subscribeEmployees((data) => {
      setEmployees((Array.isArray(data) ? data : []).filter((employee) => employee.role === "employee" || employee.isEmployee === true));
    });
    const unsubscribeDepartments = subscribeDepartments(setDepartments);
    return () => { unsubscribeEmployees?.(); unsubscribeDepartments?.(); };
  }, []);

  useEffect(() => {
    const close = () => setOpenMenuId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const departmentOptions = useMemo(() => {
    const employeeValues = employees.map((employee) => employee.department?.trim()).filter(Boolean);
    const masterValues = departments.map((department) => department.name?.trim()).filter(Boolean);
    return ["All", ...Array.from(new Set([...employeeValues, ...masterValues])).sort()];
  }, [employees, departments]);

  const filteredEmployees = useMemo(() => {
    const value = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesSearch =
        !value ||
        [
          employee.fullName,
          employee.email,
          employee.employeeCode,
          employee.department,
          employee.designation,
          employee.phone,
        ].some((item) =>
          String(item || "").toLowerCase().includes(value)
        );

      const matchesStatus =
        statusFilter === "All" || employee.status === statusFilter;

      const matchesDepartment =
        departmentFilter === "All" ||
        employee.department === departmentFilter;

      return matchesSearch && matchesStatus && matchesDepartment;
    });
  }, [employees, search, statusFilter, departmentFilter]);

  const activeCount = employees.filter(
    (employee) => employee.status === "Active"
  ).length;

  const inactiveCount = employees.filter(
    (employee) => employee.status === "Inactive"
  ).length;

  const onLeaveCount = employees.filter(
    (employee) => employee.status === "On Leave"
  ).length;

  const departmentCount = new Set(
    employees.map((employee) => employee.department).filter(Boolean)
  ).size;

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setDepartmentFilter("All");
  };

  const handleDelete = async () => {
    if (!employeeToDelete?.id) return;

    try {
      setDeletingId(employeeToDelete.id);
      setError("");

      await deleteEmployee(employeeToDelete.id);

      setEmployees((previous) =>
        previous.filter((employee) => employee.id !== employeeToDelete.id)
      );
      setEmployeeToDelete(null);
    } catch (err) {
      console.error("Error deleting employee:", err);

      if (err?.code === "permission-denied") {
        setError(
          "You do not have permission to delete this employee."
        );
      } else {
        setError(
          err?.message ||
            "Unable to delete employee right now. Please try again."
        );
      }
    } finally {
      setDeletingId(null);
    }
  };

  const goToEmployee = (id) => {
    setOpenMenuId(null);
    navigate(`/employees/${id}`);
  };

  const editEmployee = (id) => {
    setOpenMenuId(null);
    navigate(`/employees/${id}/edit`);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-slate-100 blur-3xl dark:bg-slate-800" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-slate-100 blur-3xl dark:bg-slate-800" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Users size={14} />
              Employee Management
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Your people, organized.
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Manage employee profiles, departments, roles and workforce
              status from one clean workspace.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={() => loadEmployees(true)}
              disabled={refreshing}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {refreshing ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <RefreshCw size={17} />
              )}
              Refresh
            </button>

            {canManageEmployees && (
              <Link
                to="/employees/add"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
              >
                <Plus size={17} />
                Add Employee
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/30">
          <AlertCircle
            size={19}
            className="mt-0.5 shrink-0 text-red-600 dark:text-red-400"
          />
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            {error}
          </p>
          <button
            type="button"
            onClick={() => setError("")}
            className="ml-auto rounded-lg p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-950/50"
            aria-label="Dismiss error"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          icon={Users}
          label="Total Employees"
          value={employees.length}
          helper="All records"
        />
        <SummaryCard
          icon={UserCheck}
          label="Active"
          value={activeCount}
          helper="Currently working"
          tone="success"
        />
        <SummaryCard
          icon={BriefcaseBusiness}
          label="On Leave"
          value={onLeaveCount}
          helper="Temporary absence"
          tone="warning"
        />
        <SummaryCard
          icon={Building2}
          label="Departments"
          value={departmentCount}
          helper={`${inactiveCount} inactive`}
        />
      </div>

      {/* Main */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Toolbar */}
        <div className="border-b border-slate-200 p-4 dark:border-slate-800 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-950 dark:text-white">
                Employee Directory
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {filteredEmployees.length} of {employees.length} employees
                shown
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 sm:w-72">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, email, role..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-900/5 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-slate-500 dark:focus:bg-slate-950"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="relative">
                <Filter
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 sm:w-40"
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="On Leave">On Leave</option>
                </select>
                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>

              <div className="relative">
                <Building2
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={departmentFilter}
                  onChange={(event) =>
                    setDepartmentFilter(event.target.value)
                  }
                  className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 sm:w-48"
                >
                  {departmentOptions.map((department) => (
                    <option key={department} value={department}>
                      {department === "All"
                        ? "All Departments"
                        : department}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>
          </div>

          {(search ||
            statusFilter !== "All" ||
            departmentFilter !== "All") && (
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Filters are active
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-semibold text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex min-h-80 flex-col items-center justify-center px-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
              <Loader2
                size={24}
                className="animate-spin text-slate-500"
              />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Loading employees...
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Preparing your employee directory
            </p>
          </div>
        )}

        {/* Empty */}
        {!loading && filteredEmployees.length === 0 && (
          <div className="flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <UserRound size={27} />
            </div>

            <h3 className="mt-5 text-base font-bold text-slate-900 dark:text-white">
              {employees.length === 0
                ? "Your directory is empty"
                : "No matching employees"}
            </h3>

            <p className="mt-1 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
              {employees.length === 0
                ? "Add your first employee to start building your workforce directory."
                : "Try another search term or remove one of the active filters."}
            </p>

            {employees.length === 0 && canManageEmployees ? (
              <Link
                to="/employees/add"
                className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
              >
                <Plus size={16} />
                Add Employee
              </Link>
            ) : (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                <X size={16} />
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* Desktop */}
        {!loading && filteredEmployees.length > 0 && (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[980px] text-left">
                <thead className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/40">
                  <tr>
                    {[
                      "Employee",
                      "Employee ID",
                      "Department",
                      "Role",
                      "Status",
                      "Actions",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className={`px-5 py-4 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 ${
                          heading === "Actions" ? "text-right" : ""
                        }`}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredEmployees.map((employee) => (
                    <EmployeeRow
                      key={employee.id}
                      employee={employee}
                      deleting={deletingId === employee.id}
                      onView={() => goToEmployee(employee.id)}
                      onEdit={canManageEmployees ? () => editEmployee(employee.id) : null}
                      onDelete={canManageEmployees ? () => {
                        setOpenMenuId(null);
                        setEmployeeToDelete(employee);
                      } : null}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tablet + Mobile cards */}
            <div className="grid divide-y divide-slate-100 dark:divide-slate-800 lg:hidden">
              {filteredEmployees.map((employee) => (
                <EmployeeCard
                  key={employee.id}
                  employee={employee}
                  deleting={deletingId === employee.id}
                  menuOpen={openMenuId === employee.id}
                  onToggleMenu={(event) => {
                    event.stopPropagation();
                    setOpenMenuId((current) =>
                      current === employee.id ? null : employee.id
                    );
                  }}
                  onView={() => goToEmployee(employee.id)}
                  onEdit={canManageEmployees ? () => editEmployee(employee.id) : null}
                  onDelete={canManageEmployees ? () => {
                    setOpenMenuId(null);
                    setEmployeeToDelete(employee);
                  } : null}
                />
              ))}
            </div>
          </>
        )}

        {!loading && filteredEmployees.length > 0 && (
          <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">
            <p className="text-xs text-slate-400">
              Showing{" "}
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                {filteredEmployees.length}
              </span>{" "}
              employee{filteredEmployees.length === 1 ? "" : "s"}
            </p>
          </div>
        )}
      </section>

      {employeeToDelete && (
        <DeleteModal
          employee={employeeToDelete}
          deleting={deletingId === employeeToDelete.id}
          onCancel={() => setEmployeeToDelete(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, helper, tone = "default" }) {
  const iconClass =
    tone === "success"
      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
      : tone === "warning"
      ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            {value}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon size={18} />
        </div>
      </div>

      <p className="mt-2 text-[11px] text-slate-400">{helper}</p>
    </div>
  );
}

function EmployeeRow({ employee, onView, onEdit, onDelete, deleting }) {
  const initial = getInitial(employee.fullName);

  return (
    <tr className="group transition hover:bg-slate-50/80 dark:hover:bg-slate-800/30">
      <td className="px-5 py-4">
        <div className="flex min-w-[230px] items-center gap-3">
          <Avatar
            name={employee.fullName}
            initial={initial}
            photoURL={employee.photoURL || employee.photoUrl}
          />

          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
              {employee.fullName || "Unnamed Employee"}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
              {employee.email || "No email"}
            </p>
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {employee.employeeCode || "—"}
        </span>
      </td>

      <td className="px-5 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">
        {employee.department || "—"}
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
          <BriefcaseBusiness size={14} className="text-slate-400" />
          <span>{employee.designation || "—"}</span>
        </div>
      </td>

      <td className="px-5 py-4">
        <StatusBadge status={employee.status} />
      </td>

      <td className="px-5 py-4">
        <ActionButtons
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          deleting={deleting}
        />
      </td>
    </tr>
  );
}

function EmployeeCard({
  employee,
  deleting,
  menuOpen,
  onToggleMenu,
  onView,
  onEdit,
  onDelete,
}) {
  return (
    <article className="p-4 sm:p-5">
      <div className="flex items-start gap-3 sm:gap-4">
        <Avatar
          name={employee.fullName}
          initial={getInitial(employee.fullName)}
          photoURL={employee.photoURL || employee.photoUrl}
          large
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-slate-950 dark:text-white sm:text-base">
                {employee.fullName || "Unnamed Employee"}
              </h3>
              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                {employee.email || "No email"}
              </p>
            </div>

            <div className="relative shrink-0">
              <button
                type="button"
                onClick={onToggleMenu}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                aria-label="Employee actions"
              >
                <MoreHorizontal size={18} />
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 top-10 z-20 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={onView}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <Eye size={14} /> View
                  </button>
                  {onEdit && <button
                    type="button"
                    onClick={onEdit}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <Pencil size={14} /> Edit
                  </button>}
                  {onDelete && <button
                    type="button"
                    onClick={onDelete}
                    disabled={deleting}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/30"
                  >
                    {deleting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                    Delete
                  </button>}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <InfoPill label="Employee ID" value={employee.employeeCode} />
            <InfoPill label="Department" value={employee.department} />
            <InfoPill
              label="Role"
              value={employee.designation}
              className="col-span-2 sm:col-span-1"
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <StatusBadge status={employee.status} />

            <button
              type="button"
              onClick={onView}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <Eye size={14} />
              View Profile
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function InfoPill({ label, value, className = "" }) {
  return (
    <div
      className={`min-w-0 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60 ${className}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
        {value || "—"}
      </p>
    </div>
  );
}

function Avatar({ name, initial, photoURL, large = false }) {
  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={name || "Employee"}
        className={`shrink-0 rounded-2xl object-cover ring-2 ring-white dark:ring-slate-900 ${
          large ? "h-12 w-12 sm:h-14 sm:w-14" : "h-11 w-11"
        }`}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-2xl bg-slate-100 font-bold text-slate-700 ring-2 ring-white dark:bg-slate-800 dark:text-white dark:ring-slate-900 ${
        large ? "h-12 w-12 text-base sm:h-14 sm:w-14" : "h-11 w-11 text-sm"
      }`}
    >
      {initial}
    </div>
  );
}

function getInitial(name) {
  const value = String(name || "").trim();
  return value ? value.charAt(0).toUpperCase() : "U";
}

function StatusBadge({ status }) {
  const styles = {
    Active:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400",
    Inactive:
      "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400",
    "On Leave":
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-400",
  };

  const dotStyles = {
    Active: "bg-emerald-500",
    Inactive: "bg-slate-400",
    "On Leave": "bg-amber-500",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
        styles[status] || styles.Inactive
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          dotStyles[status] || dotStyles.Inactive
        }`}
      />
      {status || "Unknown"}
    </span>
  );
}

function ActionButtons({ onView, onEdit, onDelete, deleting }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <IconButton
        label="View employee"
        onClick={onView}
        icon={<Eye size={16} />}
      />
      {onEdit && (
        <IconButton
          label="Edit employee"
          onClick={onEdit}
          icon={<Pencil size={16} />}
        />
      )}
      {onDelete && (
        <IconButton
          label="Delete employee"
          onClick={onDelete}
          disabled={deleting}
          danger
          icon={
            deleting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Trash2 size={16} />
            )
          }
        />
      )}
    </div>
  );
}

function IconButton({ label, onClick, icon, danger = false, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`rounded-lg p-2 transition disabled:cursor-not-allowed disabled:opacity-50 ${
        danger
          ? "text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
          : "text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
      }`}
    >
      {icon}
    </button>
  );
}

function DeleteModal({ employee, deleting, onCancel, onConfirm }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !deleting) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-employee-title"
        className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="p-6 sm:p-7">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
            <Trash2 size={21} />
          </div>

          <h3
            id="delete-employee-title"
            className="mt-5 text-lg font-bold text-slate-950 dark:text-white"
          >
            Delete employee?
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            This will permanently remove{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {employee.fullName || "this employee"}
            </span>{" "}
            from your employee directory. This action cannot be undone.
          </p>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={deleting}
              className="min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={deleting}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={17} />
                  Delete Employee
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Employees;
