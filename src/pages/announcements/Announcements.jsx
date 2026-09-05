import { useEffect, useMemo, useState } from "react";

import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Loader2,
  Megaphone,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import {
  addAnnouncement,
  deleteAnnouncement,
  getAnnouncementsForRole,
  updateAnnouncement,
} from "../../services/announcementService";

import { useAuth } from "../../context/AuthContext";


/*
|--------------------------------------------------------------------------
| INITIAL FORM
|--------------------------------------------------------------------------
*/

const initialForm = {
  title: "",
  description: "",
  category: "General",
  priority: "Normal",
  status: "Published",
  publishDate: "",
};


/*
|--------------------------------------------------------------------------
| ANNOUNCEMENTS PAGE
|--------------------------------------------------------------------------
*/

function Announcements() {
  const { user, role } = useAuth();
  const isManagement = ["admin", "hr", "manager"].includes(role);

  const [announcements, setAnnouncements] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState(null);

  const [showForm, setShowForm] =
    useState(false);

  const [editingId, setEditingId] =
    useState(null);

  const [form, setForm] =
    useState(initialForm);

  const [search, setSearch] =
    useState("");

  const [filterPriority, setFilterPriority] =
    useState("All");

  const [filterStatus, setFilterStatus] =
    useState("All");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");


  /*
  |--------------------------------------------------------------------------
  | LOAD ANNOUNCEMENTS
  |--------------------------------------------------------------------------
  */

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const data =
        await getAnnouncementsForRole(role);

      setAnnouncements(data || []);
    } catch (error) {
      console.error(
        "Error loading announcements:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Unable to load announcements."
      );
    } finally {
      setLoading(false);
    }
  };


  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadAnnouncements();
  }, [role]);


  /*
  |--------------------------------------------------------------------------
  | HANDLE INPUT CHANGE
  |--------------------------------------------------------------------------
  */

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrorMessage("");
    setSuccessMessage("");
  };


  /*
  |--------------------------------------------------------------------------
  | OPEN CREATE FORM
  |--------------------------------------------------------------------------
  */

  const openCreateForm = () => {
    setEditingId(null);

    setForm({
      ...initialForm,

      publishDate:
        new Date()
          .toISOString()
          .split("T")[0],
    });

    setShowForm(true);

    setErrorMessage("");
    setSuccessMessage("");
  };


  /*
  |--------------------------------------------------------------------------
  | OPEN EDIT FORM
  |--------------------------------------------------------------------------
  */

  const openEditForm = (
    announcement
  ) => {
    setEditingId(
      announcement.id
    );

    setForm({
      title:
        announcement.title || "",

      description:
        announcement.description || "",

      category:
        announcement.category ||
        "General",

      priority:
        announcement.priority ||
        "Normal",

      status:
        announcement.status ||
        "Published",

      publishDate:
        announcement.publishDate ||
        "",
    });

    setShowForm(true);

    setErrorMessage("");
    setSuccessMessage("");
  };


  /*
  |--------------------------------------------------------------------------
  | CLOSE FORM
  |--------------------------------------------------------------------------
  */

  const closeForm = () => {
    if (saving) {
      return;
    }

    setShowForm(false);

    setEditingId(null);

    setForm(initialForm);

    setErrorMessage("");
  };


  /*
  |--------------------------------------------------------------------------
  | VALIDATE FORM
  |--------------------------------------------------------------------------
  */

  const validateForm = () => {
    if (!form.title.trim()) {
      setErrorMessage(
        "Announcement title is required."
      );

      return false;
    }

    if (
      form.title.trim().length < 3
    ) {
      setErrorMessage(
        "Announcement title must contain at least 3 characters."
      );

      return false;
    }

    if (
      !form.description.trim()
    ) {
      setErrorMessage(
        "Announcement description is required."
      );

      return false;
    }

    if (!form.publishDate) {
      setErrorMessage(
        "Publish date is required."
      );

      return false;
    }

    return true;
  };


  /*
  |--------------------------------------------------------------------------
  | SAVE ANNOUNCEMENT
  |--------------------------------------------------------------------------
  */

  const handleSubmit = async (event) => {
  event.preventDefault();

  setErrorMessage("");
  setSuccessMessage("");

  if (!validateForm()) {
    return;
  }

  try {
    setSaving(true);

    const announcementData = {
      title: form.title.trim(),

      description:
        form.description.trim(),

      category: form.category,

      priority: form.priority,

      status: form.status,

      publishDate:
        form.publishDate,

      createdBy:
        user?.uid || "",

      createdByName:
        user?.displayName ||
        user?.email ||
        "Administrator",
    };

    if (editingId) {
      await updateAnnouncement(
        editingId,
        announcementData
      );

      setSuccessMessage(
        "Announcement updated successfully."
      );
    } else {
      const result =
        await addAnnouncement(
          announcementData
        );

      if (
        result.notificationCreated
      ) {
        setSuccessMessage(
          `Announcement published successfully. ${result.notificationCount} employees have been notified.`
        );
      } else {
        setSuccessMessage(
          "Announcement published successfully."
        );
      }
    }

    await loadAnnouncements();

    setShowForm(false);
    setEditingId(null);
    setForm(initialForm);
  } catch (error) {
    console.error(
      "Error saving announcement:",
      error
    );

    setErrorMessage(
      error?.message ||
        "Unable to save announcement."
    );
  } finally {
    setSaving(false);
  }
};


  /*
  |--------------------------------------------------------------------------
  | DELETE ANNOUNCEMENT
  |--------------------------------------------------------------------------
  */

  const handleDelete = async (
    announcementId
  ) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this announcement?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(
        announcementId
      );

      setErrorMessage("");
      setSuccessMessage("");

      await deleteAnnouncement(
        announcementId
      );

      setAnnouncements(
        (previous) =>
          previous.filter(
            (item) =>
              item.id !==
              announcementId
          )
      );

      setSuccessMessage(
        "Announcement deleted successfully."
      );
    } catch (error) {
      console.error(
        "Error deleting announcement:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Unable to delete announcement."
      );
    } finally {
      setDeletingId(null);
    }
  };


  /*
  |--------------------------------------------------------------------------
  | FILTER ANNOUNCEMENTS
  |--------------------------------------------------------------------------
  */

  const filteredAnnouncements =
    useMemo(() => {
      const searchText =
        search
          .trim()
          .toLowerCase();

      return announcements.filter(
        (announcement) => {
          const matchesSearch =
            !searchText ||
            announcement.title
              ?.toLowerCase()
              .includes(searchText) ||
            announcement.description
              ?.toLowerCase()
              .includes(searchText) ||
            announcement.category
              ?.toLowerCase()
              .includes(searchText);

          const matchesPriority =
            filterPriority ===
              "All" ||
            announcement.priority ===
              filterPriority;

          const matchesStatus =
            filterStatus === "All" ||
            announcement.status ===
              filterStatus;

          return (
            matchesSearch &&
            matchesPriority &&
            matchesStatus
          );
        }
      );
    }, [
      announcements,
      search,
      filterPriority,
      filterStatus,
    ]);


  /*
  |--------------------------------------------------------------------------
  | STATS
  |--------------------------------------------------------------------------
  */

  const totalCount =
    announcements.length;

  const publishedCount =
    announcements.filter(
      (item) =>
        item.status ===
        "Published"
    ).length;

  const highPriorityCount =
    announcements.filter(
      (item) =>
        item.priority ===
        "High"
    ).length;


  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center">
        <Loader2
          size={30}
          className="animate-spin text-slate-500"
        />

        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Loading announcements...
        </p>
      </div>
    );
  }


  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div className="space-y-6">

      {/* HEADER */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Company Communication
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Announcements
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Create and manage important company announcements.
          </p>
        </div>

        {isManagement && <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
        >
          <Plus size={18} />

          New Announcement
        </button>}

      </div>


      {/* SUCCESS MESSAGE */}

      {successMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400">

          <CheckCircle2
            size={18}
          />

          {successMessage}

        </div>
      )}


      {/* ERROR MESSAGE */}

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          {errorMessage}
        </div>
      )}


      {/* STATS */}

      <div className="grid gap-4 sm:grid-cols-3">

        <StatCard
          icon={Megaphone}
          label="Total"
          value={totalCount}
        />

        <StatCard
          icon={CheckCircle2}
          label="Published"
          value={publishedCount}
        />

        <StatCard
          icon={Bell}
          label="High Priority"
          value={highPriorityCount}
        />

      </div>


      {/* FILTERS */}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">

        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">

          {/* SEARCH */}

          <div className="relative">

            <Search
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search announcements..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />

          </div>


          {/* PRIORITY */}

          <select
            value={filterPriority}
            onChange={(event) =>
              setFilterPriority(
                event.target.value
              )
            }
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="All">
              All Priorities
            </option>

            <option value="High">
              High
            </option>

            <option value="Normal">
              Normal
            </option>

            <option value="Low">
              Low
            </option>

          </select>


          {/* STATUS — management only; employees only receive Published records */}

          {isManagement && (
            <select
              value={filterStatus}
              onChange={(event) =>
                setFilterStatus(event.target.value)
              }
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="All">All Status</option>
              <option value="Published">Published</option>
              <option value="Draft">Draft</option>
            </select>
          )}

        </div>

      </section>


      {/* ANNOUNCEMENT LIST */}

      {filteredAnnouncements.length === 0 ? (
        <EmptyState
          search={search}
          onCreate={openCreateForm}
          canManage={isManagement}
        />
      ) : (
        <div className="space-y-4">

          {filteredAnnouncements.map(
            (announcement) => (
              <AnnouncementCard
                key={
                  announcement.id
                }
                announcement={
                  announcement
                }
                deleting={deletingId === announcement.id}
                canManage={isManagement}
                onEdit={
                  openEditForm
                }
                onDelete={
                  handleDelete
                }
              />
            )
          )}

        </div>
      )}


      {/* FORM MODAL */}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">

              <div>

                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingId
                    ? "Edit Announcement"
                    : "New Announcement"}
                </h2>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Share important information with employees.
                </p>

              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={19} />
              </button>

            </div>


            {/* FORM */}

            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-5"
            >

              {/* TITLE */}

              <InputField
                label="Title"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Enter announcement title"
                required
              />


              {/* DESCRIPTION */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">

                  Description

                  <span className="ml-1 text-red-500">
                    *
                  </span>

                </label>

                <textarea
                  name="description"
                  value={
                    form.description
                  }
                  onChange={
                    handleChange
                  }
                  rows={6}
                  placeholder="Write your announcement..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />

              </div>


              {/* SELECTS */}

              <div className="grid gap-5 md:grid-cols-2">

                <SelectField
                  label="Category"
                  name="category"
                  value={
                    form.category
                  }
                  onChange={
                    handleChange
                  }
                  options={[
                    "General",
                    "HR",
                    "Finance",
                    "IT",
                    "Events",
                    "Holiday",
                    "Policy",
                  ]}
                />


                <SelectField
                  label="Priority"
                  name="priority"
                  value={
                    form.priority
                  }
                  onChange={
                    handleChange
                  }
                  options={[
                    "High",
                    "Normal",
                    "Low",
                  ]}
                />


                <SelectField
                  label="Status"
                  name="status"
                  value={
                    form.status
                  }
                  onChange={
                    handleChange
                  }
                  options={[
                    "Published",
                    "Draft",
                  ]}
                />


                {/* PUBLISH DATE */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">

                    Publish Date

                    <span className="ml-1 text-red-500">
                      *
                    </span>

                  </label>

                  <div className="relative">

                    <CalendarDays
                      size={17}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="date"
                      name="publishDate"
                      value={
                        form.publishDate
                      }
                      onChange={
                        handleChange
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />

                  </div>

                </div>

              </div>


              {/* ACTIONS */}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end dark:border-slate-800">

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900"
                >

                  {saving ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />

                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2
                        size={17}
                      />

                      {editingId
                        ? "Update Announcement"
                        : "Publish Announcement"}
                    </>
                  )}

                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}


/*
|--------------------------------------------------------------------------
| STAT CARD
|--------------------------------------------------------------------------
*/

function StatCard({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {value}
          </p>

        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">

          <Icon size={20} />

        </div>

      </div>

    </div>
  );
}


/*
|--------------------------------------------------------------------------
| ANNOUNCEMENT CARD
|--------------------------------------------------------------------------
*/

function AnnouncementCard({
  announcement,
  deleting,
  canManage = false,
  onEdit,
  onDelete,
}) {
  const priorityClass =
    announcement.priority ===
    "High"
      ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
      : announcement.priority ===
        "Low"
      ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
      : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400";

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

        <div className="flex min-w-0 gap-4">

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">

            <Megaphone size={20} />

          </div>

          <div className="min-w-0">

            <div className="flex flex-wrap items-center gap-2">

              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {announcement.title}
              </h2>

              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${priorityClass}`}
              >
                {announcement.priority}
              </span>

            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">

              <span className="inline-flex items-center gap-1">

                <Clock3 size={13} />

                {announcement.category}

              </span>

              <span className="inline-flex items-center gap-1">

                <CalendarDays
                  size={13}
                />

                {announcement.publishDate ||
                  "No date"}

              </span>

              <span className="inline-flex items-center gap-1">

                <CheckCircle2
                  size={13}
                />

                {announcement.status}

              </span>

            </div>

          </div>

        </div>


        {/* ACTION BUTTONS */}

        {canManage && <div className="flex shrink-0 items-center gap-2">

          <button
            type="button"
            onClick={() =>
              onEdit(announcement)
            }
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >

            <Pencil size={14} />

            Edit

          </button>


          <button
            type="button"
            onClick={() =>
              onDelete(
                announcement.id
              )
            }
            disabled={deleting}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
          >

            {deleting ? (
              <Loader2
                size={14}
                className="animate-spin"
              />
            ) : (
              <Trash2 size={14} />
            )}

            Delete

          </button>

        </div>}

      </div>


      {/* DESCRIPTION */}

      <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">

        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
          {announcement.description}
        </p>

      </div>


      {/* FOOTER */}

      <div className="mt-4 flex items-center justify-between">

        <p className="text-xs text-slate-400">
          {announcement.createdByName ||
            "WorkSphere"}
        </p>

        <ChevronRight
          size={16}
          className="text-slate-300"
        />

      </div>

    </article>
  );
}


/*
|--------------------------------------------------------------------------
| EMPTY STATE
|--------------------------------------------------------------------------
*/

function EmptyState({
  search,
  onCreate,
  canManage,
}) {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">

      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">

        <Megaphone size={25} />

      </div>

      <h2 className="mt-4 text-base font-bold text-slate-900 dark:text-white">

        {search
          ? "No announcements found"
          : "No announcements yet"}

      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">

        {search
          ? "Try changing your search or filters."
          : canManage
            ? "Create your first company announcement to share important information."
            : "Published company announcements will appear here."}

      </p>

      {!search && canManage && (
        <button
          type="button"
          onClick={onCreate}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
        >

          <Plus size={16} />

          Create Announcement

        </button>
      )}

    </section>
  );
}


/*
|--------------------------------------------------------------------------
| INPUT FIELD
|--------------------------------------------------------------------------
*/

function InputField({
  label,
  name,
  value,
  onChange,
  placeholder,
  required = false,
}) {
  return (
    <div>

      <label
        htmlFor={name}
        className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
      >

        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}

      </label>

      <input
        id={name}
        name={name}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />

    </div>
  );
}


/*
|--------------------------------------------------------------------------
| SELECT FIELD
|--------------------------------------------------------------------------
*/

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
}) {
  return (
    <div>

      <label
        htmlFor={name}
        className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
      >
        {label}
      </label>

      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      >

        {options.map(
          (option) => (
            <option
              key={option}
              value={option}
            >
              {option}
            </option>
          )
        )}

      </select>

    </div>
  );
}


/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

export default Announcements;