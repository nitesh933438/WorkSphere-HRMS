import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "../../config/firebase";
import { useDepartments, mergeDepartmentOptions } from "../../hooks/useDepartments";

const EMPLOYEES_COLLECTION = "employees";

function EmployeeReport() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const { departments } = useDepartments();

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError("");

      const snapshot = await getDocs(
        collection(
          db,
          EMPLOYEES_COLLECTION
        )
      );

      const data = snapshot.docs.map(
        (employeeDocument) => ({
          id: employeeDocument.id,
          ...employeeDocument.data(),
        })
      );

      data.sort((a, b) => {
        const nameA =
          String(
            a.name ||
              a.fullName ||
              `${a.firstName || ""} ${
                a.lastName || ""
              }`
          ).toLowerCase();

        const nameB =
          String(
            b.name ||
              b.fullName ||
              `${b.firstName || ""} ${
                b.lastName || ""
              }`
          ).toLowerCase();

        return nameA.localeCompare(nameB);
      });

      setEmployees(data.filter((employee) => employee.role === "employee" || employee.isEmployee === true));
    } catch (err) {
      console.error(
        "Employee report error:",
        err
      );

      const message =
        err?.message ||
        "Unable to load employee report.";

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const departmentOptions = useMemo(() => mergeDepartmentOptions(departments, employees), [departments, employees]);

  const filteredEmployees = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    if (!keyword) {
      return employees;
    }

    return employees.filter(
      (employee) => {
        const name = getEmployeeName(
          employee
        ).toLowerCase();

        const email =
          String(
            employee.email ||
              employee.employeeEmail ||
              ""
          ).toLowerCase();

        const department =
          String(
            employee.department ||
              employee.departmentName ||
              ""
          ).toLowerCase();

        const position =
          String(
            employee.position ||
              employee.jobTitle ||
              employee.designation ||
              ""
          ).toLowerCase();

        const matchesSearch = !keyword || name.includes(keyword) || email.includes(keyword) || department.includes(keyword) || position.includes(keyword);
        const matchesDepartment = departmentFilter === "All" || department === departmentFilter.toLowerCase();
        return matchesSearch && matchesDepartment;
      }
    );
  }, [employees, search, departmentFilter]);

  const statistics = useMemo(() => {
    let active = 0;
    let inactive = 0;

    const departments = new Set();

    employees.forEach((employee) => {
      const status = String(
        employee.status || "Active"
      ).toLowerCase();

      if (
        status === "active"
      ) {
        active += 1;
      } else {
        inactive += 1;
      }

      const department =
        employee.department ||
        employee.departmentName;

      if (department) {
        departments.add(
          String(department)
        );
      }
    });

    return {
      total: employees.length,
      active,
      inactive,
      departments: departments.size,
    };
  }, [employees]);

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

            <span className="text-slate-400">
              /
            </span>

            <span className="text-slate-500 dark:text-slate-400">
              Employees
            </span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            Employee Report
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Employee overview and workforce information.
          </p>
        </div>

        <button
          type="button"
          onClick={loadEmployees}
          disabled={loading}
          className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          {loading
            ? "Refreshing..."
            : "Refresh"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          <p className="font-semibold">
            Unable to load employee report
          </p>

          <p className="mt-1">
            {error}
          </p>
        </div>
      )}

      {/* Statistics */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          title="Total Employees"
          value={statistics.total}
        />

        <StatCard
          title="Active"
          value={statistics.active}
        />

        <StatCard
          title="Inactive"
          value={statistics.inactive}
        />

        <StatCard
          title="Departments"
          value={statistics.departments}
        />
      </div>

      {/* Search */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Search Employees
        </label>

        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          type="text"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Search by name, email, department or position..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
        <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white">
          <option value="All">All Departments</option>
          {departmentOptions.map((department) => <option key={department} value={department}>{department}</option>)}
        </select>
      </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-white">
            Employee Directory
          </h2>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {filteredEmployees.length} employee
            {filteredEmployees.length === 1
              ? ""
              : "s"} found.
          </p>
        </div>

        {loading ? (
          <LoadingTable />
        ) : filteredEmployees.length ===
          0 ? (
          <EmptyState
            hasSearch={Boolean(
              search.trim()
            )}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <TableHead>
                    Employee
                  </TableHead>

                  <TableHead>
                    Email
                  </TableHead>

                  <TableHead>
                    Department
                  </TableHead>

                  <TableHead>
                    Position
                  </TableHead>

                  <TableHead>
                    Status
                  </TableHead>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredEmployees.map(
                  (employee) => {
                    const status =
                      employee.status ||
                      "Active";

                    return (
                      <tr
                        key={
                          employee.id
                        }
                        className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400">
                              {getInitials(
                                employee
                              )}
                            </div>

                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {getEmployeeName(
                                  employee
                                )}
                              </p>

                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                ID:{" "}
                                {employee.employeeId ||
                                  employee.id}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          {employee.email ||
                            employee.employeeEmail ||
                            "—"}
                        </TableCell>

                        <TableCell>
                          {employee.department ||
                            employee.departmentName ||
                            "—"}
                        </TableCell>

                        <TableCell>
                          {employee.position ||
                            employee.jobTitle ||
                            employee.designation ||
                            "—"}
                        </TableCell>

                        <TableCell>
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              String(
                                status
                              ).toLowerCase() ===
                              "active"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {status}
                          </span>
                        </TableCell>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function getEmployeeName(
  employee
) {
  return (
    employee.name ||
    employee.fullName ||
    [
      employee.firstName,
      employee.lastName,
    ]
      .filter(Boolean)
      .join(" ") ||
    "Unnamed Employee"
  );
}

function getInitials(
  employee
) {
  const name =
    getEmployeeName(
      employee
    );

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (word) =>
        word[0]
    )
    .join("")
    .toUpperCase();
}

function StatCard({
  title,
  value,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function TableHead({
  children,
}) {
  return (
    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {children}
    </th>
  );
}

function TableCell({
  children,
}) {
  return (
    <td className="px-5 py-4 text-sm text-slate-700 dark:text-slate-300">
      {children}
    </td>
  );
}

function LoadingTable() {
  return (
    <div className="space-y-4 p-6">
      {[1, 2, 3, 4, 5].map(
        (item) => (
          <div
            key={item}
            className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
          />
        )
      )}
    </div>
  );
}

function EmptyState({
  hasSearch,
}) {
  return (
    <div className="px-6 py-16 text-center">
      <div className="text-4xl">
        👥
      </div>

      <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
        {hasSearch
          ? "No employees found"
          : "No employees"}
      </h3>

      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        {hasSearch
          ? "Try a different search term."
          : "Employee records will appear here."}
      </p>
    </div>
  );
}

export default EmployeeReport;