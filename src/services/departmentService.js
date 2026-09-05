import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../config/firebase";
import { notifyManagementSafely } from "./notificationService";

/*
|--------------------------------------------------------------------------
| FIRESTORE COLLECTION
|--------------------------------------------------------------------------
*/

const departmentsCollection = collection(
  db,
  "departments"
);

/*
|--------------------------------------------------------------------------
| ADD DEPARTMENT
|--------------------------------------------------------------------------
*/

export const addDepartment = async (departmentData) => {
  try {
    if (!departmentData) {
      throw new Error("Department data is required.");
    }

    const name = departmentData.name?.trim() || "";

    if (!name) {
      throw new Error("Department name is required.");
    }

    const cleanDepartmentData = {
      name,
      description:
        departmentData.description?.trim() || "",
      head:
        departmentData.head?.trim() || "",
      location:
        departmentData.location?.trim() || "",
      status:
        departmentData.status || "Active",

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const documentReference = await addDoc(
      departmentsCollection,
      cleanDepartmentData
    );

    await notifyManagementSafely({
      title: "Department created",
      message: `${name} department was created.`,
      type: "success",
      link: "/departments",
    });

    return {
      id: documentReference.id,
      ...cleanDepartmentData,
    };
  } catch (error) {
    console.error(
      "Error adding department:",
      error
    );

    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| GET ALL DEPARTMENTS
|--------------------------------------------------------------------------
*/

export const getDepartments = async () => {
  try {
    const departmentsQuery = query(
      departmentsCollection,
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(
      departmentsQuery
    );

    return snapshot.docs.map(
      (departmentDocument) => ({
        id: departmentDocument.id,
        ...departmentDocument.data(),
      })
    );
  } catch (error) {
    console.error(
      "Error fetching departments:",
      error
    );

    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| GET SINGLE DEPARTMENT
|--------------------------------------------------------------------------
*/

export const getDepartmentById = async (
  departmentId
) => {
  try {
    if (!departmentId) {
      throw new Error(
        "Department ID is required."
      );
    }

    const departmentReference = doc(
      db,
      "departments",
      departmentId
    );

    const snapshot = await getDoc(
      departmentReference
    );

    if (!snapshot.exists()) {
      return null;
    }

    return {
      id: snapshot.id,
      ...snapshot.data(),
    };
  } catch (error) {
    console.error(
      "Error fetching department:",
      error
    );

    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE DEPARTMENT
|--------------------------------------------------------------------------
*/

export const updateDepartment = async (
  departmentId,
  departmentData
) => {
  try {
    if (!departmentId) {
      throw new Error(
        "Department ID is required."
      );
    }

    if (!departmentData) {
      throw new Error(
        "Department data is required."
      );
    }

    const name = departmentData.name?.trim() || "";

    if (!name) {
      throw new Error("Department name is required.");
    }

    const departmentReference = doc(
      db,
      "departments",
      departmentId
    );

    const cleanDepartmentData = {
      name,
      description:
        departmentData.description?.trim() || "",
      head:
        departmentData.head?.trim() || "",
      location:
        departmentData.location?.trim() || "",
      status:
        departmentData.status || "Active",

      updatedAt: serverTimestamp(),
    };

    await updateDoc(
      departmentReference,
      cleanDepartmentData
    );

    await notifyManagementSafely({
      title: "Department updated",
      message: `${name} department details were updated.`,
      type: "info",
      link: "/departments",
    });

    return {
      id: departmentId,
      ...cleanDepartmentData,
    };
  } catch (error) {
    console.error(
      "Error updating department:",
      error
    );

    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| DELETE DEPARTMENT
|--------------------------------------------------------------------------
*/

export const deleteDepartment = async (
  departmentId
) => {
  try {
    if (!departmentId) {
      throw new Error(
        "Department ID is required."
      );
    }

    const departmentReference = doc(
      db,
      "departments",
      departmentId
    );

    const existing = await getDepartmentById(departmentId);
    await deleteDoc(departmentReference);
    await notifyManagementSafely({
      title: "Department removed",
      message: `${existing?.name || "Department"} was removed.`,
      type: "warning",
      link: "/departments",
    });

    return true;
  } catch (error) {
    console.error(
      "Error deleting department:",
      error
    );

    throw error;
  }
};


export const subscribeDepartments = (callback, onError) => {
  const unsubscribe = onSnapshot(departmentsCollection, (snapshot) => {
    const data = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    data.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    callback(data);
  }, (error) => {
    // Realtime department data is optional to the shell. Let the caller
    // decide how to present a genuine failure without console noise.
    if (typeof onError === "function") onError(error);
  });
  return unsubscribe;
};
