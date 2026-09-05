
/*
|--------------------------------------------------------------------------
| NOTIFICATION UTILITIES
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| NOTIFICATION TYPES
|--------------------------------------------------------------------------
*/

export const NOTIFICATION_TYPES = {
  INFO: "info",
  SUCCESS: "success",
  WARNING: "warning",
  ERROR: "error",
};


/*
|--------------------------------------------------------------------------
| NOTIFICATION ICON TYPE
|--------------------------------------------------------------------------
*/

export const getNotificationType = (
  type
) => {
  const allowedTypes = Object.values(
    NOTIFICATION_TYPES
  );

  if (allowedTypes.includes(type)) {
    return type;
  }

  return NOTIFICATION_TYPES.INFO;
};


/*
|--------------------------------------------------------------------------
| NOTIFICATION TITLE
|--------------------------------------------------------------------------
*/

export const getNotificationTitle = (
  type
) => {
  switch (type) {
    case NOTIFICATION_TYPES.SUCCESS:
      return "Success";

    case NOTIFICATION_TYPES.WARNING:
      return "Warning";

    case NOTIFICATION_TYPES.ERROR:
      return "Error";

    default:
      return "Information";
  }
};


/*
|--------------------------------------------------------------------------
| UNREAD COUNT
|--------------------------------------------------------------------------
*/

export const getUnreadCount = (
  notifications = []
) => {
  if (!Array.isArray(notifications)) {
    return 0;
  }

  return notifications.filter(
    (notification) =>
      notification?.read === false
  ).length;
};


/*
|--------------------------------------------------------------------------
| SORT NOTIFICATIONS
|--------------------------------------------------------------------------
*/

export const sortNotifications = (
  notifications = []
) => {
  if (!Array.isArray(notifications)) {
    return [];
  }

  return [...notifications].sort(
    (a, b) => {
      const dateA =
        a?.createdAt?.toDate?.() ||
        new Date(
          a?.createdAt || 0
        );

      const dateB =
        b?.createdAt?.toDate?.() ||
        new Date(
          b?.createdAt || 0
        );

      return (
        dateB.getTime() -
        dateA.getTime()
      );
    }
  );
};


/*
|--------------------------------------------------------------------------
| FILTER UNREAD
|--------------------------------------------------------------------------
*/

export const getUnreadNotifications = (
  notifications = []
) => {
  if (!Array.isArray(notifications)) {
    return [];
  }

  return notifications.filter(
    (notification) =>
      notification?.read === false
  );
};


/*
|--------------------------------------------------------------------------
| MARK LOCAL READ
|--------------------------------------------------------------------------
*/

export const markLocalNotificationAsRead = (
  notifications = [],
  notificationId
) => {
  if (!Array.isArray(notifications)) {
    return [];
  }

  return notifications.map(
    (notification) =>
      notification.id ===
      notificationId
        ? {
            ...notification,
            read: true,
          }
        : notification
  );
};


/*
|--------------------------------------------------------------------------
| MARK ALL LOCAL READ
|--------------------------------------------------------------------------
*/

export const markAllLocalNotificationsAsRead = (
  notifications = []
) => {
  if (!Array.isArray(notifications)) {
    return [];
  }

  return notifications.map(
    (notification) => ({
      ...notification,
      read: true,
    })
  );
};


/*
|--------------------------------------------------------------------------
| NORMALIZE NOTIFICATION
|--------------------------------------------------------------------------
*/

export const normalizeNotification = (
  notification
) => {
  if (!notification) {
    return null;
  }

  return {
    id: notification.id || "",
    userId:
      notification.userId || "",
    title:
      notification.title || "",
    message:
      notification.message || "",
    type: getNotificationType(
      notification.type
    ),
    link:
      notification.link || "",
    read:
      Boolean(notification.read),
    createdAt:
      notification.createdAt || null,
    updatedAt:
      notification.updatedAt || null,
  };
};
