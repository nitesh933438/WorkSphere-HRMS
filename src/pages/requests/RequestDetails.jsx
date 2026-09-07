import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

import {
  FaArrowLeft,
  FaEdit,
  FaTrash,
  FaTimes,
  FaClipboardList,
  FaClock,
  FaUser,
  FaCalendarAlt,
  FaFlag,
} from "react-icons/fa";

import {
  cancelRequest,
  deleteRequest,
  getRequestById,
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
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",

  Normal:
    "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",

  High:
    "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",

  Urgent:
    "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
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

    return date.toLocaleString(
      [],
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  } catch {
    return "—";
  }
};

function InfoItem({
  icon,
  label,
  value,
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-400">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-semibold text-slate-800 dark:text-slate-200">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

function RequestDetails() {
  const {
    requestId,
  } = useParams();

  const navigate =
    useNavigate();

  const { role } = useAuth();
  const isManagement = ["admin", "hr", "manager"].includes(role);

  const [request, setRequest] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  const loadRequest =
    useCallback(async () => {
      try {
        setLoading(true);

        const data =
          await getRequestById(
            requestId
          );

        setRequest(data);
      } catch (error) {
        console.error(error);

        toast.error(
          error?.message ||
            "Unable to load request."
        );

        navigate(
          "/requests",
          { replace: true }
        );
      } finally {
        setLoading(false);
      }
    }, [
      requestId,
      navigate,
    ]);

  useEffect(() => {
    loadRequest();
  }, [loadRequest]);

  const handleReview = async (status) => {
    const comment = window.prompt(`${status} comment (optional):`, "") ?? "";
    try {
      setActionLoading(true);
      await reviewRequest(requestId, status, comment);
      toast.success(`Request ${status.toLowerCase()} successfully.`);
      await loadRequest();
    } catch (error) {
      toast.error(error?.message || `Unable to ${status.toLowerCase()} request.`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel =
    async () => {
      const confirmed =
        window.confirm(
          "Are you sure you want to cancel this request?"
        );

      if (!confirmed) {
        return;
      }

      try {
        setActionLoading(true);

        await cancelRequest(
          requestId
        );

        toast.success(
          "Request cancelled successfully."
        );

        await loadRequest();
      } catch (error) {
        toast.error(
          error?.message ||
            "Unable to cancel request."
        );
      } finally {
        setActionLoading(false);
      }
    };

  const handleDelete =
    async () => {
      const confirmed =
        window.confirm(
          "Are you sure you want to permanently delete this request?"
        );

      if (!confirmed) {
        return;
      }

      try {
        setActionLoading(true);

        await deleteRequest(
          requestId
        );

        toast.success(
          "Request deleted successfully."
        );

        navigate(
          "/requests",
          { replace: true }
        );
      } catch (error) {
        toast.error(
          error?.message ||
            "Unable to delete request."
        );
      } finally {
        setActionLoading(false);
      }
    };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900 dark:border-slate-700 dark:border-t-white" />
      </div>
    );
  }

  if (!request) {
    return null;
  }

  const isPending =
    request.status ===
    "Pending";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">

      {/* HEADER */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">

        <div className="flex items-center gap-3">
          <Link
            to="/requests"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <FaArrowLeft />
          </Link>

          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Request Details
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              View request information and status.
            </p>
          </div>
        </div>

        {isPending && (
          <div className="flex flex-wrap gap-2">

            {!isManagement && <Link
              to={`/requests/${request.id}/edit`}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-100 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400"
            >
              <FaEdit />
              Edit
            </Link>}

            {!isManagement && <button
              type="button"
              disabled={
                actionLoading
              }
              onClick={
                handleCancel
              }
              className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-600 transition hover:bg-amber-100 disabled:opacity-50 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400"
            >
              <FaTimes />
              Cancel
            </button>}

            {!isManagement && <button
              type="button"
              disabled={
                actionLoading
              }
              onClick={
                handleDelete
              }
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
            >
              <FaTrash />
              Delete
            </button>}

            {isManagement && isPending && (
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={actionLoading} onClick={() => handleReview("Approved")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Approve</button>
                <button type="button" disabled={actionLoading} onClick={() => handleReview("Rejected")} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Reject</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MAIN */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* REQUEST */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

            <div className="border-b border-slate-200 p-6 dark:border-slate-800">
              <div className="flex flex-wrap items-start justify-between gap-4">

                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <FaClipboardList />
                    </span>

                    <span className="text-xs font-medium text-slate-400">
                      Request
                    </span>
                  </div>

                  <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
                    {request.title}
                  </h2>
                </div>

                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    statusStyles[
                      request.status
                    ] ||
                    statusStyles.Pending
                  }`}
                >
                  {request.status}
                </span>
              </div>
            </div>

            <div className="p-6">

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <InfoItem
                  icon={<FaClipboardList />}
                  label="Category"
                  value={
                    request.category
                  }
                />

                <InfoItem
                  icon={<FaFlag />}
                  label="Priority"
                  value={
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs ${
                        priorityStyles[
                          request.priority
                        ] ||
                        priorityStyles.Normal
                      }`}
                    >
                      {request.priority ||
                        "Normal"}
                    </span>
                  }
                />

                <InfoItem
                  icon={<FaCalendarAlt />}
                  label="Created"
                  value={formatDate(
                    request.createdAt
                  )}
                />

                <InfoItem
                  icon={<FaClock />}
                  label="Last Updated"
                  value={formatDate(
                    request.updatedAt
                  )}
                />

                <InfoItem
                  icon={<FaUser />}
                  label="Employee"
                  value={
                    request.employeeName ||
                    "Current User"
                  }
                />

                <InfoItem
                  icon={<FaUser />}
                  label="Email"
                  value={
                    request.userEmail
                  }
                />
              </div>

              {/* DESCRIPTION */}
              <div className="mt-7 border-t border-slate-200 pt-6 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Description
                </h3>

                <div className="mt-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {request.description}
                  </p>
                </div>
              </div>

              {/* ADMIN COMMENT */}
              {request.adminComment && (
                <div className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-800">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Review Comment
                  </h3>

                  <div className="mt-3 rounded-xl bg-blue-50 p-4 dark:bg-blue-500/10">
                    <p className="whitespace-pre-wrap text-sm leading-6 text-blue-800 dark:text-blue-300">
                      {
                        request.adminComment
                      }
                    </p>
                  </div>
                </div>
              )}

              {/* REVIEW */}
              {request.reviewedAt && (
                <div className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-800">
                  <p className="text-xs text-slate-400">
                    Reviewed on{" "}
                    {formatDate(
                      request.reviewedAt
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* STATUS PANEL */}
        <div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Request Status
            </h3>

            <div className="mt-6 space-y-5">

              <div className="flex gap-3">
                <div
                  className={`mt-1 h-3 w-3 rounded-full ${
                    request.status ===
                    "Pending"
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                />

                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Submitted
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(
                      request.createdAt
                    )}
                  </p>
                </div>
              </div>

              <div className="ml-1.5 h-8 border-l border-dashed border-slate-300 dark:border-slate-700" />

              <div className="flex gap-3">
                <div
                  className={`mt-1 h-3 w-3 rounded-full ${
                    request.status ===
                    "Approved"
                      ? "bg-emerald-500"
                      : request.status ===
                        "Rejected"
                      ? "bg-red-500"
                      : request.status ===
                        "Cancelled"
                      ? "bg-slate-400"
                      : "bg-slate-300 dark:bg-slate-700"
                  }`}
                />

                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {request.status ===
                    "Pending"
                      ? "Waiting for review"
                      : request.status}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {request.reviewedAt
                      ? formatDate(
                          request.reviewedAt
                        )
                      : "Not reviewed yet"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* REQUEST ID */}
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-medium text-slate-400">
              Request ID
            </p>

            <p className="mt-2 break-all font-mono text-xs text-slate-600 dark:text-slate-300">
              {request.id}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RequestDetails;