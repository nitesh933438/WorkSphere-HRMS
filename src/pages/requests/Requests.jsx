import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

import toast from "react-hot-toast";

import {
  FaPlus,
  FaSearch,
  FaEye,
  FaEdit,
  FaTrash,
  FaTimes,
  FaClipboardList,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaBan,
  FaSync,
} from "react-icons/fa";

import {
  cancelRequest,
  deleteRequest,
  getMyRequests,
  getManagementRequests,
  getRequestsForRole,
  getRequestStatistics,
  reviewRequest,
} from "../../services/requestService";

const statusStyles = {
  Pending:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",

  Approved:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",

  Rejected:
    "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",

  Cancelled:
    "bg-slate-100 text-slate-700 dark:bg-slate-500/10 dark:text-slate-400",
};

const priorityStyles = {
  Low:
    "text-slate-500",

  Normal:
    "text-blue-600 dark:text-blue-400",

  High:
    "text-orange-600 dark:text-orange-400",

  Urgent:
    "text-red-600 dark:text-red-400",
};

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  try {
    const date =
      value?.toDate?.() ||
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "—";
    }

    return date.toLocaleDateString(
      [],
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  } catch {
    return "—";
  }
};

function StatCard({
  title,
  value,
  icon,
  iconClass,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {value}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function Requests() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const isManagement = ["admin", "hr", "manager"].includes(role);

  const [requests, setRequests] =
    useState([]);

  const [statistics, setStatistics] =
    useState({
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
    });

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [categoryFilter, setCategoryFilter] =
    useState("All");

  const loadRequests =
    useCallback(async () => {
      try {
        setLoading(true);

        const requestData = await getRequestsForRole(role);
        const statsData = (requestData || []).reduce((stats, request) => {
          stats.total += 1;
          if (request.status === "Approved") stats.approved += 1;
          else if (request.status === "Rejected") stats.rejected += 1;
          else if (request.status === "Cancelled") stats.cancelled += 1;
          else stats.pending += 1;
          return stats;
        }, { total: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 });

        setRequests(
          requestData || []
        );

        setStatistics(
          statsData
        );
      } catch (error) {
        console.error(error);

        toast.error(
          error?.message ||
            "Unable to load requests."
        );
      } finally {
        setLoading(false);
      }
    }, [role]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const categories = useMemo(() => {
    const values =
      requests
        .map(
          (request) =>
            request.category
        )
        .filter(Boolean);

    return [
      "All",
      ...Array.from(
        new Set(values)
      ),
    ];
  }, [requests]);

  const filteredRequests =
    useMemo(() => {
      const searchValue =
        search
          .trim()
          .toLowerCase();

      return requests.filter(
        (request) => {
          const matchesSearch =
            !searchValue ||
            request.title
              ?.toLowerCase()
              .includes(
                searchValue
              ) ||
            request.category
              ?.toLowerCase()
              .includes(
                searchValue
              ) ||
            request.description
              ?.toLowerCase()
              .includes(
                searchValue
              );

          const matchesStatus =
            statusFilter === "All" ||
            request.status ===
              statusFilter;

          const matchesCategory =
            categoryFilter ===
              "All" ||
            request.category ===
              categoryFilter;

          return (
            matchesSearch &&
            matchesStatus &&
            matchesCategory
          );
        }
      );
    }, [
      requests,
      search,
      statusFilter,
      categoryFilter,
    ]);

  const handleReview = async (requestId, status) => {
    const comment = window.prompt(`${status} comment (optional):`, "") ?? "";
    try {
      setActionLoading(requestId);
      await reviewRequest(requestId, status, comment);
      toast.success(`Request ${status.toLowerCase()} successfully.`);
      await loadRequests();
    } catch (error) {
      toast.error(error?.message || `Unable to ${status.toLowerCase()} request.`);
    } finally {
      setActionLoading("");
    }
  };

  const handleCancel =
    async (requestId) => {
      const confirmed =
        window.confirm(
          "Are you sure you want to cancel this request?"
        );

      if (!confirmed) {
        return;
      }

      try {
        setActionLoading(
          requestId
        );

        await cancelRequest(
          requestId
        );

        toast.success(
          "Request cancelled successfully."
        );

        await loadRequests();
      } catch (error) {
        toast.error(
          error?.message ||
            "Unable to cancel request."
        );
      } finally {
        setActionLoading("");
      }
    };

  const handleDelete =
    async (requestId) => {
      const confirmed =
        window.confirm(
          "Are you sure you want to permanently delete this request?"
        );

      if (!confirmed) {
        return;
      }

      try {
        setActionLoading(
          requestId
        );

        await deleteRequest(
          requestId
        );

        toast.success(
          "Request deleted successfully."
        );

        await loadRequests();
      } catch (error) {
        toast.error(
          error?.message ||
            "Unable to delete request."
        );
      } finally {
        setActionLoading("");
      }
    };

  return (
    <div className="space-y-6 p-4 md:p-6">

      {/* HEADER */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Requests
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Create and track your workplace requests.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadRequests}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <FaSync
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>

          <Link
            to="/requests/create"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            <FaPlus />

            New Request
          </Link>
        </div>
      </div>

      {/* STATISTICS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">

        <StatCard
          title="Total"
          value={statistics.total}
          icon={<FaClipboardList />}
          iconClass="bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
        />

        <StatCard
          title="Pending"
          value={statistics.pending}
          icon={<FaClock />}
          iconClass="bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
        />

        <StatCard
          title="Approved"
          value={statistics.approved}
          icon={<FaCheckCircle />}
          iconClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
        />

        <StatCard
          title="Rejected"
          value={statistics.rejected}
          icon={<FaTimesCircle />}
          iconClass="bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400"
        />

        <StatCard
          title="Cancelled"
          value={statistics.cancelled}
          icon={<FaBan />}
          iconClass="bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400"
        />
      </div>

      {/* FILTERS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search requests..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-slate-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <option value="All">
              All Statuses
            </option>

            <option value="Pending">
              Pending
            </option>

            <option value="Approved">
              Approved
            </option>

            <option value="Rejected">
              Rejected
            </option>

            <option value="Cancelled">
              Cancelled
            </option>
          </select>

          <select
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(
                event.target.value
              )
            }
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            {categories.map(
              (category) => (
                <option
                  key={category}
                  value={category}
                >
                  {category ===
                  "All"
                    ? "All Categories"
                    : category}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      {/* CONTENT */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-white">
            My Requests
          </h2>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {filteredRequests.length} request
            {filteredRequests.length !==
            1
              ? "s"
              : ""}{" "}
            found
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900 dark:border-slate-700 dark:border-t-white" />
          </div>
        ) : filteredRequests.length ===
          0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center px-5 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
              <FaClipboardList className="text-2xl" />
            </div>

            <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
              No requests found
            </h3>

            <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
              Create your first request or change the current filters.
            </p>

            <Link
              to="/requests/create"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
            >
              <FaPlus />
              Create Request
            </Link>
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left dark:border-slate-800">
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Request
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Category
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Priority
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Created
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRequests.map(
                    (request) => (
                      <tr
                        key={
                          request.id
                        }
                        className="border-b border-slate-100 last:border-0 dark:border-slate-800/70"
                      >
                        <td className="px-5 py-4">
                          <div className="max-w-[280px]">
                            <p className="truncate font-semibold text-slate-900 dark:text-white">
                              {request.title}
                            </p>

                            <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                              {request.description}
                            </p>
                            {isManagement && (
                              <p className="mt-1 text-[11px] font-medium text-slate-400">
                                {request.employeeName || request.userEmail || "Employee"}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                          {request.category}
                        </td>

                        <td
                          className={`px-5 py-4 text-sm font-semibold ${
                            priorityStyles[
                              request.priority
                            ] ||
                            "text-slate-600"
                          }`}
                        >
                          {request.priority ||
                            "Normal"}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              statusStyles[
                                request.status
                              ] ||
                              statusStyles.Pending
                            }`}
                          >
                            {request.status ||
                              "Pending"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
                          {formatDate(
                            request.createdAt
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-1">

                            <button
                              type="button"
                              title="View"
                              onClick={() =>
                                navigate(
                                  `/requests/${request.id}`
                                )
                              }
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                            >
                              <FaEye />
                            </button>

                            {!isManagement && request.status ===
                              "Pending" && (
                              <button
                                type="button"
                                title="Edit"
                                onClick={() =>
                                  navigate(
                                    `/requests/${request.id}/edit`
                                  )
                                }
                                className="rounded-lg p-2 text-blue-500 transition hover:bg-blue-50 dark:hover:bg-blue-500/10"
                              >
                                <FaEdit />
                              </button>
                            )}

                            {!isManagement && request.status ===
                              "Pending" && (
                              <button
                                type="button"
                                title="Cancel"
                                disabled={
                                  actionLoading ===
                                  request.id
                                }
                                onClick={() =>
                                  handleCancel(
                                    request.id
                                  )
                                }
                                className="rounded-lg p-2 text-amber-500 transition hover:bg-amber-50 disabled:opacity-50 dark:hover:bg-amber-500/10"
                              >
                                <FaTimes />
                              </button>
                            )}

                            {!isManagement && request.status ===
                              "Pending" && (
                              <button
                                type="button"
                                title="Delete"
                                disabled={
                                  actionLoading ===
                                  request.id
                                }
                                onClick={() =>
                                  handleDelete(
                                    request.id
                                  )
                                }
                                className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/10"
                              >
                                <FaTrash />
                              </button>
                            )}

                            {isManagement && request.status === "Pending" && (
                              <>
                                <button type="button" title="Approve" disabled={actionLoading === request.id} onClick={() => handleReview(request.id, "Approved")} className="rounded-lg p-2 text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-50 dark:hover:bg-emerald-500/10">✓</button>
                                <button type="button" title="Reject" disabled={actionLoading === request.id} onClick={() => handleReview(request.id, "Rejected")} className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/10">✕</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS */}
            <div className="divide-y divide-slate-200 md:hidden dark:divide-slate-800">
              {filteredRequests.map(
                (request) => (
                  <div
                    key={request.id}
                    className="p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-slate-900 dark:text-white">
                          {request.title}
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          {request.category}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          statusStyles[
                            request.status
                          ] ||
                          statusStyles.Pending
                        }`}
                      >
                        {request.status}
                      </span>
                    </div>

                    <p className="mt-3 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                      {request.description}
                    </p>

                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span
                        className={
                          priorityStyles[
                            request.priority
                          ]
                        }
                      >
                        {request.priority ||
                          "Normal"}{" "}
                        priority
                      </span>

                      <span className="text-slate-400">
                        {formatDate(
                          request.createdAt
                        )}
                      </span>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/requests/${request.id}`
                          )
                        }
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                      >
                        <FaEye className="mr-1 inline" />
                        View
                      </button>

                      {!isManagement && request.status ===
                        "Pending" && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/requests/${request.id}/edit`
                              )
                            }
                            className="rounded-xl bg-blue-50 px-3 py-2 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                          >
                            <FaEdit />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleCancel(
                                request.id
                              )
                            }
                            className="rounded-xl bg-amber-50 px-3 py-2 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                          >
                            <FaTimes />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(request.id)}
                            className="rounded-xl bg-red-50 px-3 py-2 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                          >
                            <FaTrash />
                          </button>
                        </>
                      )}

                      {isManagement && request.status === "Pending" && (
                        <>
                          <button type="button" onClick={() => handleReview(request.id, "Approved")} className="rounded-xl bg-emerald-600 px-3 py-2 text-white">✓</button>
                          <button type="button" onClick={() => handleReview(request.id, "Rejected")} className="rounded-xl bg-red-600 px-3 py-2 text-white">✕</button>
                        </>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Requests;