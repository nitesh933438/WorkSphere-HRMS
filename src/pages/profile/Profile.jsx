import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  User,
  X,
} from "lucide-react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import {
  getEmployeeForUser,
  updateEmployeePersonalDetails,
} from "../../services/employeeService";
import { db } from "../../config/firebase";
import { ROLE_LABELS, ROLES } from "../../constants/roleConstants";

export default function Profile() {
  const { user, role, refreshAuthUser } = useAuth();
  const isEmployee = role === ROLES.EMPLOYEE;
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    if (!user?.uid) return;
    try {
      setLoading(true);
      setMessage("");

      if (isEmployee) {
        const data = await getEmployeeForUser(user);
        setProfile(data);
        setForm({
          fullName: data?.fullName || user.displayName || "",
          email: data?.email || user.email || "",
          phone: data?.phone || user.phoneNumber || "",
          employeeCode: data?.employeeCode || "",
          department: data?.department || "",
          designation: data?.designation || "",
          joiningDate: data?.joiningDate || "",
          address: data?.address || "",
          city: data?.city || "",
          state: data?.state || "",
          country: data?.country || "",
          pincode: data?.pincode || "",
        });
      } else {
        const snapshot = await getDoc(doc(db, "users", user.uid));
        const data = snapshot.exists() ? snapshot.data() : {};
        setProfile({ id: user.uid, ...data });
        setForm({
          fullName: data.displayName || user.displayName || "",
          email: data.email || user.email || "",
          phone: data.phone || user.phoneNumber || "",
          department: data.department || "",
          designation: data.designation || "",
          joiningDate: data.joiningDate || "",
          address: data.address || "",
          city: data.city || "",
          state: data.state || "",
          country: data.country || "",
          pincode: data.pincode || "",
        });
      }
    } catch (e) {
      console.error(e);
      setMessage(e?.message || "Unable to load profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) load();
  }, [user?.uid, role]);

  const change = (e) =>
    setForm((previous) => ({ ...previous, [e.target.name]: e.target.value }));

  const save = async () => {
    if (!user?.uid) return;
    try {
      setSaving(true);
      setMessage("");

      if (isEmployee) {
        if (!profile?.id) throw new Error("Employee profile was not found.");
        const updated = await updateEmployeePersonalDetails(profile.id, {
          phone: form.phone,
          address: form.address,
          city: form.city,
          state: form.state,
          country: form.country,
          pincode: form.pincode,
        });
        setProfile((previous) => ({ ...previous, ...updated }));
      } else {
        const updatedUser = {
          uid: user.uid,
          email: user.email || "",
          displayName: form.fullName || user.displayName || "User",
          photoURL: user.photoURL || "",
          role,
          phone: form.phone || "",
          department: form.department || "",
          designation: form.designation || "",
          joiningDate: form.joiningDate || "",
          address: form.address || "",
          city: form.city || "",
          state: form.state || "",
          country: form.country || "",
          pincode: form.pincode || "",
          updatedAt: serverTimestamp(),
        };
        await setDoc(doc(db, "users", user.uid), updatedUser, { merge: true });
        setProfile((previous) => ({ ...previous, ...updatedUser }));
        await refreshAuthUser({
          displayName: updatedUser.displayName,
          photoURL: updatedUser.photoURL || null,
        });
      }

      setEditing(false);
      setMessage("Profile updated successfully.");
    } catch (e) {
      console.error(e);
      setMessage(e?.message || "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const fields = [
    ["fullName", "Full name", User],
    ["email", "Email", Mail],
    ["phone", "Phone", Phone],
    ["department", "Department", Building2],
    ["designation", "Designation", BadgeCheck],
    ["address", "Address", MapPin],
    ["city", "City", MapPin],
    ["state", "State", MapPin],
    ["country", "Country", MapPin],
    ["pincode", "Pincode", MapPin],
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "User"}
                referrerPolicy="no-referrer"
                className="h-16 w-16 rounded-2xl object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-xl font-bold text-white dark:bg-white dark:text-slate-900">
                {(form.fullName || user?.email || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {ROLE_LABELS[role] || "Employee"}
              </p>
              <h1 className="mt-1 text-2xl font-bold">
                {form.fullName || user?.displayName || "My Profile"}
              </h1>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
          </div>

          {!editing ? (
            <button
              onClick={() => {
                setEditing(true);
                setMessage("");
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
            >
              <Pencil size={16} /> Edit Profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(false)}
                disabled={saving}
                className="rounded-xl border px-4 py-3 text-sm font-semibold"
              >
                <X size={16} />
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
              >
                <Save size={16} /> {saving ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </div>
      </section>

      {message && (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900">
          {message}
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-5 md:grid-cols-2">
          {isEmployee && (
            <Info label="Employee Code" value={form.employeeCode || "—"} icon={BadgeCheck} />
          )}
          {isEmployee && (
            <Info label="Joining Date" value={form.joiningDate || "—"} icon={CalendarDays} />
          )}
          {!isEmployee && (
            <Info label="Role" value={ROLE_LABELS[role] || role || "—"} icon={BadgeCheck} />
          )}
          {fields.map(([name, label, Icon]) => (
            <div key={name}>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                {label}
              </label>
              {editing && (!isEmployee || ["phone", "address", "city", "state", "country", "pincode"].includes(name)) ? (
                <div className="relative">
                  <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    name={name}
                    value={form[name] || ""}
                    onChange={change}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-10 py-3 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              ) : (
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800">
                  {form[name] || "—"}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Info({ label, value, icon: Icon }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800">
        <Icon size={16} /> {value}
      </div>
    </div>
  );
}
