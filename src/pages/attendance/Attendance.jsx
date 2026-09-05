import { useEffect, useMemo, useState } from "react";

import {
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  LogIn,
  LogOut,
  RefreshCw,
  XCircle,
  TrendingUp,
  UserCheck,
  UserX,
  Timer,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Search,
  X,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { useDepartments, mergeDepartmentOptions } from "../../hooks/useDepartments";
import { createManualAttendanceRequest } from "../../services/requestService";

import {
  checkIn,
  checkOut,
  reopenAttendance,
  getAttendanceHistory,
  getAttendanceHistoryForRole,
  getTodayAttendance,
  formatWorkingTime,
} from "../../services/attendanceService";

/*
|--------------------------------------------------------------------------
| ATTENDANCE PAGE
|--------------------------------------------------------------------------
*/

function Attendance() {
  const { role } = useAuth();
  const isManagement = ["admin", "hr", "manager"].includes(role);
  const [todayAttendance, setTodayAttendance] =
    useState(null);

  const [attendanceHistory, setAttendanceHistory] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [reopenRecord, setReopenRecord] = useState(null);
  const [reopenReason, setReopenReason] = useState("");
  const [reopenLoading, setReopenLoading] = useState(false);

  const [liveWorkingMinutes, setLiveWorkingMinutes] = useState(0);

  /*
  |--------------------------------------------------------------------------
  | CURRENT MONTH KEY
  |--------------------------------------------------------------------------
  */

  const getCurrentMonthKey = () => {
    const now = new Date();

    return `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;
  };

  const [selectedMonth, setSelectedMonth] =
    useState(getCurrentMonthKey());

  const [statusFilter, setStatusFilter] = useState("All");
  const [historySearch, setHistorySearch] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("All");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const { departments } = useDepartments();

  /*
  |--------------------------------------------------------------------------
  | LOAD ATTENDANCE
  |--------------------------------------------------------------------------
  */

  const loadAttendance = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        today,
        history,
      ] = await Promise.all([
        getTodayAttendance(),
        getAttendanceHistoryForRole(role, 500),
      ]);

      setTodayAttendance(today);

      setAttendanceHistory(
        Array.isArray(history)
          ? history
          : []
      );
    } catch (err) {
      console.error(
        "Error loading attendance:",
        err
      );

      setError(
        err?.message ||
          "Unable to load attendance."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadAttendance();
  }, [role]);

  const handleManualAttendanceRequest = async () => {
    const reason = window.prompt("Why do you need manual attendance? (Minimum 5 characters)");
    if (!reason) return;
    try {
      setActionLoading(true); setError(""); setSuccess("");
      await createManualAttendanceRequest({ date: new Date().toISOString().slice(0, 10), reason });
      setSuccess("Manual attendance request sent to HR/Admin for approval.");
    } catch (err) {
      setError(err?.message || "Unable to submit manual attendance request.");
    } finally { setActionLoading(false); }
  };

  /*
  |--------------------------------------------------------------------------
  | CHECK IN
  |--------------------------------------------------------------------------
  */

  const handleCheckIn = async () => {
    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const result = await checkIn(role);

      setTodayAttendance(result);

      setAttendanceHistory(
        (previous) => {
          const alreadyExists =
            previous.some(
              (item) =>
                item.id === result.id
            );

          if (alreadyExists) {
            return previous;
          }

          return [
            result,
            ...previous,
          ];
        }
      );

      setSuccess(
        "You have successfully checked in."
      );
    } catch (err) {
      console.error(
        "Check-in error:",
        err
      );

      setError(
        err?.message ||
          "Unable to check in."
      );
    } finally {
      setActionLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | CHECK OUT
  |--------------------------------------------------------------------------
  */

  const handleCheckOut = async () => {
    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const result = await checkOut();

      setTodayAttendance(result);

      setAttendanceHistory(
        (previous) =>
          previous.map(
            (item) =>
              item.id === result.id
                ? result
                : item
          )
      );

      setSuccess(
        "You have successfully checked out."
      );
    } catch (err) {
      console.error(
        "Check-out error:",
        err
      );

      setError(
        err?.message ||
          "Unable to check out."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const canCorrectAttendance = role === "admin" || role === "hr";

  const handleReopenAttendance = async () => {
    if (!reopenRecord) return;
    try {
      setReopenLoading(true);
      setError("");
      setSuccess("");
      const updated = await reopenAttendance(reopenRecord.id, reopenReason);
      setAttendanceHistory((previous) => previous.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
      if (todayAttendance?.id === updated.id) setTodayAttendance(updated);
      setReopenRecord(null);
      setReopenReason("");
      setSuccess("Attendance reopened successfully. The employee can check out again.");
    } catch (err) {
      console.error("Attendance reopen error:", err);
      setError(err?.message || "Unable to reopen attendance.");
    } finally {
      setReopenLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | MONTH INFORMATION
  |--------------------------------------------------------------------------
  */

  const selectedMonthDate =
    new Date(
      `${selectedMonth}-01T00:00:00`
    );

  const selectedYear =
    selectedMonthDate.getFullYear();

  const selectedMonthIndex =
    selectedMonthDate.getMonth();

  const selectedMonthName =
    selectedMonthDate.toLocaleDateString(
      [],
      {
        month: "long",
        year: "numeric",
      }
    );

  /*
  |--------------------------------------------------------------------------
  | CURRENT DATE
  |--------------------------------------------------------------------------
  */

  const currentDate = new Date();

  const currentYear =
    currentDate.getFullYear();

  const currentMonthIndex =
    currentDate.getMonth();

  const currentDay =
    currentDate.getDate();

  /*
  |--------------------------------------------------------------------------
  | CHECK IF SELECTED MONTH IS CURRENT MONTH
  |--------------------------------------------------------------------------
  */

  const isCurrentMonth =
    selectedYear === currentYear &&
    selectedMonthIndex ===
      currentMonthIndex;

  /*
  |--------------------------------------------------------------------------
  | CHECK IF SELECTED MONTH IS FUTURE
  |--------------------------------------------------------------------------
  */

  const isFutureMonth =
    selectedYear > currentYear ||
    (
      selectedYear === currentYear &&
      selectedMonthIndex >
        currentMonthIndex
    );

  /*
  |--------------------------------------------------------------------------
  | MONTHLY RECORDS
  |--------------------------------------------------------------------------
  */

  const monthlyRecords = useMemo(() => {
    return attendanceHistory.filter(
      (record) => {
        if (!record?.date) {
          return false;
        }

        return record.date.startsWith(
          selectedMonth
        );
      }
    );
  }, [
    attendanceHistory,
    selectedMonth,
  ]);

  /*
  |--------------------------------------------------------------------------
  | PRESENT RECORDS
  |--------------------------------------------------------------------------
  */

  const presentRecords = useMemo(() => {
    return monthlyRecords.filter(
      (record) =>
        record.status === "Present" ||
        record.status === "Completed"
    );
  }, [
    monthlyRecords,
  ]);

  const departmentOptions = useMemo(() => mergeDepartmentOptions(departments, attendanceHistory), [departments, attendanceHistory]);

  const attendanceEmployees = useMemo(() => {
    const map = new Map();
    attendanceHistory.forEach((record) => {
      if (record.userId) map.set(record.userId, `${record.employeeName || record.userEmail || "Employee"}${record.employeeCode ? ` • ${record.employeeCode}` : ""}`);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [attendanceHistory]);

  const filteredMonthlyRecords = useMemo(() => {
    const query = historySearch.trim().toLowerCase();

    return monthlyRecords.filter((record) => {
      const searchable = [record?.date, record?.checkIn, record?.checkOut, record?.status, record?.employeeName, record?.employeeCode, record?.department, record?.userEmail]
        .filter(Boolean).join(" ").toLowerCase();
      const matchesSearch = !query || searchable.includes(query);
      const matchesStatus = statusFilter === "All" || String(record.status || "").toLowerCase() === statusFilter.toLowerCase();
      const matchesEmployee = employeeFilter === "All" || record.userId === employeeFilter;
      const matchesDepartment = departmentFilter === "All" || String(record.department || record.departmentName || "").toLowerCase() === departmentFilter.toLowerCase();
      return matchesSearch && matchesStatus && matchesEmployee && matchesDepartment;
    });
  }, [monthlyRecords, statusFilter, historySearch, employeeFilter, departmentFilter]);

  /*
  |--------------------------------------------------------------------------
  | WORKING DAYS
  |--------------------------------------------------------------------------
  |
  | IMPORTANT:
  |
  | Previous month:
  |   Full month working days.
  |
  | Current month:
  |   Only days up to today.
  |
  | Future month:
  |   0 working days.
  |
  | Sunday:
  |   Not counted.
  |
  |--------------------------------------------------------------------------
  */

  const workingDaysInMonth =
    useMemo(() => {
      /*
      |--------------------------------------------------------------------------
      | FUTURE MONTH
      |--------------------------------------------------------------------------
      */

      if (isFutureMonth) {
        return 0;
      }

      /*
      |--------------------------------------------------------------------------
      | LAST DAY TO COUNT
      |--------------------------------------------------------------------------
      */

      const daysInMonth =
        new Date(
          selectedYear,
          selectedMonthIndex + 1,
          0
        ).getDate();

      let lastDay =
        daysInMonth;

      /*
      |--------------------------------------------------------------------------
      | CURRENT MONTH
      |--------------------------------------------------------------------------
      |
      | Don't count future dates.
      |
      */

      if (isCurrentMonth) {
        lastDay =
          Math.min(
            currentDay,
            daysInMonth
          );
      }

      /*
      |--------------------------------------------------------------------------
      | COUNT WORKING DAYS
      |--------------------------------------------------------------------------
      */

      let workingDays = 0;

      for (
        let day = 1;
        day <= lastDay;
        day++
      ) {
        const date =
          new Date(
            selectedYear,
            selectedMonthIndex,
            day
          );

        /*
        | Sunday = 0
        */

        if (
          date.getDay() !== 0
        ) {
          workingDays++;
        }
      }

      return workingDays;
    }, [
      selectedYear,
      selectedMonthIndex,
      isCurrentMonth,
      isFutureMonth,
      currentDay,
      currentYear,
      currentMonthIndex,
    ]);

  /*
  |--------------------------------------------------------------------------
  | ABSENT DAYS
  |--------------------------------------------------------------------------
  */

  const absentDays = useMemo(() => {
    /*
    |--------------------------------------------------------------------------
    | FUTURE MONTH
    |--------------------------------------------------------------------------
    |
    | Future dates are NOT absent.
    |
    */

    if (isFutureMonth) {
      return 0;
    }

    const present =
      presentRecords.length;

    return Math.max(
      0,
      workingDaysInMonth -
        present
    );
  }, [
    presentRecords,
    workingDaysInMonth,
    isFutureMonth,
  ]);

  /*
  |--------------------------------------------------------------------------
  | MONTH STATISTICS
  |--------------------------------------------------------------------------
  */

  const statistics = useMemo(() => {
    const present =
      presentRecords.length;

    const completed =
      monthlyRecords.filter(
        (item) =>
          item.status ===
          "Completed"
      ).length;

    const totalMinutes =
      monthlyRecords.reduce(
        (sum, item) =>
          sum +
          (
            Number(
              item.workingMinutes
            ) || 0
          ),
        0
      );

    let attendancePercentage = 0;

    /*
    |--------------------------------------------------------------------------
    | ATTENDANCE PERCENTAGE
    |--------------------------------------------------------------------------
    */

    if (
      workingDaysInMonth > 0
    ) {
      attendancePercentage =
        Math.min(
          100,
          Math.round(
            (
              present /
              workingDaysInMonth
            ) * 100
          )
        );
    }

    return {
      total:
        monthlyRecords.length,

      present,

      absent:
        absentDays,

      completed,

      totalMinutes,

      attendancePercentage,

      workingDaysInMonth,
    };
  }, [
    monthlyRecords,
    presentRecords,
    workingDaysInMonth,
    absentDays,
  ]);

  /*
  |--------------------------------------------------------------------------
  | TODAY STATUS
  |--------------------------------------------------------------------------
  */

  const isCheckedIn =
    Boolean(
      todayAttendance?.checkIn
    );

  const isCheckedOut =
    Boolean(
      todayAttendance?.checkOut
    );

    useEffect(() => {
  if (!isCheckedIn || isCheckedOut) {
    setLiveWorkingMinutes(
      Number(
        todayAttendance?.workingMinutes
      ) || 0
    );

    return;
  }

  const calculateLiveTime = () => {
    let checkInDate = null;

    if (
      todayAttendance?.checkInTimestamp?.toDate
    ) {
      checkInDate =
        todayAttendance.checkInTimestamp.toDate();
    }

    if (!checkInDate) {
      return;
    }

    const now = new Date();

    const difference =
      now.getTime() -
      checkInDate.getTime();

    const minutes = Math.max(
      0,
      Math.floor(
        difference / 60000
      )
    );

    setLiveWorkingMinutes(minutes);
  };

  calculateLiveTime();

  const timer = setInterval(
    calculateLiveTime,
    1000
  );

  return () => {
    clearInterval(timer);
  };
}, [
  isCheckedIn,
  isCheckedOut,
  todayAttendance,
]);

  /*
  |--------------------------------------------------------------------------
  | TODAY DATE
  |--------------------------------------------------------------------------
  */

  const today =
    new Date();

  const formattedToday =
    today.toLocaleDateString(
      [],
      {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );

  /*
  |--------------------------------------------------------------------------
  | CHANGE MONTH
  |--------------------------------------------------------------------------
  */

  const changeMonth = (
    amount
  ) => {
    const date =
      new Date(
        selectedYear,
        selectedMonthIndex +
          amount,
        1
      );

    const newMonth =
      `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

    setSelectedMonth(
      newMonth
    );
  };

  /*
  |--------------------------------------------------------------------------
  | GO TO CURRENT MONTH
  |--------------------------------------------------------------------------
  */

  const goToCurrentMonth =
    () => {
      setSelectedMonth(
        getCurrentMonthKey()
      );
    };

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div className="space-y-6">
      <div className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-5 text-white shadow-xl sm:p-7 dark:border-slate-800">
        <div className="max-w-2xl">
          <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-slate-200">
            ATTENDANCE WORKSPACE
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Attendance, at a glance.
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Track attendance clearly in a clean, responsive workspace.
          </p>
        </div>
      </div>

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

        <div>

          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Employee attendance
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Attendance
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Track your daily check-in,
            check-out and working hours.
          </p>

        </div>

        <div className="flex flex-wrap items-center gap-2">

          <button
            type="button"
            onClick={goToCurrentMonth}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Today
          </button>

          <button
            type="button"
            onClick={loadAttendance}
            disabled={
              loading ||
              actionLoading
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >

            {loading ? (
              <Loader2
                size={16}
                className="animate-spin"
              />
            ) : (
              <RefreshCw
                size={16}
              />
            )}

            Refresh

          </button>

        </div>

      </div>

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/30">

          <XCircle
            size={19}
            className="mt-0.5 shrink-0 text-red-600 dark:text-red-400"
          />

          <div>

            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              {error}
            </p>

          </div>

        </div>
      )}

      {/* =================================================
          SUCCESS
      ================================================= */}

      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">

          <CheckCircle2
            size={19}
            className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
          />

          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            {success}
          </p>

        </div>
      )}

      {/* =================================================
          TODAY ATTENDANCE
      ================================================= */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

        <div className="border-b border-slate-200 p-5 dark:border-slate-800">

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <div className="flex items-center gap-2">

                <CalendarDays
                  size={18}
                  className="text-slate-500"
                />

                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Today
                </p>

              </div>

              <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                {formattedToday}
              </h2>

            </div>

            <div>

              {isCheckedOut ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">

                  <CheckCircle2
                    size={14}
                  />

                  Completed

                </span>
              ) : isCheckedIn ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">

                  <Clock3
                    size={14}
                  />

                  In Progress

                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">

                  Not Checked In

                </span>
              )}

            </div>

          </div>

        </div>

        <div className="grid gap-4 p-5 md:grid-cols-3">

          {/* CHECK IN */}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">

                <LogIn size={19} />

              </div>

              <div>

                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Check In
                </p>

                <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  {todayAttendance?.checkIn ||
                    "—"}
                </p>

              </div>

            </div>

          </div>

          {/* CHECK OUT */}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">

                <LogOut size={19} />

              </div>

              <div>

                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Check Out
                </p>

                <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  {todayAttendance?.checkOut ||
                    "—"}
                </p>

              </div>

            </div>

          </div>

          {/* WORKING TIME */}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">

                <Timer size={19} />

              </div>

              <div>

                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Working Time
                </p>

                <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  {formatWorkingTime(
  liveWorkingMinutes
)}
                </p>

              </div>

            </div>

          </div>

        </div>

        {/* ACTION BUTTONS */}

        <div className="grid gap-3 border-t border-slate-200 p-5 dark:border-slate-800 md:grid-cols-2">

          <button
            type="button"
            onClick={handleCheckIn}
            disabled={
              actionLoading ||
              isCheckedIn
            }
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >

            {actionLoading ? (
              <Loader2
                size={17}
                className="animate-spin"
              />
            ) : (
              <LogIn
                size={17}
              />
            )}

            {isCheckedIn
              ? "Checked In"
              : "Check In"}

          </button>

          <button
            type="button"
            onClick={handleCheckOut}
            disabled={
              actionLoading ||
              !isCheckedIn ||
              isCheckedOut
            }
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
          >

            {actionLoading ? (
              <Loader2
                size={17}
                className="animate-spin"
              />
            ) : (
              <LogOut
                size={17}
              />
            )}

            {isCheckedOut
              ? "Checked Out"
              : "Check Out"}

          </button>

          {!isCheckedIn && (
            <button type="button" onClick={handleManualAttendanceRequest} disabled={actionLoading} className="md:col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300 dark:hover:bg-amber-950/40">
              <ShieldCheck size={17} /> Request Manual Attendance (GPS/Location Problem)
            </button>
          )}

        </div>

      </section>

      {/* =================================================
          MONTH SELECTOR
      ================================================= */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Attendance Overview
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
              {selectedMonthName}
            </h2>

          </div>

          <div className="flex items-center gap-2">

            <button
              type="button"
              onClick={() =>
                changeMonth(-1)
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Previous month"
            >

              <ChevronLeft
                size={18}
              />

            </button>

            <button
              type="button"
              onClick={goToCurrentMonth}
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {selectedMonthName}
            </button>

            <button
              type="button"
              onClick={() =>
                changeMonth(1)
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Next month"
            >

              <ChevronRight
                size={18}
              />

            </button>

          </div>

        </div>

      </section>

      {/* =================================================
          MONTH STATISTICS
      ================================================= */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        {/* PRESENT */}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Present Days
              </p>

              <p className="mt-2 text-2xl font-bold text-emerald-600">
                {statistics.present}
              </p>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">

              <UserCheck
                size={20}
              />

            </div>

          </div>

        </div>

        {/* ABSENT */}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Absent Days
              </p>

              <p className="mt-2 text-2xl font-bold text-red-600">
                {statistics.absent}
              </p>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">

              <UserX
                size={20}
              />

            </div>

          </div>

        </div>

        {/* ATTENDANCE */}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Attendance %
              </p>

              <p className="mt-2 text-2xl font-bold text-blue-600">
                {statistics.attendancePercentage}%
              </p>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">

              <TrendingUp
                size={20}
              />

            </div>

          </div>

        </div>

        {/* WORKING TIME */}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Working Time
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                {formatWorkingTime(
                  statistics.totalMinutes
                )}
              </p>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">

              <Timer
                size={20}
              />

            </div>

          </div>

        </div>

      </div>

      {/* =================================================
          MONTH SUMMARY
      ================================================= */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">

        <div className="flex items-center justify-between">

          <div>

            <h2 className="font-bold text-slate-900 dark:text-white">
              Monthly Summary
            </h2>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Attendance performance for{" "}
              {selectedMonthName}
            </p>

          </div>

          <div className="text-right">

            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {statistics.attendancePercentage}%
            </p>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Attendance rate
            </p>

          </div>

        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">

          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-500"
            style={{
              width: `${statistics.attendancePercentage}%`,
            }}
          />

        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">

          <span>
            Working days:{" "}
            <strong className="text-slate-700 dark:text-slate-200">
              {statistics.workingDaysInMonth}
            </strong>
          </span>

          <span>
            Present:{" "}
            <strong className="text-emerald-600">
              {statistics.present}
            </strong>
          </span>

          <span>
            Absent:{" "}
            <strong className="text-red-600">
              {statistics.absent}
            </strong>
          </span>

          <span>
            Completed:{" "}
            <strong className="text-blue-600">
              {statistics.completed}
            </strong>
          </span>

        </div>

      </section>

      {/* =================================================
          ATTENDANCE HISTORY
      ================================================= */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

        <div className="border-b border-slate-200 p-5 dark:border-slate-800">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-3">

              <CalendarCheck
                size={19}
                className="text-slate-500"
              />

              <div>

                <h2 className="font-bold text-slate-900 dark:text-white">
                  Attendance History
                </h2>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Records for{" "}
                  {selectedMonthName}
                </p>

              </div>

            </div>

            <div className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">

              {monthlyRecords.length}{" "}
              record
              {monthlyRecords.length !==
              1
                ? "s"
                : ""}

            </div>

          </div>

        </div>

        {/* LOADING */}

        {loading && (
          <div className="flex min-h-48 flex-col items-center justify-center">

            <Loader2
              size={27}
              className="animate-spin text-slate-500"
            />

            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Loading attendance...
            </p>

          </div>
        )}

        {/* EMPTY */}

        {!loading &&
          monthlyRecords.length ===
            0 && (
            <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center">

              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">

                <CalendarDays
                  size={22}
                />

              </div>

              <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
                No attendance records
              </p>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                No attendance records found
                for{" "}
                {selectedMonthName}.
              </p>

            </div>
          )}

        {/* HISTORY FILTERS */}

        {!loading && monthlyRecords.length > 0 && (

          <div className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/50 md:grid-cols-[1fr_auto_auto] md:items-center">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} placeholder="Search date, check-in, check-out, status..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900" />
              {historySearch && <button type="button" onClick={() => setHistorySearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label="Clear attendance search"><X size={15} /></button>}
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900">
              <option>All</option><option>Present</option><option>Completed</option><option>Absent</option><option>Pending</option><option>On Leave</option>
            </select>
            {isManagement && (
              <>
                <select value={departmentFilter} onChange={(e) => { setDepartmentFilter(e.target.value); setEmployeeFilter("All"); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="All">All Departments</option>{departmentOptions.map((department) => <option key={department} value={department}>{department}</option>)}</select>
                <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900">
                  <option value="All">All Employees</option>
                  {attendanceEmployees.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </>
            )}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><SlidersHorizontal size={15} /> Showing {filteredMonthlyRecords.length} of {monthlyRecords.length}</div>
          </div>
        )}

        {/* HISTORY TABLE */}

        {!loading &&
          filteredMonthlyRecords.length >
            0 && (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[900px]">

                <thead>

                  <tr className="border-b border-slate-200 dark:border-slate-800">

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Date
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Check In
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Check Out
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Working Time
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    {canCorrectAttendance && (
                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Actions
                      </th>
                    )}

                  </tr>

                </thead>

                <tbody>

                  {filteredMonthlyRecords.map(
                    (record) => (
                      <tr
                        key={
                          record.id
                        }
                        className="border-b border-slate-100 last:border-0 dark:border-slate-800/70"
                      >

                        {isManagement && <td className="px-5 py-4 text-sm font-semibold text-slate-900 dark:text-white">{record.employeeName || record.userEmail || "Employee"}<span className="block text-[11px] font-normal text-slate-400">{record.employeeCode || record.department || ""}</span></td>}
                        <td className="px-5 py-4 text-sm font-medium text-slate-900 dark:text-white">
                          {formatDate(
                            record.date
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                          {record.checkIn ||
                            "—"}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                          {record.checkOut ||
                            "—"}
                        </td>

                        <td className="px-5 py-4 text-sm font-medium text-slate-700 dark:text-slate-200">
                          {formatWorkingTime(
                            record.workingMinutes ||
                              0
                          )}
                        </td>

                        <td className="px-5 py-4">

                          {record.status ===
                            "Completed" ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">

                              <CheckCircle2
                                size={13}
                              />

                              Completed

                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">

                              <Clock3
                                size={13}
                              />

                              Present

                            </span>
                          )}

                        </td>

                        {canCorrectAttendance && (
                          <td className="px-5 py-4">
                            {record.checkOut ? (
                              <button
                                type="button"
                                onClick={() => { setReopenRecord(record); setReopenReason(""); setError(""); setSuccess(""); }}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
                                title="Reopen this completed attendance"
                              >
                                <RotateCcw size={14} />
                                Reopen
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400">Open</span>
                            )}
                          </td>
                        )}

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

      </section>

      {reopenRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="reopen-attendance-title">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                <ShieldCheck size={21} />
              </div>
              <div>
                <h3 id="reopen-attendance-title" className="text-lg font-bold text-slate-900 dark:text-white">Reopen attendance</h3>
                <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">This clears the accidental checkout while keeping the original check-in. The employee can then check out again.</p>
              </div>
            </div>
            <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/70">
              <p className="font-semibold text-slate-900 dark:text-white">{reopenRecord.employeeName || reopenRecord.userEmail || "Employee"}</p>
              <p className="mt-1 text-slate-500 dark:text-slate-400">{formatDate(reopenRecord.date)} · {reopenRecord.checkIn || "—"} → {reopenRecord.checkOut || "—"}</p>
            </div>
            <label className="mt-5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Reason <span className="text-red-500">*</span></label>
            <textarea value={reopenReason} onChange={(event) => setReopenReason(event.target.value)} rows={4} maxLength={300} placeholder="Example: Employee accidentally checked out and needs to continue working." className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            <p className="mt-1 text-right text-[11px] text-slate-400">{reopenReason.length}/300</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" disabled={reopenLoading} onClick={() => { setReopenRecord(null); setReopenReason(""); }} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Cancel</button>
              <button type="button" disabled={reopenLoading || reopenReason.trim().length < 5} onClick={handleReopenAttendance} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900">{reopenLoading ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />} Reopen attendance</button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          INFORMATION
      ================================================= */}

      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900/40 dark:bg-blue-950/20">

        <div className="flex items-start gap-3">

          <CalendarDays
            size={18}
            className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400"
          />

          <div>

            <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
              Attendance calculation
            </p>

            <p className="mt-1 text-xs leading-5 text-blue-700 dark:text-blue-400">
              Current month attendance is
              calculated only up to today.
              Future dates are not counted
              as absent. Sundays are excluded
              from working days.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| FORMAT DATE
|--------------------------------------------------------------------------
*/

function formatDate(
  date
) {
  if (!date) {
    return "—";
  }

  /*
  |--------------------------------------------------------------------------
  | YYYY-MM-DD
  |--------------------------------------------------------------------------
  */

  const parts =
    String(date).split("-");

  if (
    parts.length === 3
  ) {
    const year =
      Number(parts[0]);

    const month =
      Number(parts[1]) - 1;

    const day =
      Number(parts[2]);

    const parsedDate =
      new Date(
        year,
        month,
        day
      );

    if (
      !Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return parsedDate.toLocaleDateString(
        [],
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );
    }
  }

  const parsedDate =
    new Date(date);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return "—";
  }

  return parsedDate.toLocaleDateString(
    [],
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

export default Attendance;