import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Bell,
  Building2,
  CalendarCheck2,
  CalendarClock,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Megaphone,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  WalletCards,
  ClipboardList,
  X,
  Sun,
  Moon,
} from "lucide-react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { logoutUser } from "../services/authService";
import { getUnreadNotificationCount, subscribeNotifications } from "../services/notificationService";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { ROLE_LABELS, ROLES } from "../constants/roleConstants";

const ALL = Object.values(ROLES);
const navigation = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, roles: ALL },
  { label: "User Management", path: "/user-management", icon: ShieldCheck, roles: [ROLES.ADMIN] },
  { label: "Employees", path: "/employees", icon: Users, roles: [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER] },
  { label: "Attendance", path: "/attendance", icon: CalendarCheck2, roles: ALL },
  { label: "Documents", path: "/documents", icon: FileText, roles: ALL },
  { label: "Leave", path: "/leave", icon: CalendarClock, roles: ALL },
  { label: "Salary Slip", path: "/payroll/salary-slip", icon: WalletCards, roles: [ROLES.EMPLOYEE] },
  { label: "Salary History", path: "/payroll/history", icon: WalletCards, roles: [ROLES.EMPLOYEE] },
  { label: "Payroll", path: "/payroll", icon: WalletCards, roles: [ROLES.ADMIN, ROLES.HR] },
  { label: "Reports", path: "/reports", icon: BarChart3, roles: [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER] },
  { label: "Requests", path: "/requests", icon: ClipboardList, roles: ALL },
  { label: "Departments", path: "/departments", icon: Building2, roles: [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER] },
  { label: "Announcements", path: "/announcements", icon: Megaphone, roles: ALL },
  { label: "Notifications", path: "/notifications", icon: Bell, roles: ALL },
];
const account = [
  { label: "Profile", path: "/profile", icon: UserRound, roles: ALL },
  { label: "Settings", path: "/settings", icon: Settings, roles: ALL },
];

export default function DashboardLayout({ children }) {
  const { user, role } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [unread, setUnread] = useState(0);
  const [liveNotification, setLiveNotification] = useState(null);
  const notificationInitialized = useRef(false);
  const knownNotificationIds = useRef(new Set());

  const currentRole = role || ROLES.EMPLOYEE;
  const roleLabel = ROLE_LABELS[currentRole] || "Employee";
  const visible = useMemo(
    () => navigation.filter((item) => item.roles.includes(currentRole)),
    [currentRole]
  );
  const visibleAccount = useMemo(
    () => account.filter((item) => item.roles.includes(currentRole)),
    [currentRole]
  );

  const loadUnread = useCallback(async () => {
    if (!user?.uid) return setUnread(0);
    try {
      const count = await getUnreadNotificationCount(user.uid, role);
      setUnread(Number.isFinite(count) ? count : 0);
    } catch {
      setUnread(0);
    }
  }, [user?.uid, role]);

  useEffect(() => { loadUnread(); }, [loadUnread, location.pathname]);
  useEffect(() => {
    if (!user?.uid) return undefined;
    const timer = setInterval(loadUnread, 30000);
    return () => clearInterval(timer);
  }, [loadUnread, user?.uid, role]);

  // Real-time notification popup. The first snapshot is treated as initial state;
  // only notifications created after the page is already open trigger a popup.
  useEffect(() => {
    if (!user?.uid) {
      notificationInitialized.current = false;
      knownNotificationIds.current.clear();
      setLiveNotification(null);
      return undefined;
    }

    const unsubscribe = subscribeNotifications(user.uid, (items) => {
      // The badge must be derived from the same per-user read state used by
      // the notification inbox. This keeps personal, company-wide and
      // management notifications in sync immediately after Mark as read.
      const nextUnread = items.filter((item) => item.read !== true).length;
      setUnread(nextUnread);

      const currentIds = new Set(items.map((item) => item.id));

      if (!notificationInitialized.current) {
        currentIds.forEach((id) => knownNotificationIds.current.add(id));
        notificationInitialized.current = true;
        return;
      }

      const fresh = items
        .filter((item) => !knownNotificationIds.current.has(item.id))
        .sort((a, b) => {
          const aTime = a.createdAt?.toDate?.()?.getTime?.() || Date.now();
          const bTime = b.createdAt?.toDate?.()?.getTime?.() || Date.now();
          return bTime - aTime;
        })[0];

      currentIds.forEach((id) => knownNotificationIds.current.add(id));
      if (!fresh) return;

      setLiveNotification(fresh);
      window.setTimeout(() => setLiveNotification((current) => current?.id === fresh.id ? null : current), 6500);
      loadUnread();
    }, role);

    return () => unsubscribe?.();
  }, [loadUnread, user?.uid, role]);

  const handleLogout = async () => {
    if (loggingOut) return;
    try {
      setLoggingOut(true);
      await logoutUser();
      navigate("/login", { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  const navClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
      isActive
        ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
    }`;

  const renderNav = (items) => items.map((item) => {
    const Icon = item.icon;
    const active = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
    return (
      <NavLink key={item.path} to={item.path} className={`${navClass} premium-nav-link`} data-active={active} onClick={() => setOpen(false)}>
        <span className="relative">
          <Icon size={18} />
          {item.path === "/notifications" && unread > 0 && (
            <span className="absolute -right-2 -top-2 min-w-4 rounded-full bg-red-500 px-1 text-center text-[9px] font-bold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </span>
        <span>{item.label}</span>
        {active && item.label === "Dashboard" && currentRole === ROLES.ADMIN && (
          <span className="ml-auto text-[9px] font-bold uppercase opacity-70">Admin</span>
        )}
      </NavLink>
    );
  });

  return (
    <div className="premium-app min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      {liveNotification && (
        <button
          type="button"
          onClick={() => {
            const target = liveNotification.link || "/notifications";
            setLiveNotification(null);
            navigate(target);
          }}
          className="fixed right-4 top-20 z-[100] w-[min(380px,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-2xl ring-1 ring-black/5 transition hover:-translate-y-0.5 dark:border-slate-700 dark:bg-slate-900"
          aria-label="Open new notification"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
              <Bell size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">WorkSphere • New notification</p>
                <span onClick={(event) => { event.stopPropagation(); setLiveNotification(null); }} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">×</span>
              </div>
              <p className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-white">{liveNotification.title}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{liveNotification.message}</p>
              <p className="mt-2 text-[10px] font-semibold text-slate-400">Click to open</p>
            </div>
          </div>
        </button>
      )}
      {open && <button aria-label="Close menu" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-black/40 lg:hidden" />}
      <aside className={`premium-sidebar fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform dark:border-slate-800 dark:bg-slate-900 ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex h-20 items-center justify-between border-b border-slate-200 px-5 dark:border-slate-800">
          <Link to="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl shadow-sm ring-1 ring-slate-900/10 dark:ring-white/10">
              <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="WorkSphere" className="h-full w-full object-cover" />
            </div>
            <div>
              <p className="font-bold">WorkSphere</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Business Management</p>
            </div>
          </Link>
          <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-500 lg:hidden"><X size={19} /></button>
        </div>

        <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || "User"} referrerPolicy="no-referrer" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 font-bold text-white dark:bg-white dark:text-slate-900">
                {(user?.displayName || user?.email || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user?.displayName || "User"}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{roleLabel}</p>
            </div>
          </div>
          <div className="mt-3 rounded-lg bg-slate-100 px-3 py-1.5 text-center text-[11px] font-bold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {roleLabel} Access
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5">
          <p className="premium-sidebar-heading mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.16em]">Main Menu</p>
          <nav className="space-y-1">{renderNav(visible)}</nav>
          <p className="premium-sidebar-heading mb-3 mt-7 px-2 text-[10px] font-bold uppercase tracking-[0.16em]">Account</p>
          <nav className="space-y-1">{renderNav(visibleAccount)}</nav>
        </div>

        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <button
            onClick={toggleTheme}
            type="button"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="premium-theme-toggle mb-2 flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition"
          >
            <span className="flex items-center gap-2">{theme === "dark" ? <Moon size={16} /> : <Sun size={16} />} {theme === "dark" ? "Dark mode" : "Light mode"}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] dark:bg-slate-700">Switch</span>
          </button>
          <button onClick={handleLogout} disabled={loggingOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/30">
            <LogOut size={18} /> {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="premium-topbar sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 sm:px-6">
          <button onClick={() => setOpen(true)} className="rounded-xl border border-slate-200 p-2 lg:hidden dark:border-slate-700"><Menu size={20} /></button>
          <div className="hidden text-sm font-semibold sm:block">{roleLabel} Workspace</div>
          <div className="flex items-center gap-2">
            <Link
              to="/notifications"
              aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
              className="relative rounded-xl p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Bell size={19} />
              {unread > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />}
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              className="premium-header-theme rounded-xl p-2 transition"
            >
              {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <Link to="/profile" className="rounded-xl px-3 py-2 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800">
              {user?.displayName || "Profile"}
            </Link>
          </div>
        </header>
        <main className="premium-page min-h-[calc(100vh-4rem)] p-3 sm:p-6 lg:p-8">
          <div className="premium-page-enter">{children}</div>
        </main>
        <footer className="premium-footer border-t border-slate-200/80 px-4 py-5 dark:border-slate-800/80 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-2 text-center text-xs text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:text-left">
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-200">WorkSphere</span>
              <span className="mx-1.5">·</span>
              Business Management Platform
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 sm:justify-end">
              <span>© {new Date().getFullYear()} WorkSphere</span>
              <span className="hidden sm:inline">·</span>
              <span>Secure workspace</span>
              <span className="hidden sm:inline">·</span>
              <span className="font-medium text-slate-600 dark:text-slate-300">v{__APP_VERSION__}</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
