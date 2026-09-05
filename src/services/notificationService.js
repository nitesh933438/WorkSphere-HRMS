import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { auth, db } from "../config/firebase";


/*
|--------------------------------------------------------------------------
| COLLECTION
|--------------------------------------------------------------------------
*/

const notificationsCollection =
  collection(
    db,
    "notifications"
  );


/*
|--------------------------------------------------------------------------
| CURRENT USER
|--------------------------------------------------------------------------
*/

const getCurrentUser = () => {
  const user =
    auth.currentUser;

  if (!user) {
    throw new Error(
      "User is not authenticated."
    );
  }

  return user;
};

const MANAGEMENT_ROLES = new Set(["admin", "hr", "manager"]);


/*
|--------------------------------------------------------------------------
| NORMALIZE
|--------------------------------------------------------------------------
*/

const normalizeNotification = (
  notificationDocument
) => {
  return {
    id:
      notificationDocument.id,

    ...notificationDocument.data(),
  };
};

const isNotificationReadForUser = (notification, userId) => {
  if (!notification || !userId) return Boolean(notification?.read);
  if (notification.audience === "user" || notification.userId === userId) {
    return notification.read === true;
  }
  return notification.readBy?.[userId] === true;
};

const isNotificationDismissedForUser = (notification, userId) => {
  if (!notification || !userId) return false;
  return notification.dismissedBy?.[userId] === true;
};

const withUserState = (notification, userId) => ({
  ...notification,
  read: isNotificationReadForUser(notification, userId),
  dismissed: isNotificationDismissedForUser(notification, userId),
});


/*
|--------------------------------------------------------------------------
| CREATE PERSONAL NOTIFICATION
|--------------------------------------------------------------------------
*/

export const createNotification =
  async ({
    userId,
    title,
    message,
    type = "info",
    link = "",
    announcementId = "",
  }) => {
    try {
      getCurrentUser();

      if (!userId) {
        throw new Error(
          "User ID is required."
        );
      }

      if (!title?.trim()) {
        throw new Error(
          "Notification title is required."
        );
      }

      if (!message?.trim()) {
        throw new Error(
          "Notification message is required."
        );
      }

      const notificationData = {
        userId:
          userId.trim(),

        title:
          title.trim(),

        message:
          message.trim(),

        type:
          type || "info",

        link:
          link?.trim() || "",

        audience:
          "user",

        announcementId:
          announcementId?.trim() || "",

        read:
          false,

        readBy:
          {},

        dismissedBy:
          {},

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp(),
      };

      const reference =
        await addDoc(
          notificationsCollection,
          notificationData
        );

      return {
        id: reference.id,
        ...notificationData,
      };
    } catch (error) {
      console.error(
        "Error creating notification:",
        error
      );

      throw error;
    }
  };


/*
|--------------------------------------------------------------------------
| CREATE COMPANY-WIDE ANNOUNCEMENT
|--------------------------------------------------------------------------
|
| IMPORTANT:
| No employee UID required.
|
| One document with audience = "all".
|
*/

export const createAnnouncementNotification =
  async ({
    title,
    message,
    link = "/announcements",
    announcementId = "",
    type = "announcement",
  }) => {
    try {
      getCurrentUser();

      if (!title?.trim()) {
        throw new Error(
          "Announcement title is required."
        );
      }

      if (!message?.trim()) {
        throw new Error(
          "Announcement message is required."
        );
      }

      const notificationData = {
        userId:
          "",

        title:
          title.trim(),

        message:
          message.trim(),

        type:
          type || "announcement",

        link:
          link?.trim() ||
          "/announcements",

        audience:
          "all",

        announcementId:
          announcementId?.trim() || "",

        read:
          false,

        readBy:
          {},

        dismissedBy:
          {},

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp(),
      };

      const reference =
        await addDoc(
          notificationsCollection,
          notificationData
        );

      console.log(
        "Company-wide announcement notification created:",
        reference.id
      );

      return {
        id: reference.id,
        ...notificationData,
      };
    } catch (error) {
      console.error(
        "Error creating announcement notification:",
        error
      );

      throw error;
    }
  };


/*
|--------------------------------------------------------------------------
| CREATE ROLE/AUDIENCE NOTIFICATION
|--------------------------------------------------------------------------
| Used for real workflow events that should reach every management user
| without creating one document per manager/HR account.
*/
export const createAudienceNotification = async ({
  audience = "management",
  title,
  message,
  type = "info",
  link = "",
  actorUid = "",
}) => {
  try {
    const user = getCurrentUser();
    if (!title?.trim()) throw new Error("Notification title is required.");
    if (!message?.trim()) throw new Error("Notification message is required.");

    const notificationData = {
      userId: "",
      title: title.trim(),
      message: message.trim(),
      type: type || "info",
      link: link?.trim() || "/notifications",
      audience,
      actorUid: actorUid || user.uid,
      read: false,
      readBy: {},
      dismissedBy: {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const reference = await addDoc(notificationsCollection, notificationData);
    return { id: reference.id, ...notificationData };
  } catch (error) {
    console.error("Error creating audience notification:", error);
    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| SAFE WORKFLOW NOTIFICATION HELPERS
|--------------------------------------------------------------------------
*/
export const notifyManagementSafely = async (payload) => {
  try {
    return await createAudienceNotification({
      audience: "management",
      ...payload,
    });
  } catch {
    // Notifications are optional workflow enhancements. A permission or
    // network issue must never pollute the console or fail the main action.
    return null;
  }
};

export const notifyUserSafely = async (payload) => {
  try {
    return await createNotification(payload);
  } catch {
    return null;
  }
};

/*
|--------------------------------------------------------------------------
| GET PERSONAL NOTIFICATIONS
|--------------------------------------------------------------------------
*/

const getPersonalNotifications =
  async (userId) => {
    const personalQuery =
      query(
        notificationsCollection,
        where(
          "userId",
          "==",
          userId
        )
      );

    const snapshot =
      await getDocs(
        personalQuery
      );

    return snapshot.docs.map(
      normalizeNotification
    );
  };


/*
|--------------------------------------------------------------------------
| GET COMPANY NOTIFICATIONS
|--------------------------------------------------------------------------
*/

const getCompanyNotifications = async () => {
    const companyQuery = query(
      notificationsCollection,
      where("audience", "==", "all")
    );
    const snapshot = await getDocs(companyQuery);
    return snapshot.docs.map(normalizeNotification);
  };

const getManagementNotifications = async () => {
    const managementQuery = query(
      notificationsCollection,
      where("audience", "==", "management")
    );
    const snapshot = await getDocs(managementQuery);
    return snapshot.docs.map(normalizeNotification);
  };


/*
|--------------------------------------------------------------------------
| GET ALL USER NOTIFICATIONS
|--------------------------------------------------------------------------
*/

export const getNotifications = async (userId, role = "employee") => {
  try {
    if (!userId) throw new Error("User ID is required.");

    const [personal, company] = await Promise.all([
      getPersonalNotifications(userId),
      getCompanyNotifications(),
    ]);

    const management = MANAGEMENT_ROLES.has(role)
      ? await getManagementNotifications()
      : [];

    const map = new Map();
    [...personal, ...company, ...management].forEach((notification) => {
      if (!isNotificationDismissedForUser(notification, userId)) {
        map.set(notification.id, withUserState(notification, userId));
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate?.() ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    });
  } catch (error) {
    // Notification availability must never break the workspace shell.
    return [];
  }
};

/*
|--------------------------------------------------------------------------
| GET UNREAD
|--------------------------------------------------------------------------
*/

export const getUnreadNotifications =
  async (userId, role = "employee") => {
    const notifications =
      await getNotifications(
        userId,
        role
      );

    return notifications.filter(
      (notification) =>
        notification.read !== true
    );
  };


/*
|--------------------------------------------------------------------------
| GET UNREAD COUNT
|--------------------------------------------------------------------------
*/

export const getUnreadNotificationCount = async (userId, role = "employee") => {
  const notifications = await getNotifications(userId, role);
  return notifications.filter((notification) => notification.read !== true).length;
};


/*
|--------------------------------------------------------------------------
| MARK SINGLE AS READ
|--------------------------------------------------------------------------
*/

export const markNotificationAsRead = async (notificationId) => {
  try {
    const user = getCurrentUser();
    if (!notificationId) throw new Error("Notification ID is required.");

    const notificationRef = doc(db, "notifications", notificationId);
    const snapshot = await getDoc(notificationRef);
    if (!snapshot.exists()) throw new Error("Notification not found.");
    const notification = snapshot.data();

    if (notification.audience === "user" || notification.userId === user.uid) {
      await updateDoc(notificationRef, { read: true, updatedAt: serverTimestamp() });
    } else {
      await updateDoc(notificationRef, {
        [`readBy.${user.uid}`]: true,
        updatedAt: serverTimestamp(),
      });
    }
    return true;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| MARK ALL AS READ
|--------------------------------------------------------------------------
*/

export const markAllNotificationsAsRead = async (userId) => {
  try {
    const user = getCurrentUser();
    if (!userId || user.uid !== userId) throw new Error("User ID is required.");

    const notifications = await getNotifications(userId);
    const unread = notifications.filter((notification) => notification.read !== true);
    if (unread.length === 0) return true;

    await Promise.all(unread.map(async (notification) => {
      const ref = doc(db, "notifications", notification.id);
      if (notification.audience === "user" || notification.userId === user.uid) {
        await updateDoc(ref, { read: true, updatedAt: serverTimestamp() });
      } else {
        await updateDoc(ref, { [`readBy.${user.uid}`]: true, updatedAt: serverTimestamp() });
      }
    }));
    return true;
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| DELETE NOTIFICATION
|--------------------------------------------------------------------------
*/

export const deleteNotification = async (notificationId) => {
  try {
    const user = getCurrentUser();
    if (!notificationId) throw new Error("Notification ID is required.");

    const reference = doc(db, "notifications", notificationId);
    const snapshot = await getDoc(reference);
    if (!snapshot.exists()) throw new Error("Notification not found.");

    const notification = snapshot.data();
    const isPersonal = notification.audience === "user" || notification.userId === user.uid;
    if (isPersonal) {
      await updateDoc(reference, { read: true, dismissedBy: { ...(notification.dismissedBy || {}), [user.uid]: true }, updatedAt: serverTimestamp() });
    } else {
      await updateDoc(reference, { [`dismissedBy.${user.uid}`]: true, updatedAt: serverTimestamp() });
    }
    return true;
  } catch (error) {
    console.error("Error dismissing notification:", error);
    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| CLEAR ALL NOTIFICATIONS
|--------------------------------------------------------------------------
*/

export const clearAllNotifications = async (userId) => {
  try {
    const user = getCurrentUser();
    if (!userId || user.uid !== userId) throw new Error("User ID is required.");

    const notifications = await getNotifications(userId);
    await Promise.all(notifications.map(async (notification) => {
      const ref = doc(db, "notifications", notification.id);
      if (notification.audience === "user" || notification.userId === user.uid) {
        await updateDoc(ref, { read: true, dismissedBy: { ...(notification.dismissedBy || {}), [user.uid]: true }, updatedAt: serverTimestamp() });
      } else {
        await updateDoc(ref, { [`dismissedBy.${user.uid}`]: true, updatedAt: serverTimestamp() });
      }
    }));
    return true;
  } catch (error) {
    console.error("Error clearing notifications:", error);
    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| REAL-TIME SUBSCRIPTION
|--------------------------------------------------------------------------
|
| IMPORTANT:
| We use two simple queries instead of OR + orderBy.
|
| Therefore composite-index error avoid hota hai.
|
*/

export const subscribeNotifications = (userId, callback, role = "employee") => {
  if (!userId || typeof callback !== "function") return () => {};

  const personalQuery = query(notificationsCollection, where("userId", "==", userId));
  const companyQuery = query(notificationsCollection, where("audience", "==", "all"));

  let personalNotifications = [];
  let companyNotifications = [];
  let managementNotifications = [];
  let personalReady = false;
  let companyReady = false;
  let managementReady = true;
  let unsubManagement = () => {};

  const emit = () => {
    if (!personalReady || !companyReady || !managementReady) return;
    const map = new Map();
    [...personalNotifications, ...companyNotifications, ...managementNotifications].forEach((item) => {
      if (!isNotificationDismissedForUser(item, userId)) map.set(item.id, item);
    });
    const merged = Array.from(map.values()).sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate?.() ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    });
    callback(merged.map((notification) => withUserState(notification, userId)));
  };

  const unsubPersonal = onSnapshot(personalQuery, (snapshot) => {
    personalNotifications = snapshot.docs.map(normalizeNotification);
    personalReady = true;
    emit();
  }, () => {
    personalReady = true;
    emit();
  });

  const unsubCompany = onSnapshot(companyQuery, (snapshot) => {
    companyNotifications = snapshot.docs.map(normalizeNotification);
    companyReady = true;
    emit();
  }, () => {
    companyReady = true;
    emit();
  });

  // Only management users subscribe to the management audience. Employees
  // never query this collection, so they cannot see management-only events
  // and do not generate permission errors.
  if (MANAGEMENT_ROLES.has(role)) {
    managementReady = false;
    const managementQuery = query(notificationsCollection, where("audience", "==", "management"));
    unsubManagement = onSnapshot(managementQuery, (snapshot) => {
      managementNotifications = snapshot.docs.map(normalizeNotification);
      managementReady = true;
      emit();
    }, () => {
      // Management notifications are optional for a session. Do not surface
      // expected permission failures as console warnings or break the inbox.
      managementReady = true;
      emit();
    });
  }

  return () => {
    unsubPersonal();
    unsubCompany();
    unsubManagement();
  };
};

/*
|--------------------------------------------------------------------------
| DEFAULT EXPORT
|--------------------------------------------------------------------------
*/

export default {
  createNotification,
  createAudienceNotification,
  notifyManagementSafely,
  notifyUserSafely,
  createAnnouncementNotification,
  getNotifications,
  getUnreadNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
  subscribeNotifications,
};