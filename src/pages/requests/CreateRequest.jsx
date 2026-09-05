import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import toast from "react-hot-toast";

import {
  FaArrowLeft,
  FaPaperPlane,
  FaSave,
} from "react-icons/fa";

import {
  createRequest,
  getRequestById,
  updateRequest,
} from "../../services/requestService";

const categories = [
  "General",
  "HR",
  "IT Support",
  "Equipment",
  "Salary",
  "Leave",
  "Attendance",
  "Document",
  "Other",
];

const priorities = [
  "Low",
  "Normal",
  "High",
  "Urgent",
];

function CreateRequest() {
  const navigate = useNavigate();

  const { requestId } =
    useParams();

  const isEditMode =
    Boolean(requestId);

  const [formData, setFormData] =
    useState({
      title: "",
      category: "General",
      priority: "Normal",
      description: "",
    });

  const [loading, setLoading] =
    useState(isEditMode);

  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    if (!isEditMode) {
      return;
    }

    const loadRequest =
      async () => {
        try {
          setLoading(true);

          const request =
            await getRequestById(
              requestId
            );

          if (
            request.status !==
            "Pending"
          ) {
            toast.error(
              "Only pending requests can be edited."
            );

            navigate(
              `/requests/${requestId}`,
              { replace: true }
            );

            return;
          }

          setFormData({
            title:
              request.title || "",

            category:
              request.category ||
              "General",

            priority:
              request.priority ||
              "Normal",

            description:
              request.description ||
              "",
          });
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
      };

    loadRequest();
  }, [
    isEditMode,
    requestId,
    navigate,
  ]);

  const handleChange =
    (event) => {
      const {
        name,
        value,
      } = event.target;

      setFormData(
        (previous) => ({
          ...previous,
          [name]: value,
        })
      );
    };

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (
        !formData.title.trim()
      ) {
        toast.error(
          "Please enter request title."
        );

        return;
      }

      if (
        !formData.description.trim()
      ) {
        toast.error(
          "Please enter request description."
        );

        return;
      }

      try {
        setSaving(true);

        if (isEditMode) {
          await updateRequest(
            requestId,
            formData
          );

          toast.success(
            "Request updated successfully."
          );

          navigate(
            `/requests/${requestId}`
          );
        } else {
          const created =
            await createRequest(
              formData
            );

          toast.success(
            "Request submitted successfully."
          );

          navigate(
            `/requests/${created.id}`
          );
        }
      } catch (error) {
        console.error(error);

        toast.error(
          error?.message ||
            "Unable to save request."
        );
      } finally {
        setSaving(false);
      }
    };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900 dark:border-slate-700 dark:border-t-white" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">

      {/* HEADER */}
      <div className="flex items-center gap-3">
        <Link
          to="/requests"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <FaArrowLeft />
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isEditMode
              ? "Edit Request"
              : "Create Request"}
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {isEditMode
              ? "Update your pending request."
              : "Submit a new workplace request."}
          </p>
        </div>
      </div>

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7 dark:border-slate-800 dark:bg-slate-900"
      >

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

          {/* TITLE */}
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Request Title
            </label>

            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter request title"
              maxLength={120}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-800"
            />
          </div>

          {/* CATEGORY */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Category
            </label>

            <select
              name="category"
              value={
                formData.category
              }
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              {categories.map(
                (category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                )
              )}
            </select>
          </div>

          {/* PRIORITY */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Priority
            </label>

            <select
              name="priority"
              value={
                formData.priority
              }
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              {priorities.map(
                (priority) => (
                  <option
                    key={priority}
                    value={priority}
                  >
                    {priority}
                  </option>
                )
              )}
            </select>
          </div>

          {/* DESCRIPTION */}
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Description
            </label>

            <textarea
              name="description"
              value={
                formData.description
              }
              onChange={handleChange}
              placeholder="Explain your request in detail..."
              rows={7}
              maxLength={2000}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-800"
            />

            <p className="mt-1 text-right text-xs text-slate-400">
              {
                formData.description
                  .length
              }{" "}
              / 2000
            </p>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end dark:border-slate-800">

          <Link
            to="/requests"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {isEditMode ? (
              <FaSave />
            ) : (
              <FaPaperPlane />
            )}

            {saving
              ? "Saving..."
              : isEditMode
              ? "Update Request"
              : "Submit Request"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateRequest;