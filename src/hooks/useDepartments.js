import { useEffect, useMemo, useState } from "react";
import { subscribeDepartments } from "../services/departmentService";

export function useDepartments({ includeInactive = false } = {}) {
  const [departments, setDepartments] = useState([]);
  const [departmentError, setDepartmentError] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeDepartments(
      (items) => {
        setDepartments(Array.isArray(items) ? items : []);
        setDepartmentError("");
      },
      (error) => setDepartmentError(error?.message || "Unable to load departments.")
    );
    return unsubscribe;
  }, []);

  const activeDepartments = useMemo(
    () => (includeInactive ? departments : departments.filter((d) => d?.status !== "Inactive")),
    [departments, includeInactive]
  );

  return { departments, activeDepartments, departmentError };
}

export function mergeDepartmentOptions(departments, records = []) {
  const values = new Map();
  (departments || []).forEach((d) => {
    const name = String(d?.name || "").trim();
    if (name) values.set(name.toLowerCase(), name);
  });
  (records || []).forEach((r) => {
    const name = String(r?.department || r?.departmentName || "").trim();
    if (name) values.set(name.toLowerCase(), name);
  });
  return Array.from(values.values()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}
