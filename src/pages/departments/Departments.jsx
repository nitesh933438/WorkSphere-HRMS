import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../constants/roleConstants";

import {
  addDepartment,
  deleteDepartment,
  getDepartments,
  updateDepartment,
} from "../../services/departmentService";

import "./Departments.css";

/*
|--------------------------------------------------------------------------
| DEFAULT FORM
|--------------------------------------------------------------------------
*/

const COMMON_DEPARTMENTS = ["Human Resources", "Information Technology", "Finance", "Accounting", "Sales", "Marketing", "Operations", "Customer Support", "Engineering", "Software Development", "Product", "Design", "Quality Assurance", "Procurement", "Legal", "Administration", "Research & Development", "Logistics", "Security", "Business Development", "Training", "Project Management"];

const initialForm = {
  name: "",
  description: "",
  head: "",
  location: "",
  status: "Active",
};

/*
|--------------------------------------------------------------------------
| DEPARTMENTS PAGE
|--------------------------------------------------------------------------
*/

const Departments = () => {
  const { role } = useAuth();
  const canManage = role === ROLES.ADMIN || role === ROLES.HR;
  const [departments, setDepartments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const [editingDepartment, setEditingDepartment] =
    useState(null);

  const [selectedDepartment, setSelectedDepartment] =
    useState(null);

  const [form, setForm] = useState(initialForm);

  /*
  |--------------------------------------------------------------------------
  | LOAD DEPARTMENTS
  |--------------------------------------------------------------------------
  */

  const loadDepartments = async () => {
    try {
      setLoading(true);

      const data = await getDepartments();

      setDepartments(data);
    } catch (error) {
      console.error(error);

      toast.error(
        error?.message ||
          "Failed to load departments."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | FORM CHANGE
  |--------------------------------------------------------------------------
  */

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /*
  |--------------------------------------------------------------------------
  | OPEN ADD MODAL
  |--------------------------------------------------------------------------
  */

  const openAddModal = () => {
    if (!canManage) return;
    setEditingDepartment(null);
    setForm(initialForm);
    setShowModal(true);
  };

  /*
  |--------------------------------------------------------------------------
  | OPEN EDIT MODAL
  |--------------------------------------------------------------------------
  */

  const openEditModal = (department) => {
    if (!canManage) return;
    setEditingDepartment(department);

    setForm({
      name: department.name || "",
      description: department.description || "",
      head: department.head || "",
      location: department.location || "",
      status: department.status || "Active",
    });

    setShowModal(true);
  };

  /*
  |--------------------------------------------------------------------------
  | CLOSE FORM MODAL
  |--------------------------------------------------------------------------
  */

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingDepartment(null);
    setForm(initialForm);
  };

  /*
  |--------------------------------------------------------------------------
  | SAVE DEPARTMENT
  |--------------------------------------------------------------------------
  */

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canManage) return;

    if (!form.name.trim()) {
      toast.error("Department name is required.");
      return;
    }

    try {
      setSaving(true);

      const duplicate = departments.some((department) => String(department.name || "").trim().toLowerCase() === form.name.trim().toLowerCase() && department.id !== editingDepartment?.id);
      if (duplicate) {
        toast.error("A department with this name already exists.");
        return;
      }

      if (editingDepartment) {
        await updateDepartment(
          editingDepartment.id,
          form
        );

        toast.success(
          "Department updated successfully."
        );
      } else {
        await addDepartment(form);

        toast.success(
          "Department added successfully."
        );
      }

      closeModal();

      await loadDepartments();
    } catch (error) {
      console.error(error);

      toast.error(
        error?.message ||
          "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | DELETE DEPARTMENT
  |--------------------------------------------------------------------------
  */

  const handleDelete = async (department) => {
    if (!canManage) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete "${department.name}"?`
    );

    if (!confirmed) return;

    try {
      await deleteDepartment(department.id);

      toast.success(
        "Department deleted successfully."
      );

      if (
        selectedDepartment?.id ===
        department.id
      ) {
        setSelectedDepartment(null);
        setShowDetails(false);
      }

      await loadDepartments();
    } catch (error) {
      console.error(error);

      toast.error(
        error?.message ||
          "Failed to delete department."
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | VIEW DEPARTMENT
  |--------------------------------------------------------------------------
  */

  const openDetails = (department) => {
    setSelectedDepartment(department);
    setShowDetails(true);
  };

  /*
  |--------------------------------------------------------------------------
  | FILTERED DEPARTMENTS
  |--------------------------------------------------------------------------
  */

  const filteredDepartments = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase();

    return departments.filter(
      (department) => {
        const matchesSearch =
          !keyword ||
          department.name
            ?.toLowerCase()
            .includes(keyword) ||
          department.head
            ?.toLowerCase()
            .includes(keyword) ||
          department.location
            ?.toLowerCase()
            .includes(keyword);

        const matchesStatus =
          statusFilter === "All" ||
          department.status === statusFilter;

        return (
          matchesSearch &&
          matchesStatus
        );
      }
    );
  }, [
    departments,
    search,
    statusFilter,
  ]);

  /*
  |--------------------------------------------------------------------------
  | STATISTICS
  |--------------------------------------------------------------------------
  */

  const statistics = useMemo(() => {
    const active = departments.filter(
      (item) => item.status === "Active"
    ).length;

    const inactive = departments.filter(
      (item) => item.status === "Inactive"
    ).length;

    return {
      total: departments.length,
      active,
      inactive,
    };
  }, [departments]);

  /*
  |--------------------------------------------------------------------------
  | DATE FORMATTER
  |--------------------------------------------------------------------------
  */

  const formatDate = (timestamp) => {
    if (!timestamp) return "—";

    try {
      const date =
        timestamp?.toDate?.() ||
        new Date(timestamp);

      if (Number.isNaN(date.getTime())) {
        return "—";
      }

      return date.toLocaleDateString(
        "en-IN",
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

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div className="departments-page">

      {/* HEADER */}

      <div className="departments-header">

        <div>
          <p className="departments-eyebrow">
            WORKFORCE MANAGEMENT
          </p>

          <h1>Departments</h1>

          <p className="departments-subtitle">
            Manage company departments,
            leadership and organizational
            information from one place.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            className="department-primary-btn"
            onClick={openAddModal}
          >
            <span>+</span>
            Add Department
          </button>
        )}

      </div>

      {/* STATISTICS */}

      <div className="department-stats">

        <div className="department-stat-card">
          <div className="stat-icon total">
            D
          </div>

          <div>
            <span>Total Departments</span>
            <strong>
              {statistics.total}
            </strong>
          </div>
        </div>

        <div className="department-stat-card">
          <div className="stat-icon active">
            ✓
          </div>

          <div>
            <span>Active Departments</span>
            <strong>
              {statistics.active}
            </strong>
          </div>
        </div>

        <div className="department-stat-card">
          <div className="stat-icon inactive">
            ○
          </div>

          <div>
            <span>Inactive Departments</span>
            <strong>
              {statistics.inactive}
            </strong>
          </div>
        </div>

      </div>

      {/* TOOLBAR */}

      <div className="departments-toolbar">

        <div className="department-search">
          <span>⌕</span>

          <input
            type="text"
            placeholder="Search departments, heads or locations..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />
        </div>

        <select
          className="department-filter"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value)
          }
        >
          <option value="All">
            All Status
          </option>

          <option value="Active">
            Active
          </option>

          <option value="Inactive">
            Inactive
          </option>
        </select>

      </div>

      {/* CONTENT */}

      <div className="departments-card">

        <div className="departments-card-header">

          <div>
            <h2>Department Directory</h2>

            <p>
              {filteredDepartments.length}{" "}
              department
              {filteredDepartments.length !==
              1
                ? "s"
                : ""}{" "}
              found
            </p>
          </div>

          {(search ||
            statusFilter !== "All") && (
            <button
              type="button"
              className="clear-filter-btn"
              onClick={() => {
                setSearch("");
                setStatusFilter("All");
              }}
            >
              Clear Filters
            </button>
          )}

        </div>

        {loading ? (
          <div className="department-loading">
            <div className="department-spinner" />
            <p>Loading departments...</p>
          </div>
        ) : filteredDepartments.length ===
          0 ? (
          <div className="department-empty">

            <div className="empty-icon">
              D
            </div>

            <h3>
              {departments.length === 0
                ? "No departments yet"
                : "No departments found"}
            </h3>

            <p>
              {departments.length === 0
                ? "Create your first department to get started."
                : "Try changing your search or filter."}
            </p>

            {departments.length === 0 && canManage && (
              <button
                type="button"
                className="department-primary-btn"
                onClick={openAddModal}
              >
                + Add Department
              </button>
            )}

          </div>
        ) : (
          <div className="department-table-wrapper">

            <table className="department-table">

              <thead>
                <tr>
                  <th>Department</th>
                  <th>Department Head</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="actions-heading">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredDepartments.map(
                  (department) => (
                    <tr
                      key={department.id}
                    >

                      <td>
                        <div className="department-name-cell">

                          <div className="department-avatar">
                            {department.name
                              ?.charAt(0)
                              ?.toUpperCase() ||
                              "D"}
                          </div>

                          <div>
                            <strong>
                              {department.name ||
                                "Unnamed Department"}
                            </strong>

                            <small>
                              {department.description ||
                                "No description"}
                            </small>
                          </div>

                        </div>
                      </td>

                      <td>
                        {department.head ||
                          "Not assigned"}
                      </td>

                      <td>
                        {department.location ||
                          "Not specified"}
                      </td>

                      <td>
                        <span
                          className={`department-status ${
                            department.status ===
                            "Inactive"
                              ? "inactive"
                              : "active"
                          }`}
                        >
                          <i />
                          {department.status ||
                            "Active"}
                        </span>
                      </td>

                      <td>
                        {formatDate(
                          department.createdAt
                        )}
                      </td>

                      <td>
                        <div className="department-actions">
                          <button
                            type="button"
                            className="action-view"
                            onClick={() => openDetails(department)}
                            title="View"
                          >
                            View
                          </button>
                          {canManage && (
                            <>
                              <button
                                type="button"
                                className="action-edit"
                                onClick={() => openEditModal(department)}
                                title="Edit"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="action-delete"
                                onClick={() => handleDelete(department)}
                                title="Delete"
                              >
                                Delete
                              </button>
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
        )}

      </div>

      {/* ADD / EDIT MODAL */}

      {showModal && (
        <div
          className="department-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >

          <div className="department-modal">

            <div className="department-modal-header">

              <div>
                <span className="modal-label">
                  {editingDepartment
                    ? "DEPARTMENT MANAGEMENT"
                    : "NEW DEPARTMENT"}
                </span>

                <h2>
                  {editingDepartment
                    ? "Edit Department"
                    : "Add Department"}
                </h2>

                <p>
                  {editingDepartment
                    ? "Update department information."
                    : "Create a new company department."}
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeModal}
              >
                ×
              </button>

            </div>

            <form
              className="department-form"
              onSubmit={handleSubmit}
            >

              <div className="form-grid">

                <div className="form-group full">
                  <label>
                    Department Name
                    <span>*</span>
                  </label>

                  <input
                    type="text"
                    name="name"
                    list="common-departments"
                    placeholder="e.g. Human Resources"
                    value={form.name}
                    onChange={handleChange}
                    maxLength={100}
                    required
                  />
                  <datalist id="common-departments">
                    {COMMON_DEPARTMENTS.map((department) => <option key={department} value={department} />)}
                  </datalist>
                </div>

                <div className="form-group">
                  <label>
                    Department Head
                  </label>

                  <input
                    type="text"
                    name="head"
                    placeholder="e.g. John Doe"
                    value={form.head}
                    onChange={handleChange}
                    maxLength={100}
                  />
                </div>

                <div className="form-group">
                  <label>
                    Location
                  </label>

                  <input
                    type="text"
                    name="location"
                    placeholder="e.g. New Delhi"
                    value={form.location}
                    onChange={handleChange}
                    maxLength={100}
                  />
                </div>

                <div className="form-group">
                  <label>
                    Status
                  </label>

                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option value="Active">
                      Active
                    </option>

                    <option value="Inactive">
                      Inactive
                    </option>
                  </select>
                </div>

                <div className="form-group full">
                  <label>
                    Description
                  </label>

                  <textarea
                    name="description"
                    placeholder="Briefly describe the department..."
                    value={form.description}
                    onChange={handleChange}
                    rows="4"
                    maxLength={500}
                  />
                </div>

              </div>

              <div className="department-modal-footer">

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="department-primary-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingDepartment
                    ? "Update Department"
                    : "Create Department"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* DETAILS MODAL */}

      {showDetails &&
        selectedDepartment && (
          <div
            className="department-modal-overlay"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                setShowDetails(false);
              }
            }}
          >

            <div className="department-details-modal">

              <div className="department-details-top">

                <div className="details-avatar">
                  {selectedDepartment.name
                    ?.charAt(0)
                    ?.toUpperCase() || "D"}
                </div>

                <div>
                  <span className="modal-label">
                    DEPARTMENT DETAILS
                  </span>

                  <h2>
                    {selectedDepartment.name}
                  </h2>

                  <span
                    className={`department-status ${
                      selectedDepartment.status ===
                      "Inactive"
                        ? "inactive"
                        : "active"
                    }`}
                  >
                    <i />
                    {selectedDepartment.status ||
                      "Active"}
                  </span>
                </div>

                <button
                  type="button"
                  className="modal-close"
                  onClick={() =>
                    setShowDetails(false)
                  }
                >
                  ×
                </button>

              </div>

              <div className="details-description">
                <span>Description</span>

                <p>
                  {selectedDepartment.description ||
                    "No description has been added for this department."}
                </p>
              </div>

              <div className="details-grid">

                <div className="details-item">
                  <span>
                    Department Head
                  </span>

                  <strong>
                    {selectedDepartment.head ||
                      "Not assigned"}
                  </strong>
                </div>

                <div className="details-item">
                  <span>
                    Location
                  </span>

                  <strong>
                    {selectedDepartment.location ||
                      "Not specified"}
                  </strong>
                </div>

                <div className="details-item">
                  <span>
                    Created
                  </span>

                  <strong>
                    {formatDate(
                      selectedDepartment.createdAt
                    )}
                  </strong>
                </div>

                <div className="details-item">
                  <span>
                    Last Updated
                  </span>

                  <strong>
                    {formatDate(
                      selectedDepartment.updatedAt
                    )}
                  </strong>
                </div>

              </div>

              <div className="department-modal-footer">

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() =>
                    setShowDetails(false)
                  }
                >
                  Close
                </button>

                <button
                  type="button"
                  className="department-primary-btn"
                  onClick={() => {
                    setShowDetails(false);
                    openEditModal(
                      selectedDepartment
                    );
                  }}
                >
                  Edit Department
                </button>

              </div>

            </div>

          </div>
        )}

    </div>
  );
};

export default Departments;