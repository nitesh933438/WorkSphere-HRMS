import { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
  query,
  where,
} from "firebase/firestore";

import {
  FaSearch,
  FaUsers,
  FaUserShield,
  FaUserTie,
  FaUserCog,
  FaUser,
  FaTrash,
  FaSyncAlt,
  FaEnvelope,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";

import toast from "react-hot-toast";

import { db } from "../../config/firebase";
import {
  ROLES,
  ROLE_LABELS,
} from "../../constants/roleConstants";
import { useAuth } from "../../context/AuthContext";
import { ensureEmployeeForUser } from "../../services/employeeService";

const ROLE_OPTIONS = [
  ROLES.ADMIN,
  ROLES.HR,
  ROLES.MANAGER,
  ROLES.EMPLOYEE,
];

function roleIcon(role) {
  if (role === ROLES.ADMIN) return <FaUserShield />;
  if (role === ROLES.HR) return <FaUserTie />;
  if (role === ROLES.MANAGER) return <FaUserCog />;
  return <FaUser />;
}

function roleClasses(role) {
  if (role === ROLES.ADMIN) {
    return "bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:ring-purple-900";
  }

  if (role === ROLES.HR) {
    return "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900";
  }

  if (role === ROLES.MANAGER) {
    return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
}

function getInitials(name, email) {
  const value = name || email || "U";

  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function UserManagement() {
  const { user } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadUsers = async () => {
    try {
      setLoading(true);

      const snapshot = await getDocs(
        collection(db, "users")
      );

      const data = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      // The Users collection represents authentication/roles, while the
      // Employees collection is the source of truth for employment status.
      // Merge the employee status into this screen so an inactive employee
      // cannot incorrectly appear as Active just because the Firebase Auth
      // account still exists.
      const employeeSnapshot = await getDocs(collection(db, "employees"));
      const statusMap = {};
      employeeSnapshot.docs.forEach((employeeDoc) => {
        const employee = employeeDoc.data();
        const status = String(employee.status || "Active").trim() || "Active";
        if (employee.uid) statusMap[employee.uid] = status;
        if (employee.email) statusMap[`email:${String(employee.email).trim().toLowerCase()}`] = status;
      });

      const enrichedData = data.map((item) => ({
        ...item,
        employmentStatus:
          statusMap[item.id] ||
          statusMap[`email:${String(item.email || "").trim().toLowerCase()}`] ||
          (item.role === ROLES.EMPLOYEE ? "Inactive" : "Active"),
      }));

      enrichedData.sort((a, b) => {
        const nameA = (
          a.displayName ||
          a.email ||
          ""
        ).toLowerCase();

        const nameB = (
          b.displayName ||
          b.email ||
          ""
        ).toLowerCase();

        return nameA.localeCompare(nameB);
      });

      setUsers(enrichedData);
    } catch (error) {
      console.error("Failed to load users:", error);
      toast.error("Unable to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((item) => {
      const matchesSearch =
        !query ||
        String(item.displayName || "")
          .toLowerCase()
          .includes(query) ||
        String(item.email || "")
          .toLowerCase()
          .includes(query);

      const matchesRole =
        roleFilter === "all" ||
        item.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const statistics = useMemo(() => {
    return {
      total: users.length,
      admin: users.filter(
        (item) => item.role === ROLES.ADMIN
      ).length,
      hr: users.filter(
        (item) => item.role === ROLES.HR
      ).length,
      manager: users.filter(
        (item) => item.role === ROLES.MANAGER
      ).length,
      employee: users.filter(
        (item) => item.role === ROLES.EMPLOYEE
      ).length,
    };
  }, [users]);

  const changeRole = async (userId, newRole) => {
    if (!userId || !newRole) return;

    if (userId === user?.uid) {
      toast.error("You cannot change your own role.");
      return;
    }

    try {
      setUpdatingId(userId);

      await updateDoc(
        doc(db, "users", userId),
        {
          role: newRole,
        }
      );

      const targetUser = users.find((item) => item.id === userId);
      if (targetUser) {
        const employeeSnapshot = await getDocs(
          query(collection(db, "employees"), where("uid", "==", userId))
        );

        if (newRole === ROLES.EMPLOYEE) {
          await ensureEmployeeForUser(
            {
              uid: userId,
              email: targetUser.email || "",
              displayName: targetUser.displayName || "User",
              photoURL: targetUser.photoURL || "",
              providerData: [],
            },
            ROLES.EMPLOYEE
          );
        } else {
          await Promise.all(employeeSnapshot.docs.map((employeeDoc) => deleteDoc(employeeDoc.ref)));
        }
      }

      setUsers((current) =>
        current.map((item) =>
          item.id === userId
            ? {
                ...item,
                role: newRole,
                employmentStatus: newRole === ROLES.EMPLOYEE
                  ? (item.employmentStatus || "Active")
                  : "Active",
              }
            : item
        )
      );

      toast.success(
        `Role changed to ${ROLE_LABELS[newRole]}.`
      );
    } catch (error) {
      console.error("Role update failed:", error);
      toast.error("Failed to update role.");
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteUserProfile = async (userId) => {
    if (!userId) return;

    if (userId === user?.uid) {
      toast.error("You cannot delete your own profile.");
      return;
    }

    const target = users.find(
      (item) => item.id === userId
    );

    const confirmed = window.confirm(
      `Delete ${
        target?.displayName ||
        target?.email ||
        "this user"
      }'s WorkSphere profile?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(userId);

      await deleteDoc(
        doc(db, "users", userId)
      );

      try {
        const employeeSnapshot = await getDocs(
          query(collection(db, "employees"), where("uid", "==", userId))
        );
        await Promise.all(
          employeeSnapshot.docs.map((employeeDoc) =>
            deleteDoc(employeeDoc.ref)
          )
        );
      } catch (employeeDeleteError) {
        console.warn("User deleted but employee record could not be removed:", employeeDeleteError);
      }

      setUsers((current) =>
        current.filter(
          (item) => item.id !== userId
        )
      );

      toast.success("User profile deleted.");
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete user.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg dark:bg-white dark:text-slate-900">
                <FaUserShield />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                  User Management
                </h1>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Manage WorkSphere users and their roles.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <FaSyncAlt
              className={
                loading ? "animate-spin" : ""
              }
            />
            Refresh
          </button>
        </div>

        {/* Statistics */}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatCard
            icon={<FaUsers />}
            label="Total Users"
            value={statistics.total}
          />

          <StatCard
            icon={<FaUserShield />}
            label="Admins"
            value={statistics.admin}
          />

          <StatCard
            icon={<FaUserTie />}
            label="HR"
            value={statistics.hr}
          />

          <StatCard
            icon={<FaUserCog />}
            label="Managers"
            value={statistics.manager}
          />

          <StatCard
            icon={<FaUser />}
            label="Employees"
            value={statistics.employee}
          />
        </div>

        {/* Filters */}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search by name or email..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-700"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(event.target.value)
              }
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 lg:w-56"
            >
              <option value="all">
                All Roles
              </option>

              {ROLE_OPTIONS.map((role) => (
                <option
                  key={role}
                  value={role}
                >
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Showing {filteredUsers.length} of{" "}
            {users.length} users
          </div>
        </div>

        {/* User List */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {loading ? (
            <LoadingState />
          ) : filteredUsers.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {/* Desktop */}

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[850px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left dark:border-slate-800 dark:bg-slate-950/50">
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        User
                      </th>

                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Role
                      </th>

                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Status
                      </th>

                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredUsers.map((item) => (
                      <UserRow
                        key={item.id}
                        item={item}
                        currentUserId={user?.uid}
                        updatingId={updatingId}
                        deletingId={deletingId}
                        onChangeRole={changeRole}
                        onDelete={deleteUserProfile}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}

              <div className="divide-y divide-slate-200 md:hidden dark:divide-slate-800">
                {filteredUsers.map((item) => (
                  <MobileUserCard
                    key={item.id}
                    item={item}
                    currentUserId={user?.uid}
                    updatingId={updatingId}
                    deletingId={deletingId}
                    onChangeRole={changeRole}
                    onDelete={deleteUserProfile}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {icon}
        </div>

        <span className="text-2xl font-bold text-slate-900 dark:text-white">
          {value}
        </span>
      </div>

      <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
        {label}
      </p>
    </div>
  );
}

function UserAvatar({ item }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-sm font-bold text-white dark:bg-white dark:text-slate-900">
      {item.photoURL ? (
        <img
          src={item.photoURL}
          alt={item.displayName || "User"}
          className="h-full w-full object-cover"
        />
      ) : (
        getInitials(
          item.displayName,
          item.email
        )
      )}
    </div>
  );
}

function UserRow({
  item,
  currentUserId,
  updatingId,
  deletingId,
  onChangeRole,
  onDelete,
}) {
  const isCurrentUser =
    item.id === currentUserId;
  const employmentStatus = item.employmentStatus || (item.role === ROLES.EMPLOYEE ? "Inactive" : "Active");
  const isActive = employmentStatus === "Active";

  return (
    <tr className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <UserAvatar item={item} />

          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
              {item.displayName ||
                "Unnamed User"}
              {isCurrentUser && (
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500 dark:bg-slate-800">
                  YOU
                </span>
              )}
            </p>

            <p className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500 dark:text-slate-400">
              <FaEnvelope />
              {item.email || "No email"}
            </p>
          </div>
        </div>
      </td>

      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${roleClasses(
              item.role
            )}`}
          >
            {roleIcon(item.role)}
            {ROLE_LABELS[item.role] ||
              "Employee"}
          </span>
        </div>
      </td>

      <td className="px-6 py-4">
        <span className={`inline-flex items-center gap-2 text-xs font-semibold ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>
          {isActive ? <FaCheckCircle /> : <FaTimesCircle />}
          {employmentStatus}
        </span>
      </td>

      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-2">
          <select
            value={
              item.role || ROLES.EMPLOYEE
            }
            disabled={
              isCurrentUser ||
              updatingId === item.id
            }
            onChange={(event) =>
              onChangeRole(
                item.id,
                event.target.value
              )
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {ROLE_OPTIONS.map((role) => (
              <option
                key={role}
                value={role}
              >
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={
              isCurrentUser ||
              deletingId === item.id
            }
            onClick={() =>
              onDelete(item.id)
            }
            className="rounded-lg p-2.5 text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-950/30"
            title="Delete profile"
          >
            <FaTrash />
          </button>
        </div>
      </td>
    </tr>
  );
}

function MobileUserCard({
  item,
  currentUserId,
  updatingId,
  deletingId,
  onChangeRole,
  onDelete,
}) {
  const isCurrentUser =
    item.id === currentUserId;
  const employmentStatus = item.employmentStatus || (item.role === ROLES.EMPLOYEE ? "Inactive" : "Active");
  const isActive = employmentStatus === "Active";

  return (
    <div className="p-4">
      <div className="flex items-start gap-3">
        <UserAvatar item={item} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
              {item.displayName ||
                "Unnamed User"}
            </p>

            {isCurrentUser && (
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500 dark:bg-slate-800">
                YOU
              </span>
            )}
          </div>

          <p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">
            {item.email || "No email"}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${roleClasses(
                item.role
              )}`}
            >
              {roleIcon(item.role)}
              {ROLE_LABELS[item.role] ||
                "Employee"}
            </span>

            <span className={`inline-flex items-center gap-1 text-xs font-semibold ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>
              {isActive ? <FaCheckCircle /> : <FaTimesCircle />}
              {employmentStatus}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <select
          value={
            item.role || ROLES.EMPLOYEE
          }
          disabled={
            isCurrentUser ||
            updatingId === item.id
          }
          onChange={(event) =>
            onChangeRole(
              item.id,
              event.target.value
            )
          }
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-semibold text-slate-700 outline-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          {ROLE_OPTIONS.map((role) => (
            <option
              key={role}
              value={role}
            >
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={
            isCurrentUser ||
            deletingId === item.id
          }
          onClick={() =>
            onDelete(item.id)
          }
          className="rounded-xl border border-red-200 px-4 py-3 text-red-500 transition hover:bg-red-50 disabled:opacity-40 dark:border-red-900 dark:hover:bg-red-950/30"
        >
          <FaTrash />
        </button>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[300px] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900 dark:border-slate-700 dark:border-t-white" />

        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          Loading users...
        </p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-xl text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        <FaUsers />
      </div>

      <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
        No users found
      </h3>

      <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        Try changing your search or role filter.
      </p>
    </div>
  );
}