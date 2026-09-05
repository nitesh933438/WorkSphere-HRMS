import { useEffect, useState } from "react";

import {
  User,
  Building2,
  ImagePlus,
  PenLine,
  Upload,
  Mail,
  Bell,
  Palette,
  ShieldCheck,
  Moon,
  Sun,
  Monitor,
  LockKeyhole,
  LogOut,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Wallet,
  MapPin,
  Clock3,
  LocateFixed,
} from "lucide-react";

import {
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { auth, db } from "../../config/firebase";

import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../constants/roleConstants";
import { uploadToCloudinary } from "../../services/cloudinaryService";
import { getCompanyBranding, saveCompanyBranding } from "../../services/companyBrandingService";
import { getLiveLocation } from "../../services/attendanceService";


/*
|--------------------------------------------------------------------------
| DEFAULT SETTINGS
|--------------------------------------------------------------------------
*/

const defaultSettings = {
  theme: "system",
  emailNotifications: true,
  leaveNotifications: true,
  attendanceNotifications: true,
};


/*
|--------------------------------------------------------------------------
| SETTINGS
|--------------------------------------------------------------------------
*/

function Settings() {
  const { user, role } = useAuth();
  const canManageBranding = role === ROLES.ADMIN || role === ROLES.HR;
  const [branding, setBranding] = useState({ companyName: "WorkSphere", logoUrl: "", signatureUrl: "", signerName: "", signerTitle: "Authorized Signatory" });
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [brandingError, setBrandingError] = useState("");
  const [payrollPolicy, setPayrollPolicy] = useState({ workingDaysPerMonth: 26, standardHoursPerDay: 8, paidLeaveEnabled: true, overtimeEnabled: false, overtimeMultiplier: 1.5, halfDayFactor: 0.5 });
  const [payrollPolicySaving, setPayrollPolicySaving] = useState(false);
  const [payrollPolicyError, setPayrollPolicyError] = useState("");
  const [attendancePolicy, setAttendancePolicy] = useState({
    officeStartTime: "09:00",
    officeEndTime: "18:00",
    lateAfterTime: "09:15",
    breakStartTime: "13:00",
    breakEndTime: "14:00",
    officeLatitude: "",
    officeLongitude: "",
    officeRadiusMeters: 200,
    locationRequired: true,
    workingDays: [1, 2, 3, 4, 5, 6],
  });
  const [attendancePolicySaving, setAttendancePolicySaving] = useState(false);
  const [attendancePolicyError, setAttendancePolicyError] = useState("");
  const [locationDetecting, setLocationDetecting] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState(null);

  const [settings, setSettings] =
    useState(defaultSettings);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [sendingReset, setSendingReset] =
    useState(false);

  const [success, setSuccess] =
    useState("");

  const [error, setError] =
    useState("");


  /*
  |--------------------------------------------------------------------------
  | SETTINGS REFERENCE
  |--------------------------------------------------------------------------
  */

  const getSettingsReference = () => {
    if (!user?.uid) {
      return null;
    }

    return doc(
      db,
      "userSettings",
      user.uid
    );
  };


  /*
  |--------------------------------------------------------------------------
  | LOAD SETTINGS
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      /*
      |--------------------------------------------------------------
      | Wait until AuthContext provides user
      |--------------------------------------------------------------
      */

      if (!user) {
        setLoading(false);
        return;
      }

      if (!user.uid) {
        setLoading(false);

        setError(
          "Unable to identify your Firebase account."
        );

        return;
      }

      try {
        setLoading(true);
        setError("");
        setSuccess("");

        const settingsReference =
          doc(
            db,
            "userSettings",
            user.uid
          );

        const snapshot =
          await getDoc(
            settingsReference
          );

        if (!mounted) {
          return;
        }

        if (snapshot.exists()) {
          const savedSettings =
            snapshot.data();

          setSettings({
            ...defaultSettings,
            ...savedSettings,
          });

          /*
          |----------------------------------------------------------
          | Apply saved theme
          |----------------------------------------------------------
          */

          applyTheme(
            savedSettings.theme ||
              defaultSettings.theme
          );
        } else {
          /*
          |----------------------------------------------------------
          | No settings document yet
          |----------------------------------------------------------
          */

          setSettings({
            ...defaultSettings,
          });

          applyTheme(
            defaultSettings.theme
          );
        }

      } catch (err) {
        console.error(
          "Error loading settings:",
          err
        );

        if (!mounted) {
          return;
        }

        /*
        |--------------------------------------------------------------
        | Friendly Firebase permission error
        |--------------------------------------------------------------
        */

        if (
          err?.code ===
          "permission-denied"
        ) {
          setError(
            "Firebase permission denied. Please make sure Firestore Rules contain the userSettings/{userId} rule and that you are signed in."
          );
        } else {
          setError(
            err?.message ||
              "Unable to load settings."
          );
        }

      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      mounted = false;
    };

  }, [user?.uid]);

  useEffect(() => {
    let mounted = true;
    if (!user || !canManageBranding) return undefined;
    getCompanyBranding()
      .then((data) => mounted && setBranding((prev) => ({ ...prev, ...data })))
      .catch((err) => mounted && setBrandingError(err?.message || "Unable to load company branding."));
    getDoc(doc(db, "companySettings", "payrollPolicy"))
      .then((snapshot) => {
        if (!mounted || !snapshot.exists()) return;
        setPayrollPolicy((prev) => ({ ...prev, ...snapshot.data() }));
      })
      .catch((err) => { if (mounted) setPayrollPolicyError(err?.message || "Unable to load payroll policy."); });
    getDoc(doc(db, "companySettings", "attendancePolicy"))
      .then((snapshot) => {
        if (!mounted || !snapshot.exists()) return;
        setAttendancePolicy((prev) => ({ ...prev, ...snapshot.data() }));
      })
      .catch((err) => { if (mounted) setAttendancePolicyError(err?.message || "Unable to load attendance policy."); });
    return () => { mounted = false; };
  }, [user?.uid, canManageBranding]);

  const uploadBrandingImage = async (event, field) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setBrandingError("");
      setBrandingSaving(true);
      const uploaded = await uploadToCloudinary(file, { imageOnly: true, folder: "worksphere/branding" });
      setBranding((prev) => ({ ...prev, [field]: uploaded.secure_url || uploaded.url }));
    } catch (err) {
      setBrandingError(err?.message || "Unable to upload image.");
    } finally {
      setBrandingSaving(false);
      event.target.value = "";
    }
  };

  const handleBrandingSave = async () => {
    try {
      setBrandingSaving(true);
      setBrandingError("");
      await saveCompanyBranding({ user, ...branding });
      setSuccess("Company branding saved successfully.");
    } catch (err) {
      setBrandingError(err?.message || "Unable to save company branding.");
    } finally {
      setBrandingSaving(false);
    }
  };


  const savePayrollPolicy = async () => {
    try {
      setPayrollPolicySaving(true);
      setPayrollPolicyError("");
      const normalized = {
        workingDaysPerMonth: Math.max(1, Math.min(31, Number(payrollPolicy.workingDaysPerMonth) || 26)),
        standardHoursPerDay: Math.max(1, Math.min(24, Number(payrollPolicy.standardHoursPerDay) || 8)),
        paidLeaveEnabled: Boolean(payrollPolicy.paidLeaveEnabled),
        overtimeEnabled: Boolean(payrollPolicy.overtimeEnabled),
        overtimeMultiplier: Math.max(1, Number(payrollPolicy.overtimeMultiplier) || 1.5),
        halfDayFactor: 0.5,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      };
      await setDoc(doc(db, "companySettings", "payrollPolicy"), normalized, { merge: true });
      setPayrollPolicy((prev) => ({ ...prev, ...normalized }));
      setSuccess("Payroll policy saved successfully.");
    } catch (err) {
      setPayrollPolicyError(err?.message || "Unable to save payroll policy.");
    } finally {
      setPayrollPolicySaving(false);
    }
  };

  const useCurrentOfficeLocation = async () => {
    try {
      setLocationDetecting(true);
      setAttendancePolicyError("");
      setSuccess("");
      const location = await getLiveLocation();
      if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
        throw new Error("Unable to read a valid GPS location from this device.");
      }
      setAttendancePolicy((prev) => ({
        ...prev,
        officeLatitude: location.latitude.toFixed(7),
        officeLongitude: location.longitude.toFixed(7),
      }));
      setLocationAccuracy(location.accuracy);
      setSuccess("Current device location detected. Review the coordinates and click Save Attendance Policy.");
    } catch (err) {
      setAttendancePolicyError(err?.message || "Unable to detect your current location.");
    } finally {
      setLocationDetecting(false);
    }
  };

  const saveAttendancePolicy = async () => {
    try {
      setAttendancePolicySaving(true);
      setAttendancePolicyError("");
      const lat = attendancePolicy.officeLatitude === "" ? "" : Number(attendancePolicy.officeLatitude);
      const lng = attendancePolicy.officeLongitude === "" ? "" : Number(attendancePolicy.officeLongitude);
      if ((lat !== "" && !Number.isFinite(lat)) || (lng !== "" && !Number.isFinite(lng))) {
        throw new Error("Office latitude/longitude must be valid numbers.");
      }
      if (attendancePolicy.locationRequired && (lat === "" || lng === "")) {
        throw new Error("Set the office latitude and longitude before enabling location-required attendance.");
      }
      const normalized = {
        officeStartTime: attendancePolicy.officeStartTime || "09:00",
        officeEndTime: attendancePolicy.officeEndTime || "18:00",
        lateAfterTime: attendancePolicy.lateAfterTime || "09:15",
        breakStartTime: attendancePolicy.breakStartTime || "13:00",
        breakEndTime: attendancePolicy.breakEndTime || "14:00",
        officeLatitude: lat,
        officeLongitude: lng,
        officeRadiusMeters: Math.max(25, Math.min(5000, Number(attendancePolicy.officeRadiusMeters) || 200)),
        locationRequired: Boolean(attendancePolicy.locationRequired),
        workingDays: Array.from(new Set((attendancePolicy.workingDays || []).map(Number).filter((day) => day >= 0 && day <= 6))),
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      };
      await setDoc(doc(db, "companySettings", "attendancePolicy"), normalized, { merge: true });
      setAttendancePolicy((prev) => ({ ...prev, ...normalized }));
      setSuccess("Attendance policy saved successfully.");
    } catch (err) {
      setAttendancePolicyError(err?.message || "Unable to save attendance policy.");
    } finally {
      setAttendancePolicySaving(false);
    }
  };

  const toggleWorkingDay = (day) => {
    setAttendancePolicy((prev) => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter((item) => item !== day)
        : [...prev.workingDays, day].sort((a, b) => a - b),
    }));
  };

  /*
  |--------------------------------------------------------------------------
  | SETTING CHANGE
  |--------------------------------------------------------------------------
  */

  const handleSettingChange = (
    name,
    value
  ) => {
    setSettings((previous) => ({
      ...previous,
      [name]: value,
    }));

    /*
    | Apply theme immediately
    */

    if (name === "theme") {
      applyTheme(value);
    }

    setSuccess("");
    setError("");
  };


  /*
  |--------------------------------------------------------------------------
  | SAVE SETTINGS
  |--------------------------------------------------------------------------
  */

  const handleSave = async () => {
    if (!user?.uid) {
      setError(
        "You must be signed in to save settings."
      );

      return;
    }

    try {
      setSaving(true);
      setSuccess("");
      setError("");

      const settingsReference =
        doc(
          db,
          "userSettings",
          user.uid
        );

      await setDoc(
        settingsReference,
        {
          ...settings,

          userId:
            user.uid,

          email:
            user.email || "",

          updatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      applyTheme(
        settings.theme
      );

      setSuccess(
        "Settings saved successfully."
      );

    } catch (err) {
      console.error(
        "Error saving settings:",
        err
      );

      if (
        err?.code ===
        "permission-denied"
      ) {
        setError(
          "Firebase permission denied while saving settings. Check the userSettings Firestore rule."
        );
      } else {
        setError(
          err?.message ||
            "Unable to save settings."
        );
      }

    } finally {
      setSaving(false);
    }
  };


  /*
  |--------------------------------------------------------------------------
  | RESET
  |--------------------------------------------------------------------------
  */

  const handleReset = () => {
    setSettings({
      ...defaultSettings,
    });

    applyTheme(
      defaultSettings.theme
    );

    setSuccess("");
    setError("");
  };


  /*
  |--------------------------------------------------------------------------
  | PASSWORD RESET
  |--------------------------------------------------------------------------
  */

  const handlePasswordReset = async () => {
    if (!user?.email) {
      setError(
        "No email address is associated with this account."
      );

      return;
    }

    try {
      setSendingReset(true);

      setSuccess("");
      setError("");

      await sendPasswordResetEmail(
        auth,
        user.email
      );

      setSuccess(
        `Password reset email sent to ${user.email}.`
      );

    } catch (err) {
      console.error(
        "Password reset error:",
        err
      );

      if (
        err?.code ===
        "auth/too-many-requests"
      ) {
        setError(
          "Too many reset requests. Please try again later."
        );
      } else if (
        err?.code ===
        "auth/user-not-found"
      ) {
        setError(
          "No Firebase account was found for this email."
        );
      } else {
        setError(
          err?.message ||
            "Unable to send password reset email."
        );
      }

    } finally {
      setSendingReset(false);
    }
  };


  /*
  |--------------------------------------------------------------------------
  | LOGOUT
  |--------------------------------------------------------------------------
  */

  const handleLogout = async () => {
    try {
      setError("");

      await signOut(auth);

    } catch (err) {
      console.error(
        "Logout error:",
        err
      );

      setError(
        err?.message ||
          "Unable to sign out."
      );
    }
  };


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
          Loading settings...
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
    <div className="mx-auto max-w-5xl space-y-6">

      {/* HEADER */}

      <div>

        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Application preferences
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Settings
        </h1>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage your WorkSphere account and application preferences.
        </p>

      </div>


      {/* SUCCESS */}

      {success && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400"
        >
          <CheckCircle2 size={18} />

          <span>
            {success}
          </span>

        </div>
      )}


      {/* ERROR */}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
        >
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0"
          />

          <span>
            {error}
          </span>

        </div>
      )}


      {/* ACCOUNT */}

      <SettingsSection
        icon={User}
        title="Account"
        description="Your Firebase account information."
      >

        <div className="grid gap-5 md:grid-cols-2">

          <SettingsInfo
            icon={User}
            label="Display Name"
            value={
              user?.displayName ||
              "Not provided"
            }
          />

          <SettingsInfo
            icon={Mail}
            label="Email Address"
            value={
              user?.email ||
              "Not provided"
            }
          />

        </div>

      </SettingsSection>


      {/* APPEARANCE */}

      <SettingsSection
        icon={Palette}
        title="Appearance"
        description="Choose how WorkSphere looks on your device."
      >

        <div className="grid gap-3 md:grid-cols-3">

          <ThemeOption
            icon={Sun}
            title="Light"
            description="Use light appearance."
            selected={
              settings.theme ===
              "light"
            }
            onClick={() =>
              handleSettingChange(
                "theme",
                "light"
              )
            }
          />

          <ThemeOption
            icon={Moon}
            title="Dark"
            description="Use dark appearance."
            selected={
              settings.theme ===
              "dark"
            }
            onClick={() =>
              handleSettingChange(
                "theme",
                "dark"
              )
            }
          />

          <ThemeOption
            icon={Monitor}
            title="System"
            description="Follow device settings."
            selected={
              settings.theme ===
              "system"
            }
            onClick={() =>
              handleSettingChange(
                "theme",
                "system"
              )
            }
          />

        </div>

      </SettingsSection>


      {/* NOTIFICATIONS */}

      <SettingsSection
        icon={Bell}
        title="Notifications"
        description="Control which notifications you receive."
      >

        <div className="divide-y divide-slate-200 dark:divide-slate-800">

          <ToggleSetting
            title="Email Notifications"
            description="Receive important WorkSphere updates by email."
            checked={
              settings.emailNotifications
            }
            onChange={(value) =>
              handleSettingChange(
                "emailNotifications",
                value
              )
            }
          />

          <ToggleSetting
            title="Leave Notifications"
            description="Receive notifications about leave requests and updates."
            checked={
              settings.leaveNotifications
            }
            onChange={(value) =>
              handleSettingChange(
                "leaveNotifications",
                value
              )
            }
          />

          <ToggleSetting
            title="Attendance Notifications"
            description="Receive reminders and updates related to attendance."
            checked={
              settings.attendanceNotifications
            }
            onChange={(value) =>
              handleSettingChange(
                "attendanceNotifications",
                value
              )
            }
          />

        </div>

      </SettingsSection>


      {canManageBranding && (
        <SettingsSection
          icon={Building2}
          title="Company Branding"
          description="Manage the company logo and authorized signature used across WorkSphere documents and salary slips."
        >
          {brandingError && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{brandingError}</div>}
          <div className="grid gap-5 lg:grid-cols-2">
            <BrandingUploadCard title="Company Logo" icon={ImagePlus} url={branding.logoUrl} accept="image/png,image/jpeg,image/webp" onChange={(e) => uploadBrandingImage(e, "logoUrl")} />
            <BrandingUploadCard title="Authorized Signature" icon={PenLine} url={branding.signatureUrl} accept="image/png,image/jpeg,image/webp" onChange={(e) => uploadBrandingImage(e, "signatureUrl")} />
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <input value={branding.companyName || ""} onChange={(e) => setBranding((p) => ({ ...p, companyName: e.target.value }))} placeholder="Company name" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950" />
            <input value={branding.signerName || ""} onChange={(e) => setBranding((p) => ({ ...p, signerName: e.target.value }))} placeholder="Authorized signatory name" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950" />
            <input value={branding.signerTitle || ""} onChange={(e) => setBranding((p) => ({ ...p, signerTitle: e.target.value }))} placeholder="Signatory title" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950" />
          </div>
          <button type="button" onClick={handleBrandingSave} disabled={brandingSaving} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-slate-900">
            <Upload size={16} /> {brandingSaving ? "Saving..." : "Save Branding"}
          </button>
        </SettingsSection>
      )}


      {canManageBranding && (
        <SettingsSection
          icon={MapPin}
          title="Attendance & Office Location"
          description="Configure office hours, late policy and the GPS area allowed for attendance. These settings are used automatically by Check In."
        >
          {attendancePolicyError && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{attendancePolicyError}</div>}
          <div className="grid gap-4 md:grid-cols-3">
            <PolicyInput label="Office start" type="time" value={attendancePolicy.officeStartTime} onChange={(v) => setAttendancePolicy((p) => ({ ...p, officeStartTime: v }))} />
            <PolicyInput label="Office end" type="time" value={attendancePolicy.officeEndTime} onChange={(v) => setAttendancePolicy((p) => ({ ...p, officeEndTime: v }))} />
            <PolicyInput label="Late after" type="time" value={attendancePolicy.lateAfterTime} onChange={(v) => setAttendancePolicy((p) => ({ ...p, lateAfterTime: v }))} />
            <PolicyInput label="Break start" type="time" value={attendancePolicy.breakStartTime} onChange={(v) => setAttendancePolicy((p) => ({ ...p, breakStartTime: v }))} />
            <PolicyInput label="Break end" type="time" value={attendancePolicy.breakEndTime} onChange={(v) => setAttendancePolicy((p) => ({ ...p, breakEndTime: v }))} />
            <PolicyInput label="Allowed radius (meters)" type="number" value={attendancePolicy.officeRadiusMeters} onChange={(v) => setAttendancePolicy((p) => ({ ...p, officeRadiusMeters: v }))} min="25" max="5000" />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <PolicyInput label="Office latitude" type="number" value={attendancePolicy.officeLatitude} onChange={(v) => setAttendancePolicy((p) => ({ ...p, officeLatitude: v }))} step="any" placeholder="e.g. 28.6139" />
            <PolicyInput label="Office longitude" type="number" value={attendancePolicy.officeLongitude} onChange={(v) => setAttendancePolicy((p) => ({ ...p, officeLongitude: v }))} step="any" placeholder="e.g. 77.2090" />
          </div>
          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Set office location from this device</p>
                <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">Use the device GPS at the physical office instead of typing coordinates manually. Allow location permission when your browser asks.</p>
                {locationAccuracy !== null && <p className="mt-1 text-xs font-medium text-blue-700 dark:text-blue-300">GPS accuracy: approximately ±{Math.round(locationAccuracy)}m</p>}
              </div>
              <button type="button" onClick={useCurrentOfficeLocation} disabled={locationDetecting} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-blue-950/30">
                {locationDetecting ? <Loader2 size={16} className="animate-spin" /> : <LocateFixed size={16} />}
                {locationDetecting ? "Detecting location..." : "Use my current location"}
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[['Sun',0],['Mon',1],['Tue',2],['Wed',3],['Thu',4],['Fri',5],['Sat',6]].map(([label, day]) => (
              <button key={day} type="button" onClick={() => toggleWorkingDay(day)} className={`rounded-xl border px-4 py-2 text-sm font-semibold ${attendancePolicy.workingDays.includes(day) ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900' : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}>{label}</button>
            ))}
          </div>
          <div className="mt-4">
            <PolicyToggle label="Require office location for Check In" checked={attendancePolicy.locationRequired} onChange={(v) => setAttendancePolicy((p) => ({ ...p, locationRequired: v }))} />
          </div>
          <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-500 dark:text-slate-400"><Clock3 size={15} className="mt-0.5 shrink-0" /> Check In is allowed during the configured office window; late arrivals are marked Late automatically. Outside the office radius, normal Check In is blocked.</p>
          <button type="button" onClick={saveAttendancePolicy} disabled={attendancePolicySaving} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-slate-900">
            {attendancePolicySaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {attendancePolicySaving ? "Saving..." : "Save Attendance Policy"}
          </button>
        </SettingsSection>
      )}

      {canManageBranding && (
        <SettingsSection
          icon={Wallet}
          title="Payroll & Attendance Policy"
          description="These company rules drive automatic attendance-linked payroll calculations."
        >
          {payrollPolicyError && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{payrollPolicyError}</div>}
          <div className="grid gap-4 md:grid-cols-3">
            <PolicyInput label="Working days / month" value={payrollPolicy.workingDaysPerMonth} onChange={(v) => setPayrollPolicy((p) => ({ ...p, workingDaysPerMonth: v }))} min="1" max="31" />
            <PolicyInput label="Standard hours / day" value={payrollPolicy.standardHoursPerDay} onChange={(v) => setPayrollPolicy((p) => ({ ...p, standardHoursPerDay: v }))} min="1" max="24" step="0.5" />
            <PolicyInput label="Overtime multiplier" value={payrollPolicy.overtimeMultiplier} onChange={(v) => setPayrollPolicy((p) => ({ ...p, overtimeMultiplier: v }))} min="1" max="5" step="0.1" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <PolicyToggle label="Approved leave is paid" checked={payrollPolicy.paidLeaveEnabled} onChange={(v) => setPayrollPolicy((p) => ({ ...p, paidLeaveEnabled: v }))} />
            <PolicyToggle label="Calculate overtime automatically" checked={payrollPolicy.overtimeEnabled} onChange={(v) => setPayrollPolicy((p) => ({ ...p, overtimeEnabled: v }))} />
          </div>
          <button type="button" onClick={savePayrollPolicy} disabled={payrollPolicySaving} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-slate-900">
            {payrollPolicySaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {payrollPolicySaving ? "Saving..." : "Save Payroll Policy"}
          </button>
        </SettingsSection>
      )}



      {/* SECURITY */}

      <SettingsSection
        icon={ShieldCheck}
        title="Security"
        description="Manage your account security."
      >

        <div className="space-y-4">

          <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-950/50">

            <div className="flex items-start gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">

                <LockKeyhole size={18} />

              </div>

              <div>

                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Password
                </h3>

                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Send a password reset link to your registered email.
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={
                handlePasswordReset
              }
              disabled={
                sendingReset
              }
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >

              {sendingReset ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <LockKeyhole size={16} />
              )}

              Reset Password

            </button>

          </div>


          <div className="flex flex-col gap-4 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-red-900/50 dark:bg-red-950/20">

            <div className="flex items-start gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">

                <LogOut size={18} />

              </div>

              <div>

                <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">
                  Sign Out
                </h3>

                <p className="mt-1 text-xs leading-5 text-red-700 dark:text-red-400">
                  Sign out from your WorkSphere account on this device.
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={
                handleLogout
              }
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700"
            >

              <LogOut size={16} />

              Sign Out

            </button>

          </div>

        </div>

      </SettingsSection>


      {/* ACTIONS */}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

        <button
          type="button"
          onClick={
            handleReset
          }
          disabled={saving}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >

          <RotateCcw size={16} />

          Reset

        </button>


        <button
          type="button"
          onClick={
            handleSave
          }
          disabled={saving}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
        >

          {saving ? (
            <Loader2
              size={17}
              className="animate-spin"
            />
          ) : (
            <Save size={17} />
          )}

          {saving
            ? "Saving..."
            : "Save Settings"}

        </button>

      </div>

    </div>
  );
}


function BrandingUploadCard({ title, icon: Icon, url, accept, onChange }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"><Icon size={18} /></div>
        <div><p className="font-semibold text-slate-900 dark:text-white">{title}</p><p className="text-xs text-slate-500">PNG, JPG or WEBP · max 5 MB</p></div>
      </div>
      <div className="mt-4 flex min-h-28 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
        {url ? <img src={url} alt={title} className="max-h-24 max-w-full object-contain" /> : <span className="text-sm text-slate-400">No image uploaded</span>}
      </div>
      <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900">
        <Upload size={15} /> Upload
        <input type="file" accept={accept} className="hidden" onChange={onChange} />
      </label>
    </div>
  );
}


/*
|--------------------------------------------------------------------------
| SETTINGS SECTION
|--------------------------------------------------------------------------
*/

function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

      <div className="border-b border-slate-200 p-5 dark:border-slate-800">

        <div className="flex items-center gap-3">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">

            <Icon size={19} />

          </div>

          <div>

            <h2 className="font-bold text-slate-900 dark:text-white">
              {title}
            </h2>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {description}
            </p>

          </div>

        </div>

      </div>

      <div className="p-5">
        {children}
      </div>

    </section>
  );
}


/*
|--------------------------------------------------------------------------
| SETTINGS INFO
|--------------------------------------------------------------------------
*/

function SettingsInfo({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50">

      <div className="flex items-center gap-3">

        <Icon
          size={18}
          className="text-slate-400"
        />

        <div className="min-w-0">

          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {label}
          </p>

          <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white">
            {value}
          </p>

        </div>

      </div>

    </div>
  );
}


/*
|--------------------------------------------------------------------------
| THEME OPTION
|--------------------------------------------------------------------------
*/

function ThemeOption({
  icon: Icon,
  title,
  description,
  selected,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition ${
        selected
          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/10 dark:border-blue-500 dark:bg-blue-950/20"
          : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950/50 dark:hover:border-slate-600 dark:hover:bg-slate-800"
      }`}
    >

      <div className="flex items-center justify-between">

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            selected
              ? "bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
              : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          <Icon size={19} />
        </div>

        {selected && (
          <CheckCircle2
            size={19}
            className="text-blue-600 dark:text-blue-400"
          />
        )}

      </div>

      <h3 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">
        {title}
      </h3>

      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {description}
      </p>

    </button>
  );
}


/*
|--------------------------------------------------------------------------
| TOGGLE
|--------------------------------------------------------------------------
*/

function ToggleSetting({
  title,
  description,
  checked,
  onChange,
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">

      <div className="min-w-0">

        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          {title}
        </h3>

        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {description}
        </p>

      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() =>
          onChange(!checked)
        }
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked
            ? "bg-blue-600"
            : "bg-slate-300 dark:bg-slate-700"
        }`}
      >

        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
            checked
              ? "left-6"
              : "left-1"
          }`}
        />

      </button>

    </div>
  );
}


/*
|--------------------------------------------------------------------------
| APPLY THEME
|--------------------------------------------------------------------------
*/

function applyTheme(theme) {
  const root =
    document.documentElement;

  if (theme === "dark") {
    root.classList.add("dark");
    return;
  }

  if (theme === "light") {
    root.classList.remove("dark");
    return;
  }

  const prefersDark =
    window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

  if (prefersDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}



function PolicyInput({ label, value, onChange, min, max, step = "1", type = "number", placeholder = "" }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span><input type={type} min={min} max={max} step={step} placeholder={placeholder} value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-950" /></label>;
}

function PolicyToggle({ label, checked, onChange }) {
  return <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/50"><span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span><input type="checkbox" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" /></label>;
}

export default Settings;