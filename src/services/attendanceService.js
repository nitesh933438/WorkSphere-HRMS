import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  setDoc,
  where,
} from "firebase/firestore";

import { db, auth } from "../config/firebase";
import { getEmployees, getEmployeeForUser } from "./employeeService";
import { ROLES } from "../constants/roleConstants";
import { createNotification, notifyManagementSafely } from "./notificationService";

/*
|--------------------------------------------------------------------------
| COLLECTION
|--------------------------------------------------------------------------
*/

const ATTENDANCE_COLLECTION = "attendance";

const ATTENDANCE_POLICY_COLLECTION = "companySettings";
const ATTENDANCE_POLICY_ID = "attendancePolicy";

const DEFAULT_ATTENDANCE_POLICY = {
  officeStartTime: "09:00",
  officeEndTime: "18:00",
  lateAfterTime: "09:15",
  breakStartTime: "13:00",
  breakEndTime: "14:00",
  officeLatitude: "",
  officeLongitude: "",
  officeRadiusMeters: 200,
  locationRequired: true,
  workingDays: [1, 2, 3, 4, 5, 6],
};

const getAttendancePolicy = async () => {
  const snapshot = await getDoc(doc(db, ATTENDANCE_POLICY_COLLECTION, ATTENDANCE_POLICY_ID));
  return {
    ...DEFAULT_ATTENDANCE_POLICY,
    ...(snapshot.exists() ? snapshot.data() : {}),
  };
};

const parseMinutes = (value) => {
  const [hours, minutes] = String(value || "").split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
};

const getCurrentMinutes = (date = new Date()) => date.getHours() * 60 + date.getMinutes();

const getCurrentPosition = () => new Promise((resolve, reject) => {
  if (!("geolocation" in navigator)) {
    reject(new Error("Location is not supported by this device/browser."));
    return;
  }

  const handleError = (error) => {
    const messages = {
      1: "Location permission was denied. Please allow location access for this site and try again.",
      2: "Your location could not be determined. Please turn on GPS/location services and try again.",
      3: "Location request timed out. Please move to an open area and try again.",
    };
    reject(new Error(messages[error.code] || "Unable to read your location."));
  };

  // Always request a fresh GPS reading for attendance. Cached browser
  // positions can otherwise make the user appear many kilometres away.
  navigator.geolocation.getCurrentPosition(resolve, (error) => {
    // Some devices cannot return a high-accuracy fix indoors. Fall back to
    // the device's normal location provider before failing the check-in.
    if (error.code === 2 || error.code === 3) {
      navigator.geolocation.getCurrentPosition(resolve, handleError, {
        enableHighAccuracy: false,
        timeout: 20000,
        maximumAge: 0,
      });
      return;
    }
    handleError(error);
  }, {
    enableHighAccuracy: true,
    timeout: 20000,
    maximumAge: 0,
  });
});

export const getLiveLocation = async () => {
  const position = await getCurrentPosition();
  return {
    latitude: Number(position.coords.latitude),
    longitude: Number(position.coords.longitude),
    accuracy: Number(position.coords.accuracy) || null,
  };
};

const distanceInMeters = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const validateAttendanceEnvironment = async (now) => {
  const policy = await getAttendancePolicy();
  const day = now.getDay();
  const workingDays = Array.isArray(policy.workingDays) && policy.workingDays.length
    ? policy.workingDays.map(Number)
    : DEFAULT_ATTENDANCE_POLICY.workingDays;

  if (!workingDays.includes(day)) {
    throw new Error("Attendance is not available today according to the company working-day policy.");
  }

  const current = getCurrentMinutes(now);
  const start = parseMinutes(policy.officeStartTime);
  const end = parseMinutes(policy.officeEndTime);
  if (start !== null && current < start) {
    throw new Error(`Attendance opens at ${policy.officeStartTime}. Please check in during office hours.`);
  }
  if (end !== null && current > end) {
    throw new Error(`Attendance closed at ${policy.officeEndTime}. Please contact HR/Admin if you need a manual attendance correction.`);
  }

  const latitude = Number(policy.officeLatitude);
  const longitude = Number(policy.officeLongitude);
  const radius = Math.max(25, Number(policy.officeRadiusMeters) || 200);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    if (policy.locationRequired !== false) {
      throw new Error("Company office location is not configured. Please ask Admin/HR to set Attendance Settings first.");
    }
    return { policy, location: null, distanceMeters: null };
  }

  const location = await getLiveLocation();
  const currentLat = location.latitude;
  const currentLng = location.longitude;
  const distanceMeters = distanceInMeters(latitude, longitude, currentLat, currentLng);
  if (policy.locationRequired !== false && distanceMeters > radius) {
    throw new Error(`You are outside the office attendance area (${Math.round(distanceMeters)}m away). Move inside ${Math.round(radius)}m of the office and try again.`);
  }

  return {
    policy,
    location: {
      latitude: currentLat,
      longitude: currentLng,
      accuracy: location.accuracy,
    },
    distanceMeters: Math.round(distanceMeters),
  };
};

/*
|--------------------------------------------------------------------------
| CURRENT USER
|--------------------------------------------------------------------------
*/

const getCurrentUser = () => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User is not logged in.");
  }

  return user;
};

/*
|--------------------------------------------------------------------------
| TODAY KEY
|--------------------------------------------------------------------------
*/

const getTodayKey = () => {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/*
|--------------------------------------------------------------------------
| FORMAT TIME
|--------------------------------------------------------------------------
*/

const formatTime = (date = new Date()) => {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

/*
|--------------------------------------------------------------------------
| GET TODAY ATTENDANCE
|--------------------------------------------------------------------------
*/

export const getTodayAttendance = async () => {
  try {
    const user = getCurrentUser();
    const today = getTodayKey();

    // Query only the current user's records. This is important because
    // Firestore security rules are evaluated as query constraints. A direct
    // getDoc() of a non-existent deterministic document cannot safely use
    // resource.data-based ownership rules.
    const attendanceRef = collection(db, ATTENDANCE_COLLECTION);
    const q = query(
      attendanceRef,
      where("userId", "==", user.uid),
      where("date", "==", today),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const attendanceDoc = snapshot.docs[0];
    return {
      id: attendanceDoc.id,
      ...attendanceDoc.data(),
    };
  } catch (error) {
    console.error("Error fetching today's attendance:", error);
    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| CHECK IN
|--------------------------------------------------------------------------
*/

export const checkIn = async (userRole = null) => {
  try {
    const user = getCurrentUser();

    // Management accounts are not required to have an employees-directory
    // record. They must still be able to record their own attendance.
    // Employee status validation applies only to employee accounts.
    if (userRole === ROLES.EMPLOYEE) {
      const employee = await getEmployeeForUser(user);
      if (employee && String(employee.status || "Active").trim().toLowerCase() === "inactive") {
        throw new Error("This employee is inactive and cannot check in.");
      }
    }

    const existingAttendance =
      await getTodayAttendance();

    if (existingAttendance) {
      throw new Error(
        "You have already checked in today."
      );
    }

    const now = new Date();
    const environment = await validateAttendanceEnvironment(now);

    const today = getTodayKey();
    const lateAfter = parseMinutes(environment.policy.lateAfterTime);
    const currentMinutes = getCurrentMinutes(now);
    const attendanceData = {
  userId: user.uid,

  userEmail: user.email || "",

  date: today,

  checkIn: formatTime(now),

  checkInTimestamp: Timestamp.fromDate(now),

  checkOut: null,

  checkOutTimestamp: null,

  status: lateAfter !== null && currentMinutes > lateAfter ? "Late" : "Present",

  attendanceMode: environment.location ? "office" : "policy",
  checkInLocation: environment.location,
  checkInDistanceMeters: environment.distanceMeters,

  workingMinutes: 0,

  createdAt: serverTimestamp(),

  updatedAt: serverTimestamp(),
};

    // Use an auto-generated attendance document ID. Ownership is enforced by
    // Firestore rules through the userId field, and the pre-check above keeps
    // the normal UI flow to one record per user/day.
    const documentReference = await addDoc(
      collection(db, ATTENDANCE_COLLECTION),
      attendanceData
    );

    try {
      await createNotification({
        userId: user.uid,
        title: "Attendance checked in",
        message: `Your attendance was recorded at ${attendanceData.checkIn}.`,
        type: "success",
        link: "/attendance",
      });
    } catch {
      // Optional notification; attendance remains successful.
    }
    await notifyManagementSafely({
      title: "Employee checked in",
      message: `${user.email || "An employee"} checked in at ${attendanceData.checkIn}.`,
      type: "info",
      link: "/attendance",
    });

    return {
      id: documentReference.id,
      ...attendanceData,
    };
  } catch (error) {
    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| CHECK OUT
|--------------------------------------------------------------------------
*/

export const checkOut = async () => {
  try {
    const user = getCurrentUser();
    const attendance =
      await getTodayAttendance();

    if (!attendance) {
      throw new Error(
        "Please check in first."
      );
    }

    if (attendance.checkOut) {
      throw new Error(
        "You have already checked out today."
      );
    }

    const now = new Date();

    let workingMinutes = 0;

    /*
    |--------------------------------------------------------------------------
    | CALCULATE WORKING TIME
    |--------------------------------------------------------------------------
    */

    if (attendance.checkInTimestamp) {
      const checkInDate =
        attendance.checkInTimestamp?.toDate?.();

      if (checkInDate) {
        const difference =
          now.getTime() -
          checkInDate.getTime();

        workingMinutes = Math.max(
          0,
          Math.floor(
            difference / 60000
          )
        );
      }
    }

    const attendanceRef = doc(
      db,
      ATTENDANCE_COLLECTION,
      attendance.id
    );

    const checkoutTime =
      formatTime(now);

    await updateDoc(
      attendanceRef,
      {
        checkOut: checkoutTime,

        checkOutTimestamp:
          serverTimestamp(),

        workingMinutes,

        status: "Completed",

        updatedAt:
          serverTimestamp(),
      }
    );

    try {
      await notifyManagementSafely({
        title: "Employee checked out",
        message: `${user.email || "An employee"} checked out at ${checkoutTime}. Working time: ${Math.floor(workingMinutes / 60)}h ${workingMinutes % 60}m.`,
        type: "info",
        link: "/attendance",
      });
    } catch {
      // Optional notification; checkout remains successful.
    }

    return {
      ...attendance,
      id: attendance.id,
      checkOut: checkoutTime,
      workingMinutes,
      status: "Completed",
    };
  } catch (error) {
    throw error;
  }
};


/*
|--------------------------------------------------------------------------
| REOPEN ATTENDANCE (MANAGEMENT ONLY)
|--------------------------------------------------------------------------
|
| Reopening never changes the original check-in. It only clears an accidental
| checkout so the employee can continue and check out again. Every reopen is
| recorded in a separate audit collection with the reason and actor.
*/

export const reopenAttendance = async (attendanceId, reason) => {
  const user = getCurrentUser();
  const cleanReason = String(reason || "").trim();
  if (!attendanceId) throw new Error("Attendance record is required.");
  if (cleanReason.length < 5) throw new Error("Please enter a reason of at least 5 characters.");

  const reference = doc(db, ATTENDANCE_COLLECTION, attendanceId);
  const snapshot = await getDoc(reference);
  if (!snapshot.exists()) throw new Error("Attendance record not found.");

  const current = snapshot.data();
  if (!current.checkOut) throw new Error("This attendance is already open.");

  const previous = {
    checkIn: current.checkIn || null,
    checkOut: current.checkOut || null,
    status: current.status || null,
    workingMinutes: Number(current.workingMinutes) || 0,
  };

  await updateDoc(reference, {
    checkOut: null,
    checkOutTimestamp: null,
    workingMinutes: 0,
    status: "Present",
    reopenedAt: serverTimestamp(),
    reopenedBy: user.uid,
    reopenReason: cleanReason,
    updatedAt: serverTimestamp(),
  });

  try {
    await addDoc(collection(db, "attendanceAudit"), {
      attendanceId,
      userId: current.userId || "",
      userEmail: current.userEmail || "",
      action: "reopen",
      reason: cleanReason,
      previous,
      actorUid: user.uid,
      actorEmail: user.email || "",
      createdAt: serverTimestamp(),
    });
  } catch {
    // The attendance correction has already been committed. Audit storage is
    // retried/available once the latest Firestore rules are deployed, but it
    // must never make a successful reopen look like a failed operation.
  }

  try {
    await createNotification({
      userId: current.userId,
      title: "Attendance reopened",
      message: `Your ${current.date || "attendance"} record was reopened by management. You can check out again.`,
      type: "info",
      link: "/attendance",
    });
  } catch {
    // Notification is optional; the attendance correction remains successful.
  }

  return {
    id: attendanceId,
    ...current,
    checkOut: null,
    checkOutTimestamp: null,
    workingMinutes: 0,
    status: "Present",
    reopenedBy: user.uid,
    reopenReason: cleanReason,
  };
};

/*
|--------------------------------------------------------------------------
| GET ATTENDANCE HISTORY
|--------------------------------------------------------------------------
*/

export const getAttendanceHistory =
  async (maximum = 30) => {
    try {
      const user = getCurrentUser();

      const attendanceRef =
        collection(
          db,
          ATTENDANCE_COLLECTION
        );

      /*
      |--------------------------------------------------------------------------
      | ONLY USER FILTER
      | Avoids composite index requirement.
      |--------------------------------------------------------------------------
      */

      const q = query(
        attendanceRef,
        where(
          "userId",
          "==",
          user.uid
        )
      );

      const snapshot =
        await getDocs(q);

      const records =
        snapshot.docs.map(
          (attendanceDoc) => ({
            id: attendanceDoc.id,
            ...attendanceDoc.data(),
          })
        );

      /*
      |--------------------------------------------------------------------------
      | CLIENT-SIDE SORT
      |--------------------------------------------------------------------------
      */

      records.sort((a, b) => {
        const dateA =
          a.date || "";

        const dateB =
          b.date || "";

        return dateB.localeCompare(
          dateA
        );
      });

      return records.slice(
        0,
        maximum
      );
    } catch (error) {
      console.error(
        "Error fetching attendance history:",
        error
      );

      throw error;
    }
  };


/*
|--------------------------------------------------------------------------
| MANAGEMENT ATTENDANCE HISTORY
|--------------------------------------------------------------------------
*/
export const getAttendanceHistoryForRole = async (role, maximum = 500) => {
  const user = getCurrentUser();
  const isManagement = [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER].includes(role);
  if (!isManagement) return getAttendanceHistory(maximum);

  const [attendanceSnapshot, employees] = await Promise.all([
    getDocs(collection(db, ATTENDANCE_COLLECTION)),
    getEmployees(),
  ]);

  const byUid = new Map();
  const byEmail = new Map();
  (employees || []).forEach((employee) => {
    if (employee.uid) byUid.set(employee.uid, employee);
    if (employee.email) byEmail.set(String(employee.email).toLowerCase(), employee);
  });

  const records = attendanceSnapshot.docs.map((attendanceDoc) => {
    const data = attendanceDoc.data();
    const employee = byUid.get(data.userId) || byEmail.get(String(data.userEmail || "").toLowerCase());
    return {
      id: attendanceDoc.id,
      ...data,
      employeeName: employee?.fullName || employee?.name || data.userEmail || "Employee",
      employeeCode: employee?.employeeCode || "",
      department: employee?.department || "",
    };
  });

  records.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  return records.slice(0, maximum);
};

/*
|--------------------------------------------------------------------------
| GET ATTENDANCE BY DATE
|--------------------------------------------------------------------------
*/

export const getAttendanceByDate =
  async (date) => {
    try {
      if (!date) {
        throw new Error(
          "Date is required."
        );
      }

      const user = getCurrentUser();

      const attendanceRef =
        collection(
          db,
          ATTENDANCE_COLLECTION
        );

      const q = query(
        attendanceRef,
        where(
          "userId",
          "==",
          user.uid
        ),
        where(
          "date",
          "==",
          date
        ),
        limit(1)
      );

      const snapshot =
        await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      const attendanceDoc =
        snapshot.docs[0];

      return {
        id: attendanceDoc.id,
        ...attendanceDoc.data(),
      };
    } catch (error) {
      console.error(
        "Error fetching attendance by date:",
        error
      );

      throw error;
    }
  };

/*
|--------------------------------------------------------------------------
| FORMAT WORKING TIME
|--------------------------------------------------------------------------
*/

export const formatWorkingTime = (
  minutes = 0
) => {
  const safeMinutes = Math.max(
    0,
    Number(minutes) || 0
  );

  const hours = Math.floor(
    safeMinutes / 60
  );

  const remainingMinutes =
    safeMinutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}m`;
  }

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
};

/*
|--------------------------------------------------------------------------
| FORMAT ATTENDANCE DATE
|--------------------------------------------------------------------------
*/

export const formatAttendanceDate = (
  date
) => {
  if (!date) {
    return "—";
  }

  const parsedDate =
    date?.toDate?.() ||
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
};