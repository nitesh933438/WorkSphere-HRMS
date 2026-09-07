import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { auth, db } from "../config/firebase";
import { createNotification, notifyManagementSafely } from "./notificationService";

/*
|--------------------------------------------------------------------------
| COLLECTION
|--------------------------------------------------------------------------
*/

const LEAVES_COLLECTION = "leaves";

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

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const normalizeText = (value) => {
  return typeof value === "string" ? value.trim() : "";
};

const calculateLeaveDays = (startDate, endDate) => {
  if (!startDate || !endDate) {
    return 0;
  }

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    return 0;
  }

  const difference = end.getTime() - start.getTime();

  if (difference < 0) {
    return 0;
  }

  return (
    Math.floor(
      difference / (1000 * 60 * 60 * 24)
    ) + 1
  );
};

/*
|--------------------------------------------------------------------------
| SORT LEAVES
|--------------------------------------------------------------------------
|
| Firestore index ki zarurat na pade isliye sorting
| JavaScript side par ki ja rahi hai.
|--------------------------------------------------------------------------
*/

const getTimestampValue = (timestamp) => {
  if (!timestamp) {
    return 0;
  }

  if (
    typeof timestamp.toMillis === "function"
  ) {
    return timestamp.toMillis();
  }

  if (
    timestamp instanceof Date
  ) {
    return timestamp.getTime();
  }

  if (
    typeof timestamp.seconds === "number"
  ) {
    return timestamp.seconds * 1000;
  }

  return 0;
};

const sortLeavesByCreatedAt = (leaves) => {
  return [...leaves].sort((a, b) => {
    return (
      getTimestampValue(b.createdAt) -
      getTimestampValue(a.createdAt)
    );
  });
};

/*
|--------------------------------------------------------------------------
| CREATE LEAVE
|--------------------------------------------------------------------------
*/

export const createLeave = async (leaveData) => {
  try {
    const user = getCurrentUser();

    if (!leaveData) {
      throw new Error("Leave data is required.");
    }

    const leaveType = normalizeText(
      leaveData.leaveType
    );

    const startDate = normalizeText(
      leaveData.startDate
    );

    const endDate = normalizeText(
      leaveData.endDate
    );

    const reason = normalizeText(
      leaveData.reason
    );

    if (!leaveType) {
      throw new Error("Leave type is required.");
    }

    if (!startDate) {
      throw new Error("Start date is required.");
    }

    if (!endDate) {
      throw new Error("End date is required.");
    }

    if (!reason) {
      throw new Error("Leave reason is required.");
    }

    if (endDate < startDate) {
      throw new Error(
        "End date cannot be before start date."
      );
    }

    const totalDays = calculateLeaveDays(
      startDate,
      endDate
    );

    const leaveRecord = {
      userId: user.uid,

      userEmail: user.email || "",

      employeeId:
        leaveData.employeeId || "",

      employeeName: normalizeText(
        leaveData.employeeName
      ),

      leaveType,

      startDate,

      endDate,

      totalDays,

      reason,

      status: "Pending",

      adminComment: "",

      reviewedBy: "",

      reviewedAt: null,

      createdAt: serverTimestamp(),

      updatedAt: serverTimestamp(),
    };

    const leaveReference = await addDoc(
      collection(
        db,
        LEAVES_COLLECTION
      ),
      leaveRecord
    );

    try {
      await createNotification({
        userId: user.uid,
        title: "Leave request submitted",
        message: `${leaveType} leave request for ${totalDays} day${totalDays === 1 ? "" : "s"} was submitted for approval.`,
        type: "info",
        link: "/leave",
      });
    } catch (notificationError) {
      console.error("Leave notification failed:", notificationError);
    }
    await notifyManagementSafely({
      title: "New leave request",
      message: `${leaveRecord.employeeName || user.email || "An employee"} submitted ${leaveType} leave for ${totalDays} day${totalDays === 1 ? "" : "s"}.`,
      type: "warning",
      link: "/leave",
    });

    return {
      id: leaveReference.id,

      ...leaveRecord,

      createdAt: new Date(),

      updatedAt: new Date(),
    };
  } catch (error) {
    console.error(
      "Create leave error:",
      error
    );

    throw new Error(
      error?.message ||
        "Unable to submit leave request."
    );
  }
};

/*
|--------------------------------------------------------------------------
| GET MY LEAVES
|--------------------------------------------------------------------------
*/

export const getMyLeaves = async () => {
  try {
    const user = getCurrentUser();

    /*
    |--------------------------------------------------------------------------
    | IMPORTANT
    |--------------------------------------------------------------------------
    | orderBy("createdAt") hata diya gaya hai.
    | Isliye composite Firestore index ki zarurat nahi hogi.
    |--------------------------------------------------------------------------
    */

    const leavesQuery = query(
      collection(
        db,
        LEAVES_COLLECTION
      ),
      where(
        "userId",
        "==",
        user.uid
      )
    );

    const snapshot = await getDocs(
      leavesQuery
    );

    const leaves = snapshot.docs.map(
      (leaveDocument) => ({
        id: leaveDocument.id,
        ...leaveDocument.data(),
      })
    );

    return sortLeavesByCreatedAt(
      leaves
    );
  } catch (error) {
    console.error(
      "Get my leaves error:",
      error
    );

    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| GET ALL LEAVES (MANAGEMENT)
|--------------------------------------------------------------------------
*/

export const getAllLeaves = async () => {
  try {
    getCurrentUser();
    const snapshot = await getDocs(collection(db, LEAVES_COLLECTION));
    return sortLeavesByCreatedAt(
      snapshot.docs.map((leaveDocument) => ({
        id: leaveDocument.id,
        ...leaveDocument.data(),
      }))
    );
  } catch (error) {
    console.error("Get all leaves error:", error);
    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| APPROVE / REJECT LEAVE (MANAGEMENT)
|--------------------------------------------------------------------------
*/

export const reviewLeave = async (leaveId, status, comment = "") => {
  try {
    const reviewer = getCurrentUser();
    if (!leaveId) throw new Error("Leave ID is required.");
    if (!["Approved", "Rejected"].includes(status)) {
      throw new Error("Invalid leave decision.");
    }

    const leaveRef = doc(db, LEAVES_COLLECTION, leaveId);
    const snapshot = await getDocs(collection(db, LEAVES_COLLECTION));
    const existing = snapshot.docs.find((item) => item.id === leaveId);
    if (!existing) throw new Error("Leave request not found.");

    const leave = { id: existing.id, ...existing.data() };
    if (leave.status !== "Pending") {
      throw new Error("Only pending leave requests can be reviewed.");
    }

    await updateDoc(leaveRef, {
      status,
      adminComment: normalizeText(comment),
      reviewedBy: reviewer.email || reviewer.uid,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await createNotification({
      userId: leave.userId,
      title: `Leave request ${status.toLowerCase()}`,
      message: `${leave.leaveType || "Leave"} request for ${leave.totalDays || 1} day${Number(leave.totalDays) === 1 ? "" : "s"} was ${status.toLowerCase()}.${comment ? ` Comment: ${comment}` : ""}`,
      type: status === "Approved" ? "success" : "error",
      link: "/leave",
    }).catch((error) => console.error("Leave review notification failed:", error));

    return { ...leave, status };
  } catch (error) {
    console.error("Review leave error:", error);
    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| GET SINGLE LEAVE
|--------------------------------------------------------------------------
*/

export const getLeaveById = async (
  leaveId
) => {
  try {
    const user = getCurrentUser();

    if (!leaveId) {
      throw new Error(
        "Leave ID is required."
      );
    }

    const leavesQuery = query(
      collection(
        db,
        LEAVES_COLLECTION
      ),
      where(
        "userId",
        "==",
        user.uid
      )
    );

    const snapshot = await getDocs(
      leavesQuery
    );

    const found = snapshot.docs.find(
      (item) =>
        item.id === leaveId
    );

    if (!found) {
      throw new Error(
        "Leave request not found."
      );
    }

    return {
      id: found.id,
      ...found.data(),
    };
  } catch (error) {
    console.error(
      "Get leave error:",
      error
    );

    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| GET LEAVE STATISTICS
|--------------------------------------------------------------------------
*/

export const getLeaveStatistics =
  async () => {
    try {
      const leaves =
        await getMyLeaves();

      const statistics = {
        total: leaves.length,

        pending: 0,

        approved: 0,

        rejected: 0,

        cancelled: 0,

        totalDays: 0,

        approvedDays: 0,

        pendingDays: 0,

        rejectedDays: 0,
      };

      leaves.forEach((leave) => {
        const status =
          leave.status || "Pending";

        const days =
          Number(
            leave.totalDays
          ) || 0;

        statistics.totalDays +=
          days;

        switch (status) {
          case "Approved":
            statistics.approved += 1;

            statistics.approvedDays +=
              days;

            break;

          case "Rejected":
            statistics.rejected += 1;

            statistics.rejectedDays +=
              days;

            break;

          case "Cancelled":
            statistics.cancelled += 1;

            break;

          case "Pending":
          default:
            statistics.pending += 1;

            statistics.pendingDays +=
              days;

            break;
        }
      });

      return statistics;
    } catch (error) {
      console.error(
        "Get leave statistics error:",
        error
      );

      throw error;
    }
  };

/*
|--------------------------------------------------------------------------
| CANCEL LEAVE
|--------------------------------------------------------------------------
*/

export const cancelLeave = async (
  leaveId
) => {
  try {
    const user = getCurrentUser();

    if (!leaveId) {
      throw new Error(
        "Leave ID is required."
      );
    }

    const leave =
      await getLeaveById(
        leaveId
      );

    if (
      leave.status !==
      "Pending"
    ) {
      throw new Error(
        "Only pending leave requests can be cancelled."
      );
    }

    await updateDoc(
      doc(
        db,
        LEAVES_COLLECTION,
        leaveId
      ),
      {
        status: "Cancelled",

        updatedAt:
          serverTimestamp(),
      }
    );

    await notifyManagementSafely({
      title: "Leave request cancelled",
      message: `${leave.employeeName || user.email || "An employee"} cancelled a pending leave request.`,
      type: "warning",
      link: "/leave",
    });

    return {
      id: leaveId,
      status: "Cancelled",
      userId: user.uid,
    };
  } catch (error) {
    console.error(
      "Cancel leave error:",
      error
    );

    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE LEAVE
|--------------------------------------------------------------------------
*/

export const updateLeave = async (
  leaveId,
  updates
) => {
  try {
    const user = getCurrentUser();

    if (!leaveId) {
      throw new Error(
        "Leave ID is required."
      );
    }

    if (!updates) {
      throw new Error(
        "Update data is required."
      );
    }

    const existingLeave =
      await getLeaveById(
        leaveId
      );

    if (
      existingLeave.status !==
      "Pending"
    ) {
      throw new Error(
        "Only pending leave requests can be updated."
      );
    }

    const safeUpdates = {
      ...updates,

      updatedAt:
        serverTimestamp(),
    };

    /*
    |--------------------------------------------------------------------------
    | NEVER ALLOW CLIENT TO CHANGE OWNERSHIP
    |--------------------------------------------------------------------------
    */

    delete safeUpdates.userId;

    delete safeUpdates.userEmail;

    delete safeUpdates.status;

    delete safeUpdates.reviewedBy;

    delete safeUpdates.reviewedAt;

    delete safeUpdates.adminComment;

    delete safeUpdates.createdAt;

    /*
    |--------------------------------------------------------------------------
    | NORMALIZE DATA
    |--------------------------------------------------------------------------
    */

    if (
      safeUpdates.leaveType !==
      undefined
    ) {
      safeUpdates.leaveType =
        normalizeText(
          safeUpdates.leaveType
        );
    }

    if (
      safeUpdates.startDate !==
      undefined
    ) {
      safeUpdates.startDate =
        normalizeText(
          safeUpdates.startDate
        );
    }

    if (
      safeUpdates.endDate !==
      undefined
    ) {
      safeUpdates.endDate =
        normalizeText(
          safeUpdates.endDate
        );
    }

    if (
      safeUpdates.reason !==
      undefined
    ) {
      safeUpdates.reason =
        normalizeText(
          safeUpdates.reason
        );
    }

    /*
    |--------------------------------------------------------------------------
    | RECALCULATE DAYS
    |--------------------------------------------------------------------------
    */

    const finalStartDate =
      safeUpdates.startDate ??
      existingLeave.startDate;

    const finalEndDate =
      safeUpdates.endDate ??
      existingLeave.endDate;

    if (
      finalEndDate <
      finalStartDate
    ) {
      throw new Error(
        "End date cannot be before start date."
      );
    }

    safeUpdates.totalDays =
      calculateLeaveDays(
        finalStartDate,
        finalEndDate
      );

    await updateDoc(
      doc(
        db,
        LEAVES_COLLECTION,
        leaveId
      ),
      safeUpdates
    );

    await createNotification({
      userId: existingLeave.userId,
      title: "Leave request updated",
      message: `Your leave request for ${existingLeave.totalDays || 1} day${Number(existingLeave.totalDays) === 1 ? "" : "s"} was updated.`,
      type: "info",
      link: "/leave",
    }).catch((e) => console.error("Leave update notification failed:", e));

    return {
      id: leaveId,

      ...existingLeave,

      ...safeUpdates,

      userId: user.uid,
    };
  } catch (error) {
    console.error(
      "Update leave error:",
      error
    );

    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| DELETE LEAVE
|--------------------------------------------------------------------------
*/

export const deleteLeave = async (
  leaveId
) => {
  try {
    getCurrentUser();

    if (!leaveId) {
      throw new Error(
        "Leave ID is required."
      );
    }

    const leave =
      await getLeaveById(
        leaveId
      );

    if (
      leave.status !==
      "Pending"
    ) {
      throw new Error(
        "Only pending leave requests can be deleted."
      );
    }

    await deleteDoc(
      doc(
        db,
        LEAVES_COLLECTION,
        leaveId
      )
    );

    await createNotification({
      userId: user.uid,
      title: "Leave request deleted",
      message: `${leave.leaveType || "Leave"} request was deleted successfully.`,
      type: "warning",
      link: "/leave",
    }).catch((error) => console.error("Leave delete notification failed:", error));

    await notifyManagementSafely({
      title: "Leave request deleted",
      message: `${leave.employeeName || user.email || "An employee"} deleted a pending leave request.`,
      type: "warning",
      link: "/leave",
    });

    return true;
  } catch (error) {
    console.error(
      "Delete leave error:",
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
  createLeave,

  getMyLeaves,

  getAllLeaves,

  reviewLeave,

  getLeaveById,

  getLeaveStatistics,

  cancelLeave,

  updateLeave,

  deleteLeave,
};