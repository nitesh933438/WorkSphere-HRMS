import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "../config/firebase";
import { ROLES } from "../constants/roleConstants";
import { notifyManagementSafely } from "./notificationService";

const employeesCollection = collection(db, "employees");
const clean = (v) => String(v ?? "").trim();
const email = (v) => clean(v).toLowerCase();
const normalizeRole = (v) =>
  Object.values(ROLES).includes(v) ? v : ROLES.EMPLOYEE;

const prepare = (data = {}) => {
  const fullName =
    clean(data.fullName || data.name) ||
    `${clean(data.firstName)} ${clean(data.lastName)}`.trim();

  return {
    uid: clean(data.uid),
    employeeCode: clean(data.employeeCode || data.employeeId).toUpperCase(),
    fullName,
    name: fullName,
    firstName: clean(data.firstName) || fullName.split(" ")[0] || "",
    lastName: clean(data.lastName) || fullName.split(" ").slice(1).join(" "),
    email: email(data.email),
    phone: clean(data.phone),
    department: clean(data.department),
    designation: clean(data.designation),
    joiningDate: data.joiningDate || "",
    employmentType: clean(data.employmentType) || "Full-time",
    status: clean(data.status) || "Active",
    role: normalizeRole(data.role),
    isEmployee: normalizeRole(data.role) === ROLES.EMPLOYEE,
    accountType: normalizeRole(data.role) === ROLES.EMPLOYEE ? "employee" : "management",
    gender: clean(data.gender),
    dateOfBirth: data.dateOfBirth || "",
    photoURL: clean(data.photoURL || data.photoUrl),
    address: clean(data.address),
    city: clean(data.city),
    state: clean(data.state),
    country: clean(data.country),
    pincode: clean(data.pincode || data.pinCode),
    emergencyContactName: clean(data.emergencyContactName),
    emergencyContactPhone: clean(data.emergencyContactPhone),
    emergencyContactRelation: clean(data.emergencyContactRelation),
  };
};

const validate = (data) => {
  if (!data.fullName) throw new Error("Employee name is required.");
  if (!data.email) throw new Error("Employee email is required.");
  if (!data.employeeCode) throw new Error("Employee code is required.");
};

export const getEmployeeByUid = async (uid) => {
  if (!uid) return null;
  const snapshot = await getDocs(
    query(employeesCollection, where("uid", "==", uid))
  );
  if (snapshot.empty) return null;
  const item = snapshot.docs[0];
  return { id: item.id, ...item.data() };
};

export const getEmployeeForUser = async (user) => {
  if (!user?.uid) return null;
  const byUid = await getEmployeeByUid(user.uid);
  if (byUid) return byUid;
  if (!user.email) return null;
  const snapshot = await getDocs(
    query(employeesCollection, where("email", "==", email(user.email)))
  );
  if (snapshot.empty) return null;
  const item = snapshot.docs[0];
  return { id: item.id, ...item.data() };
};

export const ensureEmployeeForUser = async (user, role = ROLES.EMPLOYEE) => {
  if (!user?.uid || !user?.email || normalizeRole(role) !== ROLES.EMPLOYEE) return null;

  const normalizedEmail = email(user.email);
  const existingByUid = await getEmployeeByUid(user.uid);
  if (existingByUid) return existingByUid;

  // Employees are created only by Admin/HR. A normal login may only claim
  // an already-created employee record whose official email matches.
  const byEmail = await getDocs(
    query(employeesCollection, where("email", "==", normalizedEmail))
  );
  if (byEmail.empty) return null;

  const item = byEmail.docs[0];
  const existing = { id: item.id, ...item.data() };

  if (existing.uid && existing.uid !== user.uid) return existing;
  if (!existing.uid) {
    await updateDoc(item.ref, {
      uid: user.uid,
      updatedAt: serverTimestamp(),
    });
    return { ...existing, uid: user.uid };
  }

  return existing;
};

export const addEmployee = async (employeeData) => {
  const cleanData = {
    ...prepare(employeeData),
    role: ROLES.EMPLOYEE,
    isEmployee: true,
    accountType: "employee",
  };
  validate(cleanData);

  const existingSnapshot = await getDocs(
    query(employeesCollection, where("email", "==", cleanData.email))
  );

  if (!existingSnapshot.empty) {
    const item = existingSnapshot.docs[0];
    await updateDoc(item.ref, { ...cleanData, updatedAt: serverTimestamp() });
    return { id: item.id, ...item.data(), ...cleanData };
  }

  const created = await addDoc(employeesCollection, {
    ...cleanData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await notifyManagementSafely({
    title: "New employee added",
    message: `${cleanData.fullName} (${cleanData.employeeCode}) has been added to the employee directory.`,
    type: "success",
    link: `/employees/${created.id}`,
  });
  return { id: created.id, ...cleanData };
};

export const getEmployees = async () => {
  try {
    const snapshot = await getDocs(
      query(employeesCollection, orderBy("createdAt", "desc"))
    );
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  } catch (error) {
    const snapshot = await getDocs(employeesCollection);
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  }
};

export const getAllEmployees = getEmployees;

// Realtime employee directory subscription. This keeps management screens
// (including payroll employee selection) synchronized immediately when an
// employee is added, edited, or removed without requiring a manual refresh.
export const subscribeEmployees = (callback, onError) => {
  if (typeof callback !== "function") {
    throw new Error("Employee subscription callback is required.");
  }

  const unsubscribe = onSnapshot(
    employeesCollection,
    (snapshot) => {
      const employees = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        });

      callback(employees);
    },
    (error) => {
      console.error("Employee realtime subscription error:", error);
      if (typeof onError === "function") onError(error);
    }
  );

  return unsubscribe;
};

export const getEmployeeById = async (employeeId) => {
  if (!employeeId) throw new Error("Employee ID is required.");
  const snapshot = await getDoc(doc(db, "employees", employeeId));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
};

export const getEmployeeByCode = async (employeeCode) => {
  const code = clean(employeeCode).toUpperCase();
  if (!code) return null;
  const snapshot = await getDocs(
    query(employeesCollection, where("employeeCode", "==", code))
  );
  if (snapshot.empty) return null;
  const item = snapshot.docs[0];
  return { id: item.id, ...item.data() };
};

export const updateEmployee = async (employeeId, employeeData) => {
  if (!employeeId) throw new Error("Employee ID is required.");
  const cleanData = prepare(employeeData);
  validate(cleanData);
  await updateDoc(doc(db, "employees", employeeId), {
    ...cleanData,
    updatedAt: serverTimestamp(),
  });
  await notifyManagementSafely({
    title: "Employee profile updated",
    message: `${cleanData.fullName} (${cleanData.employeeCode}) employee details were updated.`,
    type: "info",
    link: `/employees/${employeeId}`,
  });
  return { id: employeeId, ...cleanData };
};

export const updateEmployeePersonalDetails = async (employeeId, updates = {}) => {
  if (!employeeId) throw new Error("Employee ID is required.");
  const allowed = {
    phone: clean(updates.phone),
    address: clean(updates.address),
    city: clean(updates.city),
    state: clean(updates.state),
    country: clean(updates.country),
    pincode: clean(updates.pincode),
    updatedAt: serverTimestamp(),
  };
  await updateDoc(doc(db, "employees", employeeId), allowed);
  return { id: employeeId, ...allowed };
};

export const deleteEmployee = async (employeeId) => {
  if (!employeeId) throw new Error("Employee ID is required.");
  const existing = await getEmployeeById(employeeId);
  await deleteDoc(doc(db, "employees", employeeId));
  await notifyManagementSafely({
    title: "Employee removed",
    message: `${existing?.fullName || existing?.name || "An employee"} was removed from the employee directory.`,
    type: "warning",
    link: "/employees",
  });
  return true;
};

export default {
  addEmployee,
  getEmployees,
  getAllEmployees,
  subscribeEmployees,
  ensureEmployeeForUser,
  getEmployeeForUser,
  getEmployeeById,
  getEmployeeByCode,
  getEmployeeByUid,
  updateEmployee,
  updateEmployeePersonalDetails,
  deleteEmployee,
};
