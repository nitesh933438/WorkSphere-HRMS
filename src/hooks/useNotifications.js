import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useAuth } from "../context/AuthContext";

import {
  clearAllNotifications,
  deleteNotification,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../services/notificationService";

/*
|--------------------------------------------------------------------------
| USE NOTIFICATIONS
|--------------------------------------------------------------------------
*/

export function useNotifications() {
  const { user, role } = useAuth();

  const [notifications, setNotifications] =
    useState([]);

  const [unreadCount, setUnreadCount] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | LOAD NOTIFICATIONS
  |--------------------------------------------------------------------------
  */

  const loadNotifications =
    useCallback(async () => {
      if (!user?.uid) {
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const notificationData = await getNotifications(user.uid, role);
        setNotifications(notificationData);
        setUnreadCount(notificationData.filter((item) => item.read !== true).length);
      } catch (error) {
        console.error(
          "Error loading notifications:",
          error
        );

        setError(
          error?.message ||
            "Unable to load notifications."
        );
      } finally {
        setLoading(false);
      }
    }, [user?.uid, role]);

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  /*
  |--------------------------------------------------------------------------
  | MARK ONE AS READ
  |--------------------------------------------------------------------------
  */

  const markAsRead = useCallback(
    async (notificationId) => {
      try {
        await markNotificationAsRead(
          notificationId
        );

        setNotifications((previous) => {
          const updated = previous.map((notification) =>
            notification.id === notificationId
              ? { ...notification, read: true }
              : notification
          );
          setUnreadCount(updated.filter((notification) => notification.read !== true).length);
          return updated;
        });

        return true;
      } catch (error) {
        console.error(
          "Error marking notification as read:",
          error
        );

        setError(
          error?.message ||
            "Unable to mark notification as read."
        );

        return false;
      }
    },
    []
  );

  /*
  |--------------------------------------------------------------------------
  | MARK ALL AS READ
  |--------------------------------------------------------------------------
  */

  const markAllAsRead =
    useCallback(async () => {
      if (!user?.uid) {
        return false;
      }

      try {
        await markAllNotificationsAsRead(
          user.uid
        );

        setNotifications(
          (previous) =>
            previous.map(
              (notification) => ({
                ...notification,
                read: true,
              })
            )
        );

        setUnreadCount(0);

        return true;
      } catch (error) {
        console.error(
          "Error marking all notifications as read:",
          error
        );

        setError(
          error?.message ||
            "Unable to mark all notifications as read."
        );

        return false;
      }
    }, [user?.uid]);

  /*
  |--------------------------------------------------------------------------
  | DELETE ONE
  |--------------------------------------------------------------------------
  */

  const removeNotification =
    useCallback(
      async (notificationId) => {
        try {
          await deleteNotification(
            notificationId
          );

          setNotifications(
            (previous) =>
              previous.filter(
                (notification) =>
                  notification.id !==
                  notificationId
              )
          );

          return true;
        } catch (error) {
          console.error(
            "Error deleting notification:",
            error
          );

          setError(
            error?.message ||
              "Unable to delete notification."
          );

          return false;
        }
      },
      []
    );

  /*
  |--------------------------------------------------------------------------
  | CLEAR ALL
  |--------------------------------------------------------------------------
  */

  const clearNotifications =
    useCallback(async () => {
      if (!user?.uid) {
        return false;
      }

      try {
        await clearAllNotifications(
          user.uid
        );

        setNotifications([]);
        setUnreadCount(0);

        return true;
      } catch (error) {
        console.error(
          "Error clearing notifications:",
          error
        );

        setError(
          error?.message ||
            "Unable to clear notifications."
        );

        return false;
      }
    }, [user?.uid]);

  return {
    notifications,
    unreadCount,
    loading,
    error,

    loadNotifications,

    markAsRead,
    markAllAsRead,

    removeNotification,
    clearNotifications,
  };
}

export default useNotifications;