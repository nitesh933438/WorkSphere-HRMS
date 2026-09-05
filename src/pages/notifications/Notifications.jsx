import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  Check,
  CheckCheck,
  Clock,
  ExternalLink,
  Loader2,
  Trash2,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  clearAllNotifications,
  deleteNotification,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../../services/notificationService";

import { useAuth } from "../../context/AuthContext";

function Notifications() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [readFilter, setReadFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  /* =========================
     LOAD NOTIFICATIONS
  ========================= */

  const loadNotifications = async () => {
    if (!user?.uid) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await getNotifications(user.uid);

      setNotifications(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error(
        "Error loading notifications:",
        err
      );

      if (err?.code === "permission-denied") {
        setError(
          "You do not have permission to view notifications. Check Firestore security rules."
        );
      } else {
        setError(
          "Unable to load notifications right now. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [user?.uid]);

  /* =========================
     UNREAD COUNT
  ========================= */

  const unreadCount = notifications.filter(
    (notification) => notification.read !== true
  ).length;

  const notificationTypes = useMemo(() => [...new Set(notifications.map((n) => String(n.type || "info").trim()).filter(Boolean))].sort(), [notifications]);
  const filteredNotifications = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notifications.filter((n) => {
      const haystack = [n.title, n.message, n.type, n.category].filter(Boolean).join(" ").toLowerCase();
      return (!q || haystack.includes(q))
        && (readFilter === "All" || (readFilter === "Unread" ? n.read !== true : n.read === true))
        && (typeFilter === "All" || String(n.type || "info") === typeFilter);
    });
  }, [notifications, search, readFilter, typeFilter]);
  const clearFilters = () => { setSearch(""); setReadFilter("All"); setTypeFilter("All"); };
  const hasFilters = Boolean(search || readFilter !== "All" || typeFilter !== "All");

  /* =========================
     MARK AS READ
  ========================= */

  const handleMarkAsRead = async (notification) => {
    if (
      !notification?.id ||
      notification.read === true
    ) {
      return;
    }

    try {
      setProcessingId(notification.id);
      setError("");

      await markNotificationAsRead(
        notification.id
      );

      setNotifications((previous) =>
        previous.map((item) =>
          item.id === notification.id
            ? { ...item, read: true }
            : item
        )
      );
    } catch (err) {
      console.error(
        "Error marking notification as read:",
        err
      );

      setError(
        "Unable to update this notification."
      );
    } finally {
      setProcessingId(null);
    }
  };

  /* =========================
     MARK ALL AS READ
  ========================= */

  const handleMarkAllAsRead = async () => {
    if (!user?.uid || unreadCount === 0) {
      return;
    }

    try {
      setProcessingId("all");
      setError("");

      await markAllNotificationsAsRead(
        user.uid
      );

      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          read: true,
        }))
      );
    } catch (err) {
      console.error(
        "Error marking all notifications as read:",
        err
      );

      setError(
        "Unable to mark all notifications as read."
      );
    } finally {
      setProcessingId(null);
    }
  };

  /* =========================
     DELETE
  ========================= */

  const handleDelete = async (notificationId) => {
    if (!notificationId) {
      return;
    }

    try {
      setProcessingId(notificationId);
      setError("");

      await deleteNotification(
        notificationId
      );

      setNotifications((previous) =>
        previous.filter(
          (notification) =>
            notification.id !== notificationId
        )
      );
    } catch (err) {
      console.error(
        "Error deleting notification:",
        err
      );

      setError(
        "Unable to delete notification."
      );
    } finally {
      setProcessingId(null);
    }
  };

  /* =========================
     CLEAR ALL
  ========================= */

  const handleClearAll = async () => {
    if (
      !user?.uid ||
      notifications.length === 0
    ) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to clear all notifications?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setClearing(true);
      setError("");

      await clearAllNotifications(
        user.uid
      );

      setNotifications([]);
    } catch (err) {
      console.error(
        "Error clearing notifications:",
        err
      );

      setError(
        "Unable to clear notifications right now."
      );
    } finally {
      setClearing(false);
    }
  };

  /* =========================
     OPEN NOTIFICATION
  ========================= */

  const handleOpen = async (notification) => {
    await handleMarkAsRead(notification);

    if (notification?.link) {
      navigate(notification.link);
    }
  };

  return (
    <div className="space-y-6">

      {/* =========================
          HEADER
      ========================= */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Stay updated
          </p>

          <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Notifications

            {unreadCount > 0 && (
              <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700 dark:bg-red-950/40 dark:text-red-400">
                {unreadCount} unread
              </span>
            )}
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            View and manage your latest notifications.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">

          <button
            type="button"
            onClick={handleMarkAllAsRead}
            disabled={
              unreadCount === 0 ||
              processingId === "all"
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {processingId === "all" ? (
              <Loader2
                size={17}
                className="animate-spin"
              />
            ) : (
              <CheckCheck size={17} />
            )}

            Mark all as read
          </button>

          <button
            type="button"
            onClick={handleClearAll}
            disabled={
              notifications.length === 0 ||
              clearing
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/50 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            {clearing ? (
              <Loader2
                size={17}
                className="animate-spin"
              />
            ) : (
              <Trash2 size={17} />
            )}

            Clear all
          </button>

        </div>
      </div>

      {/* =========================
          ERROR
      ========================= */}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/30">

          <AlertCircle
            size={19}
            className="mt-0.5 shrink-0 text-red-600 dark:text-red-400"
          />

          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            {error}
          </p>

        </div>
      )}

      {/* =========================
          NOTIFICATION FILTERS
      ========================= */}

      {!loading && notifications.length > 0 && (
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
          <div className="relative">
            <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notifications..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950" />
          </div>
          <select value={readFilter} onChange={(e) => setReadFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"><option>All</option><option>Unread</option><option>Read</option></select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="All">All types</option>{notificationTypes.map((type)=><option key={type} value={type}>{type}</option>)}</select>
          <button type="button" onClick={clearFilters} disabled={!hasFilters} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold disabled:opacity-40 dark:border-slate-700"><X size={16}/> Clear</button>
          <div className="md:col-span-4 flex items-center gap-2 text-xs font-semibold text-slate-500"><SlidersHorizontal size={15}/> Showing {filteredNotifications.length} of {notifications.length}</div>
        </div>
      )}

      {/* =========================
          NOTIFICATION CARD
      ========================= */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

        {/* LOADING */}

        {loading && (
          <div className="flex min-h-80 flex-col items-center justify-center px-6">

            <Loader2
              size={28}
              className="animate-spin text-slate-500"
            />

            <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-300">
              Loading notifications...
            </p>

          </div>
        )}

        {/* EMPTY */}

        {!loading &&
          filteredNotifications.length === 0 && (
            <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">

              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                <Bell size={25} />
              </div>

              <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-white">
                No notifications
              </h3>

              <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
                You're all caught up. New notifications will appear here.
              </p>

            </div>
          )}

        {/* LIST */}

        {!loading &&
          filteredNotifications.length > 0 && (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">

              {filteredNotifications.map(
                (notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    processing={
                      processingId ===
                      notification.id
                    }
                    onRead={
                      handleMarkAsRead
                    }
                    onOpen={
                      handleOpen
                    }
                    onDelete={
                      handleDelete
                    }
                  />
                )
              )}

            </div>
          )}

      </div>
    </div>
  );
}

/* =========================
   NOTIFICATION ITEM
========================= */

function NotificationItem({
  notification,
  processing,
  onRead,
  onOpen,
  onDelete,
}) {
  const isUnread =
    notification.read !== true;

  const typeStyles = {
    success:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",

    warning:
      "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",

    error:
      "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",

    info:
      "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
  };

  const iconStyle =
    typeStyles[notification.type] ||
    typeStyles.info;

  return (
    <div
      className={`group p-4 transition md:p-5 ${
        isUnread
          ? "bg-slate-50/80 dark:bg-slate-800/30"
          : "bg-white dark:bg-slate-900"
      } hover:bg-slate-50 dark:hover:bg-slate-800/50`}
    >
      <div className="flex items-start gap-4">

        {/* ICON */}

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconStyle}`}
        >
          <Bell size={19} />
        </div>

        {/* CONTENT */}

        <div className="min-w-0 flex-1">

          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">

            <div className="min-w-0">

              <div className="flex items-center gap-2">

                <h3
                  className={`text-sm ${
                    isUnread
                      ? "font-bold text-slate-900 dark:text-white"
                      : "font-semibold text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {notification.title}
                </h3>

                {isUnread && (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
                )}

              </div>

              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {notification.message}
              </p>

            </div>

            <NotificationTime
              timestamp={
                notification.createdAt
              }
            />

          </div>

          {/* ACTIONS */}

          <div className="mt-3 flex flex-wrap items-center gap-2">

            {notification.link && (
              <button
                type="button"
                onClick={() =>
                  onOpen(notification)
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                Open

                <ExternalLink size={13} />
              </button>
            )}

            {isUnread && (
              <button
                type="button"
                onClick={() =>
                  onRead(notification)
                }
                disabled={processing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {processing ? (
                  <Loader2
                    size={13}
                    className="animate-spin"
                  />
                ) : (
                  <Check size={13} />
                )}

                Mark as read
              </button>
            )}

            {!isUnread && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <Check size={13} />

                Read
              </span>
            )}

            <button
              type="button"
              onClick={() =>
                onDelete(notification.id)
              }
              disabled={processing}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-950/30 dark:hover:text-red-400"
            >
              {processing ? (
                <Loader2
                  size={13}
                  className="animate-spin"
                />
              ) : (
                <Trash2 size={13} />
              )}

              Delete
            </button>

          </div>

        </div>

      </div>
    </div>
  );
}

/* =========================
   TIME
========================= */

function NotificationTime({
  timestamp,
}) {
  const date =
    timestamp?.toDate?.() ||
    (timestamp
      ? new Date(timestamp)
      : null);

  if (!date || Number.isNaN(date.getTime())) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 text-xs text-slate-400">
        <Clock size={13} />
        Just now
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-xs text-slate-400">
      <Clock size={13} />

      {date.toLocaleString([], {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}
    </span>
  );
}

export default Notifications;