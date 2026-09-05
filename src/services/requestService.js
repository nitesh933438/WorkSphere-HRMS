import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { auth, db } from "../config/firebase";
import { ROLES } from "../constants/roleConstants";
import { createNotification, notifyManagementSafely } from "./notificationService";

/*
|--------------------------------------------------------------------------
| COLLECTION
|--------------------------------------------------------------------------
*/

const REQUESTS_COLLECTION = "requests";

/*
|--------------------------------------------------------------------------
| CURRENT USER
|--------------------------------------------------------------------------
*/

const getCurrentUser = () => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("You must be logged in.");
  }

  return user;
};

const getCurrentUserRole = async () => {
  const user = getCurrentUser();
  const snapshot = await getDoc(doc(db, "users", user.uid));
  return snapshot.exists() ? snapshot.data()?.role : ROLES.EMPLOYEE;
};

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const normalizeText = (value) => {
  return typeof value === "string" ? value.trim() : "";
};

const getTimestampValue = (timestamp) => {
  if (!timestamp) {
    return 0;
  }

  if (typeof timestamp.toMillis === "function") {
    return timestamp.toMillis();
  }

  if (typeof timestamp.seconds === "number") {
    return timestamp.seconds * 1000;
  }

  if (timestamp instanceof Date) {
    return timestamp.getTime();
  }

  return 0;
};

const sortRequests = (requests) => {
  return [...requests].sort((a, b) => {
    return (
      getTimestampValue(b.createdAt) -
      getTimestampValue(a.createdAt)
    );
  });
};

/*
|--------------------------------------------------------------------------
| CREATE REQUEST
|--------------------------------------------------------------------------
*/

export const createRequest = async (requestData) => {
  try {
    const user = getCurrentUser();

    if (!requestData) {
      throw new Error("Request data is required.");
    }

    const title = normalizeText(requestData.title);
    const category = normalizeText(requestData.category);
    const description = normalizeText(requestData.description);
    const priority =
      normalizeText(requestData.priority) || "Normal";

    if (!title) {
      throw new Error("Request title is required.");
    }

    if (!category) {
      throw new Error("Request category is required.");
    }

    if (!description) {
      throw new Error("Request description is required.");
    }

    const requestRecord = {
      userId: user.uid,

      userEmail: user.email || "",

      employeeId: normalizeText(
        requestData.employeeId ||
          user.employeeId ||
          ""
      ),

      employeeName: normalizeText(
        requestData.employeeName ||
          user.displayName ||
          ""
      ),

      title,

      category,

      description,

      priority,

      status: "Pending",

      adminComment: "",

      reviewedBy: "",

      reviewedAt: null,

      createdAt: serverTimestamp(),

      updatedAt: serverTimestamp(),
    };

    const requestReference = await addDoc(
      collection(db, REQUESTS_COLLECTION),
      requestRecord
    );

    try {
      await createNotification({
        userId: user.uid,
        title: "Request submitted",
        message: `${title} was submitted and is now pending review.`,
        type: "info",
        link: "/requests",
      });
    } catch (notificationError) {
      console.error("Request notification failed:", notificationError);
    }
    await notifyManagementSafely({
      title: "New request submitted",
      message: `${requestRecord.employeeName || user.email || "An employee"} submitted a ${category} request: ${title}.`,
      type: "info",
      link: "/requests",
    });

    return {
      id: requestReference.id,

      ...requestRecord,

      createdAt: new Date(),

      updatedAt: new Date(),
    };
  } catch (error) {
    console.error("Create request error:", error);

    throw new Error(
      error?.message ||
        "Unable to create request."
    );
  }
};

/*
|--------------------------------------------------------------------------
| GET MY REQUESTS
|--------------------------------------------------------------------------
*/

export const getMyRequests = async () => {
  try {
    const user = getCurrentUser();

    const requestsQuery = query(
      collection(db, REQUESTS_COLLECTION),
      where("userId", "==", user.uid)
    );

    const snapshot = await getDocs(
      requestsQuery
    );

    const requests = snapshot.docs.map(
      (requestDocument) => ({
        id: requestDocument.id,
        ...requestDocument.data(),
      })
    );

    return sortRequests(requests);
  } catch (error) {
    console.error(
      "Get my requests error:",
      error
    );

    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| GET REQUEST BY ID
|--------------------------------------------------------------------------
*/

export const getRequestById = async (
  requestId
) => {
  try {
    const user = getCurrentUser();

    if (!requestId) {
      throw new Error(
        "Request ID is required."
      );
    }

    const role = await getCurrentUserRole();
    let found = null;

    if ([ROLES.ADMIN, ROLES.HR, ROLES.MANAGER].includes(role)) {
      const snapshot = await getDoc(doc(db, REQUESTS_COLLECTION, requestId));
      if (snapshot.exists()) found = snapshot;
    } else {
      const requestsQuery = query(collection(db, REQUESTS_COLLECTION), where("userId", "==", user.uid));
      const snapshot = await getDocs(requestsQuery);
      found = snapshot.docs.find((item) => item.id === requestId) || null;
    }

    if (!found) throw new Error("Request not found.");

    return {
      id: found.id,
      ...found.data(),
    };
  } catch (error) {
    console.error(
      "Get request error:",
      error
    );

    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE REQUEST
|--------------------------------------------------------------------------
*/

export const updateRequest = async (
  requestId,
  updates
) => {
  try {
    const user = getCurrentUser();

    if (!requestId) {
      throw new Error(
        "Request ID is required."
      );
    }

    if (!updates) {
      throw new Error(
        "Update data is required."
      );
    }

    const existingRequest =
      await getRequestById(requestId);

    if (
      existingRequest.status !==
      "Pending"
    ) {
      throw new Error(
        "Only pending requests can be updated."
      );
    }

    const safeUpdates = {
      ...updates,
      updatedAt: serverTimestamp(),
    };

    /*
    |--------------------------------------------------------------------------
    | PROTECTED FIELDS
    |--------------------------------------------------------------------------
    */

    delete safeUpdates.userId;
    delete safeUpdates.userEmail;
    delete safeUpdates.employeeId;
    delete safeUpdates.status;
    delete safeUpdates.adminComment;
    delete safeUpdates.reviewedBy;
    delete safeUpdates.reviewedAt;
    delete safeUpdates.createdAt;

    /*
    |--------------------------------------------------------------------------
    | NORMALIZE
    |--------------------------------------------------------------------------
    */

    if (
      safeUpdates.title !== undefined
    ) {
      safeUpdates.title =
        normalizeText(
          safeUpdates.title
        );
    }

    if (
      safeUpdates.category !== undefined
    ) {
      safeUpdates.category =
        normalizeText(
          safeUpdates.category
        );
    }

    if (
      safeUpdates.description !== undefined
    ) {
      safeUpdates.description =
        normalizeText(
          safeUpdates.description
        );
    }

    if (
      safeUpdates.priority !== undefined
    ) {
      safeUpdates.priority =
        normalizeText(
          safeUpdates.priority
        );
    }

    if (
      safeUpdates.title !== undefined &&
      !safeUpdates.title
    ) {
      throw new Error(
        "Request title is required."
      );
    }

    if (
      safeUpdates.category !== undefined &&
      !safeUpdates.category
    ) {
      throw new Error(
        "Request category is required."
      );
    }

    if (
      safeUpdates.description !== undefined &&
      !safeUpdates.description
    ) {
      throw new Error(
        "Request description is required."
      );
    }

    await updateDoc(
      doc(
        db,
        REQUESTS_COLLECTION,
        requestId
      ),
      safeUpdates
    );

    await createNotification({
      userId: existingRequest.userId,
      title: "Request updated",
      message: `Your request "${existingRequest.title || "Request"}" was updated.`,
      type: "info",
      link: `/requests/${requestId}`,
    }).catch((e) => console.error("Request update notification failed:", e));

    return {
      id: requestId,

      ...existingRequest,

      ...safeUpdates,

      userId: user.uid,
    };
  } catch (error) {
    console.error(
      "Update request error:",
      error
    );

    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| CANCEL REQUEST
|--------------------------------------------------------------------------
*/

export const cancelRequest = async (
  requestId
) => {
  try {
    getCurrentUser();

    if (!requestId) {
      throw new Error(
        "Request ID is required."
      );
    }

    const existingRequest =
      await getRequestById(
        requestId
      );

    if (
      existingRequest.status !==
      "Pending"
    ) {
      throw new Error(
        "Only pending requests can be cancelled."
      );
    }

    await updateDoc(
      doc(
        db,
        REQUESTS_COLLECTION,
        requestId
      ),
      {
        status: "Cancelled",

        updatedAt:
          serverTimestamp(),
      }
    );

    await notifyManagementSafely({
      title: "Request cancelled",
      message: `${existingRequest.employeeName || "An employee"} cancelled the request "${existingRequest.title || "Request"}".`,
      type: "warning",
      link: "/requests",
    });

    return {
      id: requestId,
      status: "Cancelled",
    };
  } catch (error) {
    console.error(
      "Cancel request error:",
      error
    );

    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| DELETE REQUEST
|--------------------------------------------------------------------------
*/

export const deleteRequest = async (
  requestId
) => {
  try {
    getCurrentUser();

    if (!requestId) {
      throw new Error(
        "Request ID is required."
      );
    }

    const existingRequest =
      await getRequestById(
        requestId
      );

    if (
      existingRequest.status !==
      "Pending"
    ) {
      throw new Error(
        "Only pending requests can be deleted."
      );
    }

    await deleteDoc(
      doc(
        db,
        REQUESTS_COLLECTION,
        requestId
      )
    );

    return true;
  } catch (error) {
    console.error(
      "Delete request error:",
      error
    );

    throw error;
  }
};


/*
|--------------------------------------------------------------------------
| MANAGEMENT REQUESTS
|--------------------------------------------------------------------------
*/

export const getManagementRequests = async () => {
  getCurrentUser();
  const snapshot = await getDocs(collection(db, REQUESTS_COLLECTION));
  const requests = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  return sortRequests(requests);
};

export const getRequestsForRole = async (role) => {
  if ([ROLES.ADMIN, ROLES.HR, ROLES.MANAGER].includes(role)) {
    return getManagementRequests();
  }
  return getMyRequests();
};


export const createManualAttendanceRequest = async ({ date, reason }) => {
  const user = getCurrentUser();
  const cleanReason = normalizeText(reason);
  if (!cleanReason || cleanReason.length < 5) throw new Error("Please provide a valid reason for manual attendance.");
  const requestedDate = normalizeText(date) || new Date().toISOString().slice(0, 10);
  const existing = await getMyRequests();
  const duplicate = existing.find((item) => item.requestType === "attendance_manual" && item.attendanceDate === requestedDate && item.status === "Pending");
  if (duplicate) throw new Error("A manual attendance request for this date is already pending.");
  const requestRecord = {
    userId: user.uid, userEmail: user.email || "", employeeId: normalizeText(user.employeeId || ""),
    employeeName: normalizeText(user.displayName || user.email || "Employee"),
    title: `Manual attendance request - ${requestedDate}`, category: "Attendance", priority: "High",
    description: cleanReason, requestType: "attendance_manual", attendanceDate: requestedDate,
    requestedAt: serverTimestamp(), status: "Pending", adminComment: "", reviewedBy: "", reviewedAt: null,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, REQUESTS_COLLECTION), requestRecord);
  await notifyManagementSafely({ title: "Manual attendance request", message: `${requestRecord.employeeName} requested manual attendance for ${requestedDate}.`, type: "warning", link: "/requests" });
  await createNotification({ userId: user.uid, title: "Manual attendance request submitted", message: `Your manual attendance request for ${requestedDate} is pending HR/Admin review.`, type: "info", link: `/requests/${ref.id}` }).catch(() => {});
  return { id: ref.id, ...requestRecord };
};

export const reviewRequest = async (requestId, status, comment = "") => {
  const user = getCurrentUser();
  if (!["Approved", "Rejected"].includes(status)) {
    throw new Error("Invalid request status.");
  }
  if (!requestId) throw new Error("Request ID is required.");

  const ref = doc(db, REQUESTS_COLLECTION, requestId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Request not found.");
  const existing = { id: snap.id, ...snap.data() };
  if (existing.status !== "Pending") throw new Error("Only pending requests can be reviewed.");
  const role = await getCurrentUserRole();
  if (existing.requestType === "attendance_manual" && ![ROLES.ADMIN, ROLES.HR].includes(role)) {
    throw new Error("Only Admin or HR can approve manual attendance requests.");
  }

  if (status === "Approved" && existing.requestType === "attendance_manual") {
    const attendanceDate = existing.attendanceDate || new Date().toISOString().slice(0, 10);
    const existingAttendance = await getDocs(query(collection(db, "attendance"), where("userId", "==", existing.userId), where("date", "==", attendanceDate), limit(1)));
    if (existingAttendance.empty) {
      await addDoc(collection(db, "attendance"), {
        userId: existing.userId, userEmail: existing.userEmail || "", date: attendanceDate,
        checkIn: existing.manualCheckInTime || "Manual approval", checkInTimestamp: serverTimestamp(),
        checkOut: null, checkOutTimestamp: null, status: "Present", workingMinutes: 0,
        attendanceMode: "manual", manualAttendance: true, manualReason: existing.description || "",
        manualApprovedBy: user.uid, manualApprovedByName: user.displayName || user.email || user.uid,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
    }
  }

  await updateDoc(ref, {
    status,
    adminComment: normalizeText(comment),
    reviewedBy: user.displayName || user.email || user.uid,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await createNotification({
    userId: existing.userId,
    title: `Request ${status.toLowerCase()}`,
    message: `Your request "${existing.title || "Request"}" was ${status.toLowerCase()}.${comment ? ` Comment: ${comment}` : ""}`,
    type: status === "Approved" ? "success" : "warning",
    link: `/requests/${requestId}`,
  });

  return { ...existing, status, adminComment: comment };
};

/*
|--------------------------------------------------------------------------
| REQUEST STATISTICS
|--------------------------------------------------------------------------
*/

export const getRequestStatistics =
  async () => {
    try {
      const requests =
        await getMyRequests();

      const statistics = {
        total: requests.length,

        pending: 0,

        approved: 0,

        rejected: 0,

        cancelled: 0,
      };

      requests.forEach(
        (request) => {
          switch (
            request.status
          ) {
            case "Approved":
              statistics.approved += 1;
              break;

            case "Rejected":
              statistics.rejected += 1;
              break;

            case "Cancelled":
              statistics.cancelled += 1;
              break;

            case "Pending":
            default:
              statistics.pending += 1;
              break;
          }
        }
      );

      return statistics;
    } catch (error) {
      console.error(
        "Get request statistics error:",
        error
      );

      throw error;
    }
  };

/*
|--------------------------------------------------------------------------
| DEFAULT EXPORT
|--------------------------------------------------------------------------
*/

export default {
  createRequest,
  createManualAttendanceRequest,

  getMyRequests,

  getRequestById,

  updateRequest,

  cancelRequest,

  deleteRequest,

  getRequestStatistics,
};