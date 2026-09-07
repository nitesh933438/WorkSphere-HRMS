import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  Edit3,
  Loader2,
  Mail,
  Phone,
  UserRound,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../constants/roleConstants";

import { getEmployeeById } from "../../services/employeeService";

/* =====================================================
   EMPLOYEE DETAILS
===================================================== */

function EmployeeDetails() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const canEdit = role === ROLES.ADMIN || role === ROLES.HR;

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =====================================================
     LOAD EMPLOYEE
  ===================================================== */

  useEffect(() => {
    let isMounted = true;

    const loadEmployee = async () => {
      if (!employeeId) {
        if (isMounted) {
          setError("Employee ID is missing.");
          setLoading(false);
        }

        return;
      }

      try {
        setLoading(true);
        setError("");

        const data = await getEmployeeById(employeeId);

        if (!isMounted) {
          return;
        }

        if (!data) {
          setEmployee(null);
          setError("Employee not found.");
          return;
        }

        setEmployee(data);
      } catch (err) {
        console.error(
          "Error loading employee:",
          err
        );

        if (!isMounted) {
          return;
        }

        if (
          err?.code ===
          "permission-denied"
        ) {
          setError(
            "You do not have permission to view this employee."
          );
        } else {
          setError(
            "Unable to load employee details right now. Please try again."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadEmployee();

    return () => {
      isMounted = false;
    };
  }, [employeeId]);

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <Loader2
          size={30}
          className="animate-spin text-slate-500"
        />

        <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-300">
          Loading employee details...
        </p>
      </div>
    );
  }

  /* =====================================================
     ERROR / NOT FOUND
  ===================================================== */

  if (error || !employee) {
    return (
      <div className="space-y-6">
        <Link
          to="/employees"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowLeft size={17} />
          Back to Employees
        </Link>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          {error || "Employee not found."}
        </div>
      </div>
    );
  }

  /* =====================================================
     DATA
  ===================================================== */

  const initial =
    employee.fullName
      ?.trim()
      .charAt(0)
      .toUpperCase() || "U";

  const photoURL =
    employee.photoURL ||
    employee.photoUrl ||
    "";

  const joiningDate = formatDate(
    employee.joiningDate
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div className="flex items-start gap-3">

          <Link
            to="/employees"
            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Back to employees"
          >
            <ArrowLeft size={19} />
          </Link>

          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Employee Management
            </p>

            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Employee Details
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              View complete employee information.
            </p>
          </div>

        </div>

        {canEdit && (
          <button
            type="button"
            onClick={() => navigate(`/employees/${employeeId}/edit`)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            <Edit3 size={17} />
            Edit Employee
          </button>
        )}

      </div>

      {/* =================================================
          PROFILE CARD
      ================================================= */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

        <div className="p-6 md:p-8">

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">

            {photoURL ? (
              <img
                src={photoURL}
                alt={
                  employee.fullName ||
                  "Employee"
                }
                className="h-20 w-20 shrink-0 rounded-2xl object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-2xl font-bold text-slate-700 dark:bg-slate-800 dark:text-white">
                {initial}
              </div>
            )}

            <div className="min-w-0 flex-1">

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {employee.fullName ||
                      "Unnamed Employee"}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {employee.designation ||
                      "No designation"}
                  </p>
                </div>

                <StatusBadge
                  status={employee.status}
                />

              </div>

            </div>

          </div>

        </div>

      </div>

      {/* =================================================
          PERSONAL INFORMATION
      ================================================= */}

      <InfoSection
        icon={UserRound}
        title="Personal Information"
        description="Basic contact information of the employee."
      >
        <InfoItem
          icon={UserRound}
          label="Full Name"
          value={employee.fullName}
        />

        <InfoItem
          icon={Mail}
          label="Work Email"
          value={employee.email}
        />

        <InfoItem
          icon={Phone}
          label="Phone Number"
          value={employee.phone}
        />

        <InfoItem
          label="Employee Code"
          value={employee.employeeCode}
        />

        <InfoItem
          label="Date of Birth"
          value={formatDate(
            employee.dateOfBirth
          )}
        />

        <InfoItem
          label="Gender"
          value={employee.gender}
        />
      </InfoSection>

      {/* =================================================
          EMPLOYMENT INFORMATION
      ================================================= */}

      <InfoSection
        icon={BriefcaseBusiness}
        title="Employment Information"
        description="Role, department and employment details."
      >
        <InfoItem
          icon={BriefcaseBusiness}
          label="Department"
          value={employee.department}
        />

        <InfoItem
          icon={UserRound}
          label="Designation"
          value={employee.designation}
        />

        <InfoItem
          icon={CalendarDays}
          label="Joining Date"
          value={joiningDate}
        />

        <InfoItem
          label="Employment Type"
          value={employee.employmentType}
        />

        <InfoItem
          label="Status"
          value={employee.status}
        />
      </InfoSection>

      {/* =================================================
          ADDRESS
      ================================================= */}

      <InfoSection
        icon={UserRound}
        title="Address"
        description="Employee residential address."
      >
        <InfoItem
          label="Address"
          value={employee.address}
        />

        <InfoItem
          label="City"
          value={employee.city}
        />

        <InfoItem
          label="State"
          value={employee.state}
        />

        <InfoItem
          label="Country"
          value={employee.country}
        />

        <InfoItem
          label="PIN Code"
          value={employee.pincode}
        />
      </InfoSection>

      {/* =================================================
          EMERGENCY CONTACT
      ================================================= */}

      <InfoSection
        icon={Phone}
        title="Emergency Contact"
        description="Emergency contact information."
      >
        <InfoItem
          label="Contact Name"
          value={
            employee.emergencyContactName
          }
        />

        <InfoItem
          icon={Phone}
          label="Contact Phone"
          value={
            employee.emergencyContactPhone
          }
        />

        <InfoItem
          label="Relation"
          value={
            employee.emergencyContactRelation
          }
        />
      </InfoSection>

      {/* =================================================
          BOTTOM ACTIONS
      ================================================= */}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">

        <Link
          to="/employees"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowLeft size={17} />
          Back to Employees
        </Link>

        {canEdit && (
          <button
            type="button"
            onClick={() => navigate(`/employees/${employeeId}/edit`)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            <Edit3 size={17} />
            Edit Employee
          </button>
        )}

      </div>

    </div>
  );
}

/* =====================================================
   INFO SECTION
===================================================== */

function InfoSection({
  icon: Icon,
  title,
  description,
  children,
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

      <div className="p-6 md:p-8">

        <div className="flex items-start gap-3">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <Icon size={19} />
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {title}
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {description}
            </p>
          </div>

        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {children}
        </div>

      </div>

    </section>
  );
}

/* =====================================================
   INFO ITEM
===================================================== */

function InfoItem({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">

      <div className="flex items-center gap-2">

        {Icon && (
          <Icon
            size={15}
            className="text-slate-400"
          />
        )}

        <p className="text-xs font-medium text-slate-400">
          {label}
        </p>

      </div>

      <p className="mt-2 break-words text-sm font-semibold text-slate-800 dark:text-slate-200">
        {value || "—"}
      </p>

    </div>
  );
}

/* =====================================================
   STATUS BADGE
===================================================== */

function StatusBadge({ status }) {
  const styles = {
    Active:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",

    Inactive:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",

    "On Leave":
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  };

  return (
    <span
      className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${
        styles[status] ||
        "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
      }`}
    >
      {status || "Unknown"}
    </span>
  );
}

/* =====================================================
   DATE FORMAT
===================================================== */

function formatDate(value) {
  if (!value) {
    return "—";
  }

  /* Firestore Timestamp */

  if (
    typeof value?.toDate ===
    "function"
  ) {
    const date = value.toDate();

    return date.toLocaleDateString(
      [],
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  /* JavaScript Date */

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return "—";
    }

    return value.toLocaleDateString(
      [],
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  /* String date */

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString(
    [],
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

export default EmployeeDetails;