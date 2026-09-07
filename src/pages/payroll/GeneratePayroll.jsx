import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Save,
  UserRound,
  Wallet,
} from "lucide-react";
import toast from "react-hot-toast";

import { subscribeEmployees } from "../../services/employeeService";
import { useDepartments, mergeDepartmentOptions } from "../../hooks/useDepartments";
import {
  createPayroll,
  calculateSalaryBreakdown,
  getEmployeeSalary,
  createSalary,
  updateSalary,
  getPayrollById,
  updatePayroll,
} from "../../services/payrollService";
import { applyAttendanceToSalary, calculateAttendancePayroll } from "../../services/payrollAutomationService";

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const currentDate = new Date();

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const formatCurrency = (value) => {
  const amount = Number(value) || 0;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
};

const getEmployeeId = (employee) => {
  return (
    employee?.id ||
    employee?.employeeId ||
    employee?.uid ||
    ""
  );
};

const getEmployeeName = (employee) => {
  if (employee?.name) {
    return employee.name;
  }

  const fullName = [
    employee?.firstName,
    employee?.middleName,
    employee?.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    employee?.displayName ||
    "Unnamed Employee"
  );
};

const getEmployeeEmail = (employee) => {
  return (
    employee?.email ||
    employee?.employeeEmail ||
    ""
  );
};

const getEmployeeSearchText = (employee) => {
  return [
    getEmployeeName(employee),
    getEmployeeEmail(employee),
    getEmployeeId(employee),
    employee?.department,
    employee?.designation,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
};

/*
|--------------------------------------------------------------------------
| INPUT COMPONENT
|--------------------------------------------------------------------------
*/

const InputField = ({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  min,
  max,
  step,
  disabled = false,
  required = false,
}) => {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-800 dark:disabled:bg-slate-800"
      />
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| SELECT COMPONENT
|--------------------------------------------------------------------------
*/

const SelectField = ({
  label,
  value,
  onChange,
  children,
  disabled = false,
  required = false,
}) => {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-800 dark:disabled:bg-slate-800"
      >
        {children}
      </select>
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| PAGE
|--------------------------------------------------------------------------
*/

const GeneratePayroll = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editPayrollId = searchParams.get("id") || "";
  const isEditMode = Boolean(editPayrollId);

  const [employees, setEmployees] = useState([]);
  const [employeeSearch, setEmployeeSearch] =
    useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const { departments } = useDepartments();

  const [loadingEmployees, setLoadingEmployees] =
    useState(true);

  const [loadingSalary, setLoadingSalary] =
    useState(false);

  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(isEditMode);

  const [selectedEmployeeId, setSelectedEmployeeId] =
    useState("");

  const [selectedEmployee, setSelectedEmployee] =
    useState(null);

  const [salary, setSalary] = useState(null);
  const [attendancePayroll, setAttendancePayroll] = useState(null);
  const [loadingAttendancePayroll, setLoadingAttendancePayroll] = useState(false);

  const [form, setForm] = useState({
    month: String(
      currentDate.getMonth() + 1
    ),
    year: String(
      currentDate.getFullYear()
    ),
    basicSalary: "",
    allowances: "",
    deductions: "",
    allowanceDetails: {},
    deductionDetails: {},
    currency: "INR",
    status: "Pending",
    paymentDate: "",
    paymentMethod: "",
    transactionId: "",
    notes: "",
  });

  const [error, setError] = useState("");

  /*
  |--------------------------------------------------------------------------
  | LOAD EMPLOYEES
  |--------------------------------------------------------------------------
  */

  // Keep the employee selector live. When Admin/HR adds a new employee in
  // another tab (or another device), Firestore pushes the new record here
  // immediately; no page refresh is required.
  useEffect(() => {
    setLoadingEmployees(true);
    setError("");

    let firstSnapshot = true;

    const unsubscribe = subscribeEmployees(
      (employeeList) => {
        const onlyEmployees = (Array.isArray(employeeList) ? employeeList : [])
          .filter((employee) => employee.role === "employee" || employee.isEmployee === true)
          .sort((a, b) =>
            getEmployeeName(a).localeCompare(getEmployeeName(b), undefined, {
              sensitivity: "base",
            })
          );

        setEmployees(onlyEmployees);
        setLoadingEmployees(false);

        // If the currently selected employee was removed or converted to a
        // management role, clear the payroll selection safely.
        setSelectedEmployeeId((currentId) => {
          if (!currentId) return currentId;
          const stillExists = onlyEmployees.some(
            (employee) => String(getEmployeeId(employee)) === String(currentId)
          );
          return stillExists ? currentId : "";
        });

        setSelectedEmployee((currentEmployee) => {
          if (!currentEmployee) return currentEmployee;
          return (
            onlyEmployees.find(
              (employee) =>
                String(getEmployeeId(employee)) ===
                String(getEmployeeId(currentEmployee))
            ) || null
          );
        });

        firstSnapshot = false;
      },
      (loadError) => {
        console.error("Load employees error:", loadError);
        setLoadingEmployees(false);
        const message =
          loadError?.message ||
          "Unable to load employees.";
        setError(message);
        if (firstSnapshot) toast.error(message);
      }
    );

    return unsubscribe;
  }, []);

  /*
  |--------------------------------------------------------------------------
  | LOAD PAYROLL FOR EDITING
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!editPayrollId || !employees.length) {
      if (!editPayrollId) setLoadingEdit(false);
      return;
    }

    let cancelled = false;

    const loadEditPayroll = async () => {
      try {
        setLoadingEdit(true);
        const record = await getPayrollById(editPayrollId);
        if (!record || cancelled) {
          if (!cancelled) {
            setError("Payroll record not found.");
            toast.error("Payroll record not found.");
            setLoadingEdit(false);
          }
          return;
        }

        const employee = employees.find((item) =>
          String(getEmployeeId(item)) === String(record.employeeDocId || "") ||
          String(item.employeeCode || "").toUpperCase() === String(record.employeeCode || record.employeeId || "").toUpperCase() ||
          String(item.email || "").toLowerCase() === String(record.employeeEmail || "").toLowerCase()
        );

        if (!employee) {
          setError("The employee linked to this payroll is no longer available.");
          toast.error("Linked employee not found.");
          setLoadingEdit(false);
          return;
        }

        setSelectedEmployee(employee);
        setSelectedEmployeeId(getEmployeeId(employee));
        setEmployeeSearch("");
        setForm({
          month: String(record.month || currentDate.getMonth() + 1),
          year: String(record.year || currentDate.getFullYear()),
          basicSalary: record.basicSalary ?? "",
          allowances: record.allowances ?? "",
          deductions: record.fixedDeductions ?? Math.max(0, Number(record.deductions || 0) - Number(record.attendanceDeduction || 0)),
          allowanceDetails: record.allowanceDetails || {},
          deductionDetails: record.deductionDetails || {},
          currency: record.currency || "INR",
          status: record.status || "Pending",
          paymentDate: record.paymentDate || "",
          paymentMethod: record.paymentMethod || "",
          transactionId: record.transactionId || "",
          notes: record.notes || "",
        });
        setSalary(null);
        setAttendancePayroll(null);
        setError("");
      } catch (loadError) {
        console.error("Load payroll for edit error:", loadError);
        if (!cancelled) {
          const message = loadError?.message || "Unable to load payroll for editing.";
          setError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) setLoadingEdit(false);
      }
    };

    loadEditPayroll();
    return () => { cancelled = true; };
  }, [editPayrollId, employees]);

  /*
  |--------------------------------------------------------------------------
  | FILTER EMPLOYEES
  |--------------------------------------------------------------------------
  */

  const departmentOptions = useMemo(() => mergeDepartmentOptions(departments, employees), [departments, employees]);

  const filteredEmployees = useMemo(() => {
    const search =
      employeeSearch
        .trim()
        .toLowerCase();

    return employees.filter((employee) => {
      const matchesSearch = !search || getEmployeeSearchText(employee).includes(search);
      const matchesDepartment = departmentFilter === "All" || String(employee?.department || "").toLowerCase() === departmentFilter.toLowerCase();
      return matchesSearch && matchesDepartment;
    });
  }, [
    employees,
    employeeSearch,
    departmentFilter,
  ]);

  /*
  |--------------------------------------------------------------------------
  | SELECT EMPLOYEE
  |--------------------------------------------------------------------------
  */

  const handleEmployeeChange = async (
    event
  ) => {
    const employeeId =
      event.target.value;

    setSelectedEmployeeId(
      employeeId
    );

    setSalary(null);
    setError("");

    const employee =
      employees.find(
        (item) =>
          String(
            getEmployeeId(item)
          ) === String(employeeId)
      );

    setSelectedEmployee(
      employee || null
    );

    if (!employeeId) {
      setForm((previous) => ({
        ...previous,
        basicSalary: "",
        allowances: "",
        deductions: "",
      }));

      return;
    }

    try {
      setLoadingSalary(true);

      const salaryData =
        await getEmployeeSalary(
          employee || employeeId
        );

      setSalary(
        salaryData || null
      );

      if (salaryData) {
        setForm((previous) => ({
          ...previous,
          basicSalary:
            salaryData.basicSalary ??
            "",
          allowances:
            salaryData.allowances ??
            "",
          deductions:
            salaryData.deductions ??
            "",
          currency:
            salaryData.currency ||
            "INR",
        }));

        toast.success(
          "Salary structure loaded."
        );
      } else {
        setForm((previous) => ({
          ...previous,
          basicSalary: "",
          allowances: "",
          deductions: "",
        }));

        toast("No saved salary structure found yet. Enter the salary below; it will be saved automatically when payroll is generated.");
      }
    } catch (salaryError) {
      console.error(
        "Load employee salary error:",
        salaryError
      );

      const message =
        salaryError?.message ||
        "Unable to load employee salary.";

      setError(message);
      toast.error(message);
    } finally {
      setLoadingSalary(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | FORM CHANGE
  |--------------------------------------------------------------------------
  */

  const updateForm = (
    field,
    value
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  /*
  |--------------------------------------------------------------------------
  | AUTOMATIC ATTENDANCE PAYROLL
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    let cancelled = false;
    const loadAttendancePayroll = async () => {
      if (!selectedEmployee || !form.month || !form.year) {
        setAttendancePayroll(null);
        return;
      }
      try {
        setLoadingAttendancePayroll(true);
        const summary = await calculateAttendancePayroll({
          employee: selectedEmployee,
          month: Number(form.month),
          year: Number(form.year),
        });
        if (!cancelled) setAttendancePayroll(summary);
      } catch (attendanceError) {
        console.warn("Attendance payroll calculation unavailable:", attendanceError);
        if (!cancelled) setAttendancePayroll(null);
      } finally {
        if (!cancelled) setLoadingAttendancePayroll(false);
      }
    };
    loadAttendancePayroll();
    return () => { cancelled = true; };
  }, [selectedEmployee, form.month, form.year]);

  /*
  |--------------------------------------------------------------------------
  | BREAKDOWN
  |--------------------------------------------------------------------------
  */

  const breakdown = useMemo(() => {
    try {
      if (attendancePayroll) {
        return applyAttendanceToSalary({
          salary: {
            basicSalary: form.basicSalary,
            allowances: form.allowances,
            deductions: form.deductions,
          },
          attendance: attendancePayroll,
        });
      }
      return { ...calculateSalaryBreakdown({ basicSalary: form.basicSalary, allowances: form.allowances, deductions: form.deductions }), attendanceDeduction: 0, overtimePay: 0, fixedDeductions: Number(form.deductions) || 0 };
    } catch {
      return { basicSalary: 0, allowances: 0, grossSalary: 0, deductions: 0, netSalary: 0, attendanceDeduction: 0, overtimePay: 0, fixedDeductions: 0 };
    }
  }, [form.basicSalary, form.allowances, form.deductions, attendancePayroll]);

  /*
  |--------------------------------------------------------------------------
  | VALIDATION
  |--------------------------------------------------------------------------
  */

  const validateForm = () => {
    if (!selectedEmployeeId) {
      return "Please select an employee.";
    }

    const month =
      Number(form.month);

    const year =
      Number(form.year);

    if (
      month < 1 ||
      month > 12
    ) {
      return "Please select a valid payroll month.";
    }

    if (
      year < 2000 ||
      year > 3000
    ) {
      return "Please enter a valid payroll year.";
    }

    if (
      Number(form.basicSalary) < 0
    ) {
      return "Basic salary cannot be negative.";
    }

    if (
      Number(form.allowances) < 0
    ) {
      return "Allowances cannot be negative.";
    }

    if (
      Number(form.deductions) < 0
    ) {
      return "Deductions cannot be negative.";
    }

    if (
      breakdown.netSalary < 0
    ) {
      return "Net salary cannot be negative.";
    }

    if (
      form.paymentDate
    ) {
      const paymentDate =
        new Date(
          form.paymentDate
        );

      if (
        Number.isNaN(
          paymentDate.getTime()
        )
      ) {
        return "Please enter a valid payment date.";
      }
    }

    return "";
  };

  /*
  |--------------------------------------------------------------------------
  | SUBMIT
  |--------------------------------------------------------------------------
  */

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    const validationError =
      validateForm();

    if (validationError) {
      setError(
        validationError
      );
      toast.error(
        validationError
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      const employee =
        selectedEmployee;

      const employeeName =
        getEmployeeName(employee);

      const employeeEmail =
        getEmployeeEmail(employee);

      // Save the employee salary structure along with the first payroll setup.
      // Future months will load these components automatically.
      const salaryPayload = {
        employeeId: selectedEmployee?.employeeCode || selectedEmployee?.employeeId || selectedEmployeeId,
        employeeCode: selectedEmployee?.employeeCode || selectedEmployee?.employeeId || selectedEmployeeId,
        employeeDocId: selectedEmployee?.id || selectedEmployeeId,
        userId: selectedEmployee?.uid || selectedEmployee?.userId || "",
        employeeName,
        employeeEmail,
        basicSalary: Number(form.basicSalary) || 0,
        allowances: Number(form.allowances) || 0,
        deductions: Number(form.deductions) || 0,
        currency: form.currency || "INR",
        paymentFrequency: "Monthly",
        status: "Active",
      };

      if (salary?.id) await updateSalary(salary.id, salaryPayload);
      else await createSalary(salaryPayload);

      const payrollData = {
        employeeId: selectedEmployee?.employeeCode || selectedEmployee?.employeeId || selectedEmployeeId,
        employeeCode: selectedEmployee?.employeeCode || selectedEmployee?.employeeId || selectedEmployeeId,
        employeeDocId: selectedEmployeeId,

        employeeName,

        employeeEmail,

        month:
          Number(form.month),

        year:
          Number(form.year),

        basicSalary:
          Number(form.basicSalary) ||
          0,

        allowances:
          Number(form.allowances) ||
          0,

        deductions: breakdown.deductions,
        fixedDeductions: breakdown.fixedDeductions ?? (Number(form.deductions) || 0),
        attendanceDeduction: breakdown.attendanceDeduction || 0,
        overtimePay: breakdown.overtimePay || 0,
        attendanceSummary: attendancePayroll || null,

        allowanceDetails:
          form.allowanceDetails,

        deductionDetails:
          form.deductionDetails,

        currency:
          form.currency || "INR",

        status:
          form.status || "Pending",

        paymentDate:
          form.paymentDate || "",

        paymentMethod:
          form.paymentMethod || "",

        transactionId:
          form.transactionId || "",

        notes:
          form.notes || "",
      };

      const savedPayroll = isEditMode
        ? await updatePayroll(editPayrollId, payrollData)
        : await createPayroll(payrollData);

      toast.success(
        isEditMode
          ? "Payroll updated successfully."
          : "Payroll generated successfully."
      );

      navigate(
        `/payroll/history`,
        {
          replace: true,
          state: {
            generatedPayroll:
              savedPayroll,
          },
        }
      );
    } catch (submitError) {
      console.error(
        "Generate payroll error:",
        submitError
      );

      const message =
        submitError?.message ||
        "Unable to generate payroll.";

      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | RESET
  |--------------------------------------------------------------------------
  */

  const handleReset = () => {
    setSelectedEmployeeId("");
    setSelectedEmployee(null);
    setSalary(null);
    setEmployeeSearch("");
    setError("");

    setForm({
      month: String(
        currentDate.getMonth() + 1
      ),
      year: String(
        currentDate.getFullYear()
      ),
      basicSalary: "",
      allowances: "",
      deductions: "",
      allowanceDetails: {},
      deductionDetails: {},
      currency: "INR",
      status: "Pending",
      paymentDate: "",
      paymentMethod: "",
      transactionId: "",
      notes: "",
    });
  };

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-full bg-slate-50 p-4 dark:bg-slate-950 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Wallet size={16} />
              <span>Payroll</span>
            </div>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              {isEditMode ? "Edit Payroll" : "Generate Payroll"}
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {isEditMode ? "Update payment, salary and payroll details for this employee." : "Create a monthly payroll record for an employee."}
            </p>
          </div>

          <Link
            to="/payroll"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeft size={16} />
            Back to Payroll
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >

          {/* Employee + Period */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

            <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <UserRound
                  size={18}
                  className="text-slate-500"
                />

                <div>
                  <h2 className="font-semibold text-slate-900 dark:text-white">
                    Employee & Payroll Period
                  </h2>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Select the employee and payroll month.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-2">

              {/* Employee */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Employee
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <input
                  value={employeeSearch}
                  onChange={(event) =>
                    setEmployeeSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search by name, email, code, department..."
                  disabled={
                    loadingEmployees
                  }
                  className="mb-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-slate-800"
                />

<div className="mb-2">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">Department filter</label>
                  <select value={departmentFilter} onChange={(event) => { setDepartmentFilter(event.target.value); setSelectedEmployeeId(""); setSelectedEmployee(null); setSalary(null); }} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                    <option value="All">All Departments</option>
                    {departmentOptions.map((department) => <option key={department} value={department}>{department}</option>)}
                  </select>
                </div>

                <select
                  value={
                    selectedEmployeeId
                  }
                  onChange={
                    handleEmployeeChange
                  }
                  disabled={
                    loadingEmployees ||
                    loadingSalary
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-slate-800"
                >
                  <option value="">
                    {loadingEmployees
                      ? "Loading employees..."
                      : "Select employee"}
                  </option>

                  {filteredEmployees.map(
                    (employee) => {
                      const id =
                        getEmployeeId(
                          employee
                        );

                      return (
                        <option
                          key={id}
                          value={id}
                        >
                          {getEmployeeName(
                            employee
                          )}
                          {getEmployeeEmail(
                            employee
                          )
                            ? ` — ${getEmployeeEmail(
                                employee
                              )}`
                            : ""}
                        </option>
                      );
                    }
                  )}
                </select>

                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {employeeSearch.trim()
                    ? `${filteredEmployees.length} employee${filteredEmployees.length === 1 ? "" : "s"} found`
                    : `${employees.length} active employee${employees.length === 1 ? "" : "s"} available`}
                  {" • Live synced"}
                </p>

                {selectedEmployee && (
                  <div className="mt-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {getEmployeeName(
                        selectedEmployee
                      )}
                    </p>

                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {getEmployeeEmail(
                        selectedEmployee
                      ) || "No email available"}
                    </p>

                    {selectedEmployee?.department && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Department:{" "}
                        {
                          selectedEmployee.department
                        }
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Period */}
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Month"
                  value={form.month}
                  onChange={(event) =>
                    updateForm(
                      "month",
                      event.target.value
                    )
                  }
                  required
                >
                  {MONTHS.map(
                    (month) => (
                      <option
                        key={month.value}
                        value={
                          month.value
                        }
                      >
                        {month.label}
                      </option>
                    )
                  )}
                </SelectField>

                <InputField
                  label="Year"
                  type="number"
                  value={form.year}
                  onChange={(event) =>
                    updateForm(
                      "year",
                      event.target.value
                    )
                  }
                  min="2000"
                  max="3000"
                  required
                />
              </div>
            </div>
          </section>

          {/* Salary */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

            <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Banknote
                  size={18}
                  className="text-slate-500"
                />

                <div>
                  <h2 className="font-semibold text-slate-900 dark:text-white">
                    Salary Details
                  </h2>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Review and adjust salary components before generating payroll.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5">

              {loadingSalary && (
                <div className="mb-5 flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                  Loading salary structure...
                </div>
              )}

              {!loadingSalary &&
                selectedEmployeeId &&
                !salary && (
                  <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-500/10 dark:text-amber-300">
                    No saved salary structure was found. You can enter the salary manually.
                  </div>
                )}

              <div className="grid gap-5 md:grid-cols-3">

                <InputField
                  label="Basic Salary"
                  type="number"
                  value={
                    form.basicSalary
                  }
                  onChange={(event) =>
                    updateForm(
                      "basicSalary",
                      event.target.value
                    )
                  }
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  required
                />

                <InputField
                  label="Allowances"
                  type="number"
                  value={
                    form.allowances
                  }
                  onChange={(event) =>
                    updateForm(
                      "allowances",
                      event.target.value
                    )
                  }
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />

                <InputField
                  label="Other / Fixed Deductions"
                  type="number"
                  value={
                    form.deductions
                  }
                  onChange={(event) =>
                    updateForm(
                      "deductions",
                      event.target.value
                    )
                  }
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>

              {selectedEmployeeId && (
                <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">Automatic attendance calculation</p>
                      <p className="mt-1 text-xs text-indigo-700/80 dark:text-indigo-300/80">Payroll uses attendance and approved leave for the selected month. Unpaid absence is deducted automatically using the configured monthly payroll divisor.</p>
                    </div>
                    {loadingAttendancePayroll && <Loader2 size={16} className="animate-spin text-indigo-600" />}
                  </div>
                  {attendancePayroll && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                      {[
                        ["Working days", attendancePayroll.workingDays],
                        ["Present", attendancePayroll.presentDays],
                        ["Paid leave", attendancePayroll.paidLeaveDays],
                        ["Unpaid leave", attendancePayroll.unpaidLeaveDays],
                        ["Absent", attendancePayroll.absentDays],
                        ["OT", `${Math.floor((attendancePayroll.overtimeMinutes || 0) / 60)}h ${(attendancePayroll.overtimeMinutes || 0) % 60}m`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/60">
                          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</p>
                          <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Breakdown */}
              <div className="mt-5 grid gap-4 sm:grid-cols-3">

                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Gross Salary
                  </p>

                  <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                    {formatCurrency(
                      breakdown.grossSalary
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Deductions
                  </p>

                  <p className="mt-1 text-lg font-bold text-red-600 dark:text-red-400">
                    -{" "}
                    {formatCurrency(
                      breakdown.deductions
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-amber-50 p-4 dark:bg-amber-950/20">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Attendance Deduction</p>
                  <p className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-300">- {formatCurrency(breakdown.attendanceDeduction || 0)}</p>
                  {Number(breakdown.overtimePay || 0) > 0 && <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">OT + {formatCurrency(breakdown.overtimePay)}</p>}
                </div>

                <div className="rounded-xl bg-slate-900 p-4 text-white dark:bg-white dark:text-slate-900">
                  <p className="text-xs opacity-70">
                    Net Salary
                  </p>

                  <p className="mt-1 text-xl font-bold">
                    {formatCurrency(
                      breakdown.netSalary
                    )}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Payment */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

            <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CalendarDays
                  size={18}
                  className="text-slate-500"
                />

                <div>
                  <h2 className="font-semibold text-slate-900 dark:text-white">
                    Payment Information
                  </h2>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Add payment details if the payroll has already been processed.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 p-5 md:grid-cols-2">

              <SelectField
                label="Status"
                value={form.status}
                onChange={(event) =>
                  updateForm(
                    "status",
                    event.target.value
                  )
                }
              >
                <option value="Pending">
                  Pending
                </option>

                <option value="Processing">
                  Processing
                </option>

                <option value="Paid">
                  Paid
                </option>

                <option value="Failed">
                  Failed
                </option>
              </SelectField>

              <InputField
                label="Payment Date"
                type="date"
                value={
                  form.paymentDate
                }
                onChange={(event) =>
                  updateForm(
                    "paymentDate",
                    event.target.value
                  )
                }
              />

              <SelectField
                label="Payment Method"
                value={form.paymentMethod}
                onChange={(event) => updateForm("paymentMethod", event.target.value)}
              >
                <option value="">Select payment method</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="Other">Other</option>
              </SelectField>

              <InputField
                label="Transaction ID"
                value={
                  form.transactionId
                }
                onChange={(event) =>
                  updateForm(
                    "transactionId",
                    event.target.value
                  )
                }
                placeholder="Optional transaction reference"
              />

              <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 dark:border-indigo-900/40 dark:bg-indigo-950/30">
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Amount to Pay</p>
                <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(breakdown.netSalary)}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Net payable after allowances and deductions.</p>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Notes
                </label>

                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    updateForm(
                      "notes",
                      event.target.value
                    )
                  }
                  rows={4}
                  placeholder="Add any payroll notes..."
                  className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-800"
                />
              </div>
            </div>
          </section>

          {/* Summary */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">

            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Payroll Summary
                </p>

                <div className="mt-2 flex flex-wrap items-baseline gap-x-5 gap-y-2">
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">
                    {formatCurrency(
                      breakdown.netSalary
                    )}
                  </span>

                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Net salary
                  </span>
                </div>

                {selectedEmployee && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {getEmployeeName(
                      selectedEmployee
                    )}{" "}
                    •{" "}
                    {
                      MONTHS.find(
                        (item) =>
                          item.value ===
                          Number(
                            form.month
                          )
                      )?.label
                    }{" "}
                    {form.year}
                  </p>
                )}
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row">

                <button
                  type="button"
                  onClick={handleReset}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Reset
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    loadingEmployees ||
                    loadingSalary ||
                    loadingEdit
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  {saving ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                      {isEditMode ? "Saving..." : "Generating..."}
                    </>
                  ) : (
                    <>
                      <Save size={17} />
                      {isEditMode ? "Save Payroll Changes" : "Generate Payroll"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>

        </form>

        {/* Success hint */}
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle2
            size={18}
            className="mt-0.5 shrink-0"
          />

          <p>
            Payroll is created using the existing
            <strong className="mx-1">
              createPayroll()
            </strong>
            service and will appear in Payroll History after successful creation.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GeneratePayroll;