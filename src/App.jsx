import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";

import AuthLayout from "./layouts/AuthLayout";
import DashboardLayout from "./layouts/DashboardLayout";
const Login = lazy(() => import("./pages/auth/Login"));
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard"));
const Employees = lazy(() => import("./pages/employees/Employees"));
const AddEmployee = lazy(() => import("./pages/employees/AddEmployee"));
const EmployeeDetails = lazy(() => import("./pages/employees/EmployeeDetails"));
const EditEmployee = lazy(() => import("./pages/employees/EditEmployee"));
const Notifications = lazy(() => import("./pages/notifications/Notifications"));
const Attendance = lazy(() => import("./pages/attendance/Attendance"));
const Documents = lazy(() => import("./pages/documents/Documents"));
const Leave = lazy(() => import("./pages/leaves/Leave"));
const ApplyLeave = lazy(() => import("./pages/leaves/ApplyLeave"));
const ManagementPayroll = lazy(() => import("./pages/payroll/ManagementPayroll"));
const PayrollHistory = lazy(() => import("./pages/payroll/PayrollHistory"));
const SalarySlip = lazy(() => import("./pages/payroll/SalarySlip"));
const GeneratePayroll = lazy(() => import("./pages/payroll/GeneratePayroll"));
const Reports = lazy(() => import("./pages/reports/Reports"));
const AttendanceReport = lazy(() => import("./pages/reports/AttendanceReport"));
const LeaveReport = lazy(() => import("./pages/reports/LeaveReport"));
const PayrollReport = lazy(() => import("./pages/reports/PayrollReport"));
const EmployeeReport = lazy(() => import("./pages/reports/EmployeeReport"));
const Requests = lazy(() => import("./pages/requests/Requests"));
const CreateRequest = lazy(() => import("./pages/requests/CreateRequest"));
const RequestDetails = lazy(() => import("./pages/requests/RequestDetails"));
const Departments = lazy(() => import("./pages/departments/Departments"));
const Settings = lazy(() => import("./pages/settings/Settings"));
const Profile = lazy(() => import("./pages/profile/Profile"));
const Announcements = lazy(() => import("./pages/announcements/Announcements"));
const UserManagement = lazy(() => import("./pages/users/UserManagement"));
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ROLES } from "./constants/roleConstants";
import PWAInstallPrompt from "./components/PWAInstallPrompt";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900 dark:border-slate-700 dark:border-t-white" />
        <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">
          Loading WorkSphere...
        </p>
      </div>
    </div>
  );
}

function AccessDenied() {
  const { role } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-2xl font-bold text-red-600 dark:bg-red-950/40 dark:text-red-400">!</div>
        <h1 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">Access Denied</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">You do not have permission to access this page.</p>
        <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold capitalize text-slate-900 dark:bg-slate-800 dark:text-white">
          Role: {role || "employee"}
        </p>
        <a href="#/dashboard" className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">
          Back to Dashboard
        </a>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading, roleLoading } = useAuth();
  if (loading || roleLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RoleRoute({ children, allowedRoles = [] }) {
  const { user, role, loading, roleLoading } = useAuth();
  if (loading || roleLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles.length && !allowedRoles.includes(role)) return <AccessDenied />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading, roleLoading } = useAuth();
  if (loading || roleLoading) return <LoadingScreen />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

const ALL = Object.values(ROLES);
const MANAGEMENT = [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER];
const ADMIN = [ROLES.ADMIN];
const EMPLOYEE_SELF = [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE];

const page = (Component, roles = ALL) => (
  <RoleRoute allowedRoles={roles}>
    <DashboardLayout><Component /></DashboardLayout>
  </RoleRoute>
);

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<PublicRoute><AuthLayout><Login /></AuthLayout></PublicRoute>} />

      <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout><Dashboard /></DashboardLayout></ProtectedRoute>} />
      <Route path="/profile" element={page(Profile)} />
      <Route path="/settings" element={page(Settings)} />
      <Route path="/notifications" element={page(Notifications)} />
      <Route path="/attendance" element={page(Attendance)} />
      <Route path="/documents" element={page(Documents)} />
      <Route path="/leave" element={page(Leave)} />
      <Route path="/leave/apply" element={page(ApplyLeave)} />
      <Route path="/requests" element={page(Requests)} />
      <Route path="/requests/create" element={page(CreateRequest)} />
      <Route path="/requests/:requestId/edit" element={page(CreateRequest)} />
      <Route path="/requests/:requestId" element={page(RequestDetails)} />
      <Route path="/payroll/salary-slip" element={page(SalarySlip)} />

      <Route path="/employees" element={page(Employees, MANAGEMENT)} />
      <Route path="/employees/add" element={page(AddEmployee, [ROLES.ADMIN, ROLES.HR])} />
      <Route path="/employees/:employeeId/edit" element={page(EditEmployee, [ROLES.ADMIN, ROLES.HR])} />
      <Route path="/employees/:employeeId" element={page(EmployeeDetails, MANAGEMENT)} />

      <Route path="/payroll" element={page(ManagementPayroll, [ROLES.ADMIN, ROLES.HR])} />
      <Route path="/payroll/history" element={page(PayrollHistory, [ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE])} />
      <Route path="/payroll/generate" element={page(GeneratePayroll, [ROLES.ADMIN, ROLES.HR])} />

      <Route path="/reports" element={page(Reports, MANAGEMENT)} />
      <Route path="/reports/attendance" element={page(AttendanceReport, MANAGEMENT)} />
      <Route path="/reports/employees" element={page(EmployeeReport, MANAGEMENT)} />
      <Route path="/reports/leave" element={page(LeaveReport, MANAGEMENT)} />
      <Route path="/reports/payroll" element={page(PayrollReport, [ROLES.ADMIN, ROLES.HR])} />

      <Route path="/departments" element={page(Departments, MANAGEMENT)} />
      <Route path="/announcements" element={page(Announcements, ALL)} />
      <Route path="/user-management" element={page(UserManagement, ADMIN)} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <HashRouter>
      <PWAInstallPrompt />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  );
}

export default App;
