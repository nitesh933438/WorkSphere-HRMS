import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Send,
} from "lucide-react";
import toast from "react-hot-toast";

import { createLeave } from "../../services/leaveService";

const ApplyLeave = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    leaveType: "",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const [loading, setLoading] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | HANDLE CHANGE
  |--------------------------------------------------------------------------
  */

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setFormData((previous) => ({
      ...previous,

      [name]: value,
    }));
  };

  /*
  |--------------------------------------------------------------------------
  | SUBMIT
  |--------------------------------------------------------------------------
  */

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (!formData.leaveType) {
      toast.error(
        "Please select a leave type."
      );

      return;
    }

    if (!formData.startDate) {
      toast.error(
        "Please select a start date."
      );

      return;
    }

    if (!formData.endDate) {
      toast.error(
        "Please select an end date."
      );

      return;
    }

    if (
      formData.endDate <
      formData.startDate
    ) {
      toast.error(
        "End date cannot be before start date."
      );

      return;
    }

    if (
      !formData.reason.trim()
    ) {
      toast.error(
        "Please enter a reason."
      );

      return;
    }

    try {
      setLoading(true);

      await createLeave({
        leaveType:
          formData.leaveType,

        startDate:
          formData.startDate,

        endDate:
          formData.endDate,

        reason:
          formData.reason,
      });

      toast.success(
        "Leave request submitted successfully."
      );

      navigate("/leave");
    } catch (error) {
      console.error(
        "Apply leave error:",
        error
      );

      toast.error(
        error?.message ||
          "Unable to submit leave request."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-full bg-slate-50 p-4 dark:bg-slate-950 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">

        {/* Header */}

        <div className="mb-6">
          <button
            type="button"
            onClick={() =>
              navigate("/leave")
            }
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft size={17} />

            Back to Leave
          </button>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Apply for Leave
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Submit a new leave request.
          </p>
        </div>

        {/* Form Card */}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <form
            onSubmit={handleSubmit}
          >

            <div className="grid gap-6 p-6 sm:grid-cols-2">

              {/* Leave Type */}

              <div className="sm:col-span-2">

                <label
                  htmlFor="leaveType"
                  className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Leave Type
                </label>

                <select
                  id="leaveType"
                  name="leaveType"
                  value={
                    formData.leaveType
                  }
                  onChange={
                    handleChange
                  }
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-slate-700"
                >
                  <option value="">
                    Select leave type
                  </option>

                  <option value="Casual Leave">
                    Casual Leave
                  </option>

                  <option value="Sick Leave">
                    Sick Leave
                  </option>

                  <option value="Earned Leave">
                    Earned Leave
                  </option>

                  <option value="Emergency Leave">
                    Emergency Leave
                  </option>

                  <option value="Unpaid Leave">
                    Unpaid Leave / LOP
                  </option>

                  <option value="Other">
                    Other
                  </option>
                </select>
              </div>

              {/* Start Date */}

              <div>

                <label
                  htmlFor="startDate"
                  className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Start Date
                </label>

                <div className="relative">

                  <CalendarDays
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="startDate"
                    name="startDate"
                    type="date"
                    value={
                      formData.startDate
                    }
                    onChange={
                      handleChange
                    }
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-slate-700"
                  />

                </div>
              </div>

              {/* End Date */}

              <div>

                <label
                  htmlFor="endDate"
                  className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  End Date
                </label>

                <div className="relative">

                  <CalendarDays
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="endDate"
                    name="endDate"
                    type="date"
                    value={
                      formData.endDate
                    }
                    min={
                      formData.startDate ||
                      undefined
                    }
                    onChange={
                      handleChange
                    }
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-slate-700"
                  />

                </div>
              </div>

              {/* Reason */}

              <div className="sm:col-span-2">

                <label
                  htmlFor="reason"
                  className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Reason
                </label>

                <textarea
                  id="reason"
                  name="reason"
                  rows="6"
                  value={
                    formData.reason
                  }
                  onChange={
                    handleChange
                  }
                  disabled={loading}
                  placeholder="Enter the reason for your leave..."
                  className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-slate-700"
                />

              </div>
            </div>

            {/* Footer */}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 p-6 sm:flex-row sm:justify-end dark:border-slate-800">

              <button
                type="button"
                onClick={() =>
                  navigate("/leave")
                }
                disabled={loading}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                <Send size={17} />

                {loading
                  ? "Submitting..."
                  : "Submit Leave"}
              </button>

            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ApplyLeave;