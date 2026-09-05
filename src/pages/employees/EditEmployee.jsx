import { useEffect, useRef, useState } from "react";
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
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  getEmployeeById,
  updateEmployee,
} from "../../services/employeeService";

import {
  uploadEmployeePhoto,
} from "../../services/cloudinaryService";
import { subscribeDepartments } from "../../services/departmentService";

/* =========================================================
   EMPTY FORM
========================================================= */

const emptyForm = {
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
   EDIT EMPLOYEE
========================================================= */

function EditEmployee() {
  const {
    employeeId,
  } = useParams();

  const navigate =
    useNavigate();

  const fileInputRef =
    useRef(null);

  const [form, setForm] =
    useState(emptyForm);

  const [employee, setEmployee] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [departments, setDepartments] = useState([]);

  const [saving, setSaving] =
    useState(false);

  const [uploadingPhoto, setUploadingPhoto] =
    useState(false);

  const [selectedPhoto, setSelectedPhoto] =
    useState(null);

  const [photoPreview, setPhotoPreview] =
    useState("");

  const [originalPhotoURL, setOriginalPhotoURL] =
    useState("");

  const [errors, setErrors] =
    useState({});

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

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
      },
      (error) => console.error("Department subscription failed:", error)
    );
    return unsubscribe;
  }, []);

  /* =======================================================
     LOAD EMPLOYEE
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    const loadEmployee =
      async () => {
        try {
          setLoading(true);
          setErrorMessage("");

          if (!employeeId) {
            throw new Error(
              "Employee ID is missing."
            );
          }

          const data =
            await getEmployeeById(
              employeeId
            );

          if (!mounted) {
            return;
          }

          if (!data) {
            setErrorMessage(
              "Employee not found."
            );

            return;
          }

          setEmployee(data);

          setForm({
            employeeCode:
              data.employeeCode ||
              data.employeeId ||
              "",

            fullName:
              data.fullName ||
              data.name ||
              "",

            email:
              data.email ||
              "",

            phone:
              data.phone ||
              "",

            dateOfBirth:
              data.dateOfBirth ||
              "",

            gender:
              data.gender ||
              "",

            department:
              data.department ||
              "",

            designation:
              data.designation ||
              "",

            joiningDate:
              data.joiningDate ||
              "",

            employmentType:
              data.employmentType ||
              "Full-time",

            status:
              data.status ||
              "Active",

            address: data.address || "",
            city: data.city || "",
            state: data.state || "",
            country: data.country || "",
            pincode: data.pincode || data.pinCode || "",
            emergencyContactName: data.emergencyContactName || "",
            emergencyContactPhone: data.emergencyContactPhone || "",
            emergencyContactRelation: data.emergencyContactRelation || "",
          });

          const existingPhoto =
            data.photoURL ||
            data.photoUrl ||
            data.photo ||
            "";

          setOriginalPhotoURL(
            existingPhoto
          );

          setPhotoPreview(
            existingPhoto
          );
        } catch (error) {
          console.error(
            "Error loading employee:",
            error
          );

          if (!mounted) {
            return;
          }

          setErrorMessage(
            error?.message ||
              "Unable to load employee details."
          );
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      };

    loadEmployee();

    return () => {
      mounted = false;
    };
  }, [employeeId]);

  /* =======================================================
     HANDLE INPUT
  ======================================================= */

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));

    setErrorMessage("");
    setSuccessMessage("");
  };

  /* =======================================================
     PHOTO CHANGE
  ======================================================= */

  const handlePhotoChange = (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

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

    const maxSize =
      5 * 1024 * 1024;

    if (file.size > maxSize) {
      setErrorMessage(
        "Image size must be less than 5 MB."
      );

      event.target.value = "";
      return;
    }

    if (
      photoPreview &&
      photoPreview.startsWith("blob:")
    ) {
      URL.revokeObjectURL(
        photoPreview
      );
    }

    const previewUrl =
      URL.createObjectURL(file);

    setSelectedPhoto(file);

    setPhotoPreview(
      previewUrl
    );
  };

  /* =======================================================
     REMOVE PHOTO
  ======================================================= */

  const removePhoto = () => {
    if (
      photoPreview &&
      photoPreview.startsWith("blob:")
    ) {
      URL.revokeObjectURL(
        photoPreview
      );
    }

    setSelectedPhoto(null);
    setPhotoPreview("");

    if (fileInputRef.current) {
      fileInputRef.current.value =
        "";
    }
  };

  /* =======================================================
     VALIDATE
  ======================================================= */

  const validateForm = () => {
    const newErrors = {};

    if (!form.employeeCode.trim()) {
      newErrors.employeeCode =
        "Employee code is required.";
    } else if (
      form.employeeCode.trim().length < 2
    ) {
      newErrors.employeeCode =
        "Employee code must contain at least 2 characters.";
    }

    if (!form.fullName.trim()) {
      newErrors.fullName =
        "Full name is required.";
    } else if (
      form.fullName.trim().length < 2
    ) {
      newErrors.fullName =
        "Full name must contain at least 2 characters.";
    }

    if (!form.email.trim()) {
      newErrors.email =
        "Work email is required.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.email
      )
    ) {
      newErrors.email =
        "Enter a valid email address.";
    }

    if (!form.phone.trim()) {
      newErrors.phone =
        "Phone number is required.";
    } else if (
      !/^[0-9+\-\s()]{7,20}$/.test(
        form.phone
      )
    ) {
      newErrors.phone =
        "Enter a valid phone number.";
    }

    if (!form.department) {
      newErrors.department =
        "Select a department.";
    }

    if (!form.designation.trim()) {
      newErrors.designation =
        "Designation is required.";
    }

    if (!form.joiningDate) {
      newErrors.joiningDate =
        "Joining date is required.";
    }

    setErrors(newErrors);

    return (
      Object.keys(newErrors).length === 0
    );
  };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      let photoURL =
        originalPhotoURL;

      /* ---------------------------------------------------
         NEW PHOTO
      --------------------------------------------------- */

      if (selectedPhoto) {
        setUploadingPhoto(true);

        const uploaded =
          await uploadEmployeePhoto(
            selectedPhoto
          );

        photoURL =
          uploaded.url;

        setUploadingPhoto(false);
      }

      /* ---------------------------------------------------
         PHOTO REMOVED
      --------------------------------------------------- */

      if (
        !selectedPhoto &&
        !photoPreview
      ) {
        photoURL = "";
      }

      /* ---------------------------------------------------
         DATA
      --------------------------------------------------- */

      const employeeData = {
        employeeCode:
          form.employeeCode
            .trim()
            .toUpperCase(),

        fullName:
          form.fullName.trim(),

        email:
          form.email
            .trim()
            .toLowerCase(),

        phone:
          form.phone.trim(),

        dateOfBirth: form.dateOfBirth || "",
        gender: form.gender || "",

        department:
          form.department,

        designation:
          form.designation.trim(),

        joiningDate:
          form.joiningDate,

        employmentType:
          form.employmentType,

        status:
          form.status,

        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        country: form.country.trim(),
        pincode: form.pincode.trim(),
        emergencyContactName: form.emergencyContactName.trim(),
        emergencyContactPhone: form.emergencyContactPhone.trim(),
        emergencyContactRelation: form.emergencyContactRelation.trim(),

        photoURL,
      };

      /* ---------------------------------------------------
         UPDATE
      --------------------------------------------------- */

      await updateEmployee(
        employeeId,
        employeeData
      );

      setSuccessMessage(
        "Employee updated successfully."
      );

      setEmployee((previous) => ({
        ...previous,
        ...employeeData,
      }));

      setOriginalPhotoURL(
        photoURL
      );

      if (
        photoPreview &&
        photoPreview.startsWith("blob:")
      ) {
        URL.revokeObjectURL(
          photoPreview
        );
      }

      setSelectedPhoto(null);

      setPhotoPreview(
        photoURL
      );

      if (fileInputRef.current) {
        fileInputRef.current.value =
          "";
      }

      setTimeout(() => {
        navigate(
          `/employees/${employeeId}`
        );
      }, 900);
    } catch (error) {
      console.error(
        "Error updating employee:",
        error
      );

      setErrorMessage(
        error?.message ||
          "Unable to update employee right now. Please try again."
      );
    } finally {
      setSaving(false);
      setUploadingPhoto(false);
    }
  };

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <Loader2
          size={30}
          className="animate-spin text-slate-500"
        />

        <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-300">
          Loading employee details...
        </p>
      </div>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (!employee) {
    return (
      <div className="space-y-6">
        <Link
          to="/employees"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowLeft size={17} />
          Back to Employees
        </Link>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          {errorMessage ||
            "Employee not found."}
        </div>
      </div>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            to={`/employees/${employeeId}`}
            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ArrowLeft size={19} />
          </Link>

          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Employee Management
            </p>

            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Edit Employee
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Update employee information.
            </p>
          </div>
        </div>
      </div>

      {successMessage && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400"
        >
          <CheckCircle2 size={18} />
          <span>
            {successMessage}
          </span>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
        >
          <X
            size={18}
            className="mt-0.5 shrink-0"
          />

          <span>
            {errorMessage}
          </span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
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
              photoPreview={
                photoPreview
              }
              onPhotoChange={
                handlePhotoChange
              }
              onRemove={
                removePhoto
              }
              uploading={
                uploadingPhoto
              }
              disabled={saving}
              fileInputRef={
                fileInputRef
              }
            />
          </div>
        </section>

        <div className="border-t border-slate-200 dark:border-slate-800" />

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
              options={[
                "Active",
                "Inactive",
                "On Leave",
              ]}
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
              list="emergency-relationship-options-edit"
            />
            <datalist id="emergency-relationship-options-edit">
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

        <div className="border-t border-slate-200 dark:border-slate-800" />

        <div className="flex flex-col-reverse gap-3 bg-slate-50 p-6 sm:flex-row sm:justify-end dark:bg-slate-950/40 md:px-8">
          <Link
            to={`/employees/${employeeId}`}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={
              saving ||
              uploadingPhoto
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            {saving ? (
              <>
                <Loader2
                  size={17}
                  className="animate-spin"
                />

                {uploadingPhoto
                  ? "Uploading Photo..."
                  : "Updating..."}
              </>
            ) : (
              <>
                <Save size={17} />
                Update Employee
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
  fileInputRef,
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
              onError={(event) => {
                event.currentTarget.style.display =
                  "none";
              }}
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
            Employee profile photo
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Choose a new photo from your
            device. JPG, JPEG, PNG or WEBP.
            Maximum 5 MB.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <label
              htmlFor="employee-photo-edit"
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
              ref={fileInputRef}
              id="employee-photo-edit"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={
                onPhotoChange
              }
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
            Icon
              ? "pl-10"
              : ""
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

      {error && (
        <p className="mt-1.5 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}

export default EditEmployee;