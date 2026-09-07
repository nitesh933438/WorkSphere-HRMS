import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Mail,
  Phone,
  Save,
  Trash2,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { addEmployee } from "../../services/employeeService";
import { createNotification } from "../../services/notificationService";
import { uploadEmployeePhoto } from "../../services/cloudinaryService";
import { subscribeDepartments } from "../../services/departmentService";
import { useAuth } from "../../context/AuthContext";

/* =========================================================
   INITIAL FORM
========================================================= */

const initialForm = {
  employeeCode: "",
  fullName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  gender: "",
  department: "",
  designation: "",
  joiningDate: "",
  employmentType: "Full-time",
  status: "Active",
  address: "",
  city: "",
  state: "",
  country: "",
  pincode: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  emergencyContactRelation: "",
};

/* =========================================================
   ADD EMPLOYEE
========================================================= */

function AddEmployee() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState(initialForm);

  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const [photoPreview, setPhotoPreview] = useState("");

  const [errors, setErrors] = useState({});

  const [saving, setSaving] = useState(false);

  const [departments, setDepartments] = useState([]);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");

  const [errorMessage, setErrorMessage] = useState("");

  /* =======================================================
     REAL-TIME DEPARTMENT DIRECTORY
  ======================================================= */

  useEffect(() => {
    const unsubscribe = subscribeDepartments(
      (data) => {
        const activeDepartments = (Array.isArray(data) ? data : [])
          .filter((department) => department?.status !== "Inactive")
          .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
        setDepartments(activeDepartments);

        setForm((previous) => {
          if (previous.department && !activeDepartments.some((item) => item.name === previous.department)) {
            return { ...previous, department: "" };
          }
          return previous;
        });
      },
      (error) => console.error("Department subscription failed:", error)
    );

    return unsubscribe;
  }, []);

  /* =======================================================
     CLEANUP PREVIEW
  ======================================================= */

  useEffect(() => {
    return () => {
      if (photoPreview && photoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  /* =======================================================
     HANDLE INPUT
  ======================================================= */

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));

    setSuccessMessage("");
    setErrorMessage("");
  };

  /* =======================================================
     HANDLE PHOTO
  ======================================================= */

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setSuccessMessage("");
    setErrorMessage("");

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setErrorMessage(
        "Only JPG, JPEG, PNG and WEBP images are allowed."
      );

      event.target.value = "";
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      setErrorMessage("Image size must be less than 5 MB.");

      event.target.value = "";
      return;
    }

    if (photoPreview && photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }

    const previewUrl = URL.createObjectURL(file);

    setSelectedPhoto(file);
    setPhotoPreview(previewUrl);
  };

  /* =======================================================
     REMOVE PHOTO
  ======================================================= */

  const removePhoto = () => {
    if (photoPreview && photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }

    setSelectedPhoto(null);
    setPhotoPreview("");

    const input = document.getElementById("employee-photo");

    if (input) {
      input.value = "";
    }
  };

  /* =======================================================
     VALIDATE
  ======================================================= */

  const validateForm = () => {
    const newErrors = {};

    if (!form.employeeCode.trim()) {
      newErrors.employeeCode = "Employee code is required.";
    } else if (form.employeeCode.trim().length < 2) {
      newErrors.employeeCode =
        "Employee code must contain at least 2 characters.";
    }

    if (!form.fullName.trim()) {
      newErrors.fullName = "Full name is required.";
    } else if (form.fullName.trim().length < 2) {
      newErrors.fullName =
        "Full name must contain at least 2 characters.";
    }

    if (!form.email.trim()) {
      newErrors.email = "Work email is required.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
    ) {
      newErrors.email = "Enter a valid email address.";
    }

    if (!form.phone.trim()) {
      newErrors.phone = "Phone number is required.";
    } else if (
      !/^[0-9+\-\s()]{7,20}$/.test(form.phone)
    ) {
      newErrors.phone = "Enter a valid phone number.";
    }

    if (!form.department) {
      newErrors.department = "Select a department.";
    }

    if (!form.designation.trim()) {
      newErrors.designation = "Designation is required.";
    }

    if (!form.joiningDate) {
      newErrors.joiningDate = "Joining date is required.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSuccessMessage("");
    setErrorMessage("");

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      let photoURL = "";

      /* ---------------------------------------------------
         UPLOAD PHOTO
      --------------------------------------------------- */

      if (selectedPhoto) {
        setUploadingPhoto(true);

        const uploaded = await uploadEmployeePhoto(selectedPhoto);

        if (!uploaded?.url) {
          throw new Error(
            "Photo upload failed. Cloudinary did not return a valid URL."
          );
        }

        photoURL = uploaded.url;

        setUploadingPhoto(false);
      }

      /* ---------------------------------------------------
         EMPLOYEE DATA
      --------------------------------------------------- */

      const employeeData = {
        employeeCode: form.employeeCode.trim().toUpperCase(),

        fullName: form.fullName.trim(),

        email: form.email.trim().toLowerCase(),

        phone: form.phone.trim(),

        department: form.department,

        designation: form.designation.trim(),

        joiningDate: form.joiningDate,

        employmentType: form.employmentType,

        status: form.status,

        photoURL,
      };

      /* ---------------------------------------------------
         SAVE EMPLOYEE
      --------------------------------------------------- */

      await addEmployee(employeeData);

      /* ---------------------------------------------------
         NOTIFICATION
      --------------------------------------------------- */

      if (user?.uid) {
        try {
          await createNotification({
            userId: user.uid,

            title: "New Employee Added",

            message: `${employeeData.fullName} has been successfully added to the employee records.`,

            type: "success",

            link: "/employees",
          });
        } catch (notificationError) {
          console.error(
            "Employee added, but notification creation failed:",
            notificationError
          );
        }
      }

      /* ---------------------------------------------------
         SUCCESS
      --------------------------------------------------- */

      setSuccessMessage("Employee added successfully.");

      setForm(initialForm);

      if (photoPreview && photoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }

      setSelectedPhoto(null);
      setPhotoPreview("");

      const input = document.getElementById("employee-photo");

      if (input) {
        input.value = "";
      }

      setTimeout(() => {
        navigate("/employees");
      }, 900);
    } catch (error) {
      console.error("Error adding employee:", error);

      setErrorMessage(
        error?.message ||
          "Unable to add employee right now. Please try again."
      );
    } finally {
      setSaving(false);
      setUploadingPhoto(false);
    }
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            to="/employees"
            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Back to employees"
          >
            <ArrowLeft size={19} />
          </Link>

          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Employee Management
            </p>

            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Add Employee
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Create a new employee record in WorkSphere.
            </p>
          </div>
        </div>
      </div>

      {/* SUCCESS */}

      {successMessage && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400"
        >
          <CheckCircle2 size={18} />

          <span>{successMessage}</span>
        </div>
      )}

      {/* ERROR */}

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
        >
          <X size={18} className="mt-0.5 shrink-0" />

          <span>{errorMessage}</span>
        </div>
      )}

      {/* FORM */}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        {/* PERSONAL INFORMATION */}

        <section className="p-6 md:p-8">
          <SectionTitle
            icon={UserRound}
            title="Personal Information"
            description="Basic information about the employee."
          />

          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            <InputField
              label="Employee Code"
              name="employeeCode"
              value={form.employeeCode}
              onChange={handleChange}
              placeholder="e.g. EMP-001"
              error={errors.employeeCode}
              required
            />

            <InputField
              label="Full Name"
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              placeholder="Enter employee name"
              error={errors.fullName}
              icon={UserRound}
              required
            />

            <InputField
              label="Work Email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="employee@company.com"
              error={errors.email}
              icon={Mail}
              required
            />

            <InputField
              label="Phone Number"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              placeholder="+91 98765 43210"
              error={errors.phone}
              icon={Phone}
              required
            />

            <InputField
              label="Date of Birth"
              name="dateOfBirth"
              type="date"
              value={form.dateOfBirth}
              onChange={handleChange}
            />

            <SelectField
              label="Gender"
              name="gender"
              value={form.gender}
              onChange={handleChange}
              options={["Male", "Female", "Other", "Prefer not to say"]}
            />
          </div>

          <div className="mt-6">
            <PhotoUploader
              photoPreview={photoPreview}
              onPhotoChange={handlePhotoChange}
              onRemove={removePhoto}
              uploading={uploadingPhoto}
              disabled={saving}
            />
          </div>
        </section>

        <div className="border-t border-slate-200 dark:border-slate-800" />

        {/* EMPLOYMENT INFORMATION */}

        <section className="p-6 md:p-8">
          <SectionTitle
            icon={BriefcaseBusiness}
            title="Employment Information"
            description="Role, department and employment details."
          />

          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            <SelectField
              label="Department"
              name="department"
              value={form.department}
              onChange={handleChange}
              error={errors.department}
              required
              options={departments.map((department) => department.name)}
            />

            <InputField
              label="Designation"
              name="designation"
              value={form.designation}
              onChange={handleChange}
              placeholder="e.g. Software Engineer"
              error={errors.designation}
              required
            />

            <InputField
              label="Joining Date"
              name="joiningDate"
              type="date"
              value={form.joiningDate}
              onChange={handleChange}
              error={errors.joiningDate}
              icon={CalendarDays}
              required
            />

            <SelectField
              label="Employment Type"
              name="employmentType"
              value={form.employmentType}
              onChange={handleChange}
              options={[
                "Full-time",
                "Part-time",
                "Contract",
                "Intern",
                "Freelance",
              ]}
            />

            <SelectField
              label="Status"
              name="status"
              value={form.status}
              onChange={handleChange}
              options={["Active", "Inactive", "On Leave"]}
            />
          </div>
        </section>

        <div className="border-t border-slate-200 dark:border-slate-800" />

        <section className="p-6 md:p-8">
          <SectionTitle
            icon={BriefcaseBusiness}
            title="Address & Emergency Contact"
            description="Residential address and emergency contact details."
          />

          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            <InputField label="Address" name="address" value={form.address} onChange={handleChange} placeholder="House / street / locality" />
            <InputField label="City" name="city" value={form.city} onChange={handleChange} placeholder="City" />
            <InputField label="State" name="state" value={form.state} onChange={handleChange} placeholder="State" />
            <InputField label="Country" name="country" value={form.country} onChange={handleChange} placeholder="Country" />
            <InputField label="PIN Code" name="pincode" value={form.pincode} onChange={handleChange} placeholder="PIN code" inputMode="numeric" />
            <InputField label="Emergency Contact Name" name="emergencyContactName" value={form.emergencyContactName} onChange={handleChange} placeholder="Emergency contact name" />
            <InputField label="Emergency Contact Phone" name="emergencyContactPhone" type="tel" value={form.emergencyContactPhone} onChange={handleChange} placeholder="Emergency phone" />
            <InputField
              label="Relationship"
              name="emergencyContactRelation"
              value={form.emergencyContactRelation}
              onChange={handleChange}
              placeholder="Select or type relationship"
              list="emergency-relationship-options"
            />
            <datalist id="emergency-relationship-options">
              {[
                "Father",
                "Mother",
                "Spouse",
                "Brother",
                "Sister",
                "Son",
                "Daughter",
                "Guardian",
                "Parent",
                "Friend",
                "Relative",
                "Partner",
                "Other",
              ].map((relationship) => (
                <option key={relationship} value={relationship} />
              ))}
            </datalist>
          </div>
        </section>

        {/* FOOTER */}

        <div className="flex flex-col-reverse gap-3 bg-slate-50 p-6 sm:flex-row sm:justify-end dark:bg-slate-950/40 md:px-8">
          <Link
            to="/employees"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving || uploadingPhoto}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            {saving ? (
              <>
                <Loader2 size={17} className="animate-spin" />

                {uploadingPhoto
                  ? "Uploading Photo..."
                  : "Saving..."}
              </>
            ) : (
              <>
                <Save size={17} />

                Save Employee
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

/* =========================================================
   PHOTO UPLOADER
========================================================= */

function PhotoUploader({
  photoPreview,
  onPhotoChange,
  onRemove,
  uploading,
  disabled,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
        Employee Photo
      </label>

      <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950/40 sm:flex-row sm:items-center">
        <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          {photoPreview ? (
            <img
              src={photoPreview}
              alt="Employee preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <ImagePlus
              size={30}
              className="text-slate-400"
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Choose employee photo
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            JPG, JPEG, PNG or WEBP.
            Maximum file size 5 MB.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <label
              htmlFor="employee-photo"
              className={`inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 ${
                disabled
                  ? "pointer-events-none opacity-60"
                  : ""
              }`}
            >
              {uploading ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <UploadCloud size={16} />
              )}

              {uploading
                ? "Uploading..."
                : photoPreview
                ? "Change Photo"
                : "Choose Photo"}
            </label>

            <input
              id="employee-photo"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={onPhotoChange}
              disabled={disabled}
              className="hidden"
            />

            {photoPreview && (
              <button
                type="button"
                onClick={onRemove}
                disabled={disabled}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/50 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <Trash2 size={16} />

                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SECTION TITLE
========================================================= */

function SectionTitle({
  icon: Icon,
  title,
  description,
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
        <Icon size={19} />
      </div>

      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          {title}
        </h3>

        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   INPUT FIELD
========================================================= */

function InputField({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  icon: Icon,
  required = false,
  list,
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

      <div className="relative">
        {Icon && (
          <Icon
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
        )}

        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete="off"
          list={list}
          className={`h-11 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 dark:bg-slate-950 dark:text-white ${
            Icon ? "pl-10" : ""
          } ${
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-500/10 dark:border-red-500"
              : "border-slate-200 focus:border-slate-400 focus:ring-slate-900/10 dark:border-slate-700 dark:focus:border-slate-500"
          }`}
        />
      </div>

      {error && (
        <p className="mt-1.5 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}

/* =========================================================
   SELECT FIELD
========================================================= */

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  error,
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

      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        className={`h-11 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none transition focus:ring-2 dark:bg-slate-950 dark:text-white ${
          error
            ? "border-red-400 focus:border-red-500 focus:ring-red-500/10 dark:border-red-500"
            : "border-slate-200 focus:border-slate-400 focus:ring-slate-900/10 dark:border-slate-700 dark:focus:border-slate-500"
        }`}
      >
        <option value="">
          Select {label.toLowerCase()}
        </option>

        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      {error && (
        <p className="mt-1.5 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}

export default AddEmployee;
