import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { auth, authPersistenceReady, db } from "../config/firebase";
import { ROLES } from "../constants/roleConstants";
import { ensureEmployeeForUser } from "../services/employeeService";

const AuthContext = createContext(null);
export const ADMIN_EMAIL = "nitesh933438@gmail.com";

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const isGoogleUser = (user) => Boolean(user?.providerData?.some((p) => p.providerId === "google.com"));
const isAdminIdentity = (user) => normalizeEmail(user?.email) === normalizeEmail(ADMIN_EMAIL);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(false);

  useEffect(() => {
    let disposed = false;
    let unsubscribe = () => {};

    const handleUser = async (currentUser) => {
      if (disposed) return;

      // The very first null event is authoritative only after Firebase has
      // finished restoring persistence. authPersistenceReady is awaited below.
      if (!currentUser) {
        setUser(null);
        setRole(null);
        setRoleLoading(false);
        setLoading(false);
        return;
      }

      setUser(currentUser);
      setLoading(false);
      setRoleLoading(true);

      const admin = isAdminIdentity(currentUser);
      const userRef = doc(db, "users", currentUser.uid);

      // Never downgrade the configured administrator because of a Firestore
      // read failure. Authentication is already successful at this point.
      if (admin) {
        setRole(ROLES.ADMIN);
        setRoleLoading(false);
        setDoc(userRef, {
          uid: currentUser.uid,
          email: currentUser.email || "",
          displayName: currentUser.displayName || "Administrator",
          photoURL: currentUser.photoURL || "",
          role: ROLES.ADMIN,
          authProvider: currentUser.providerData?.[0]?.providerId || "",
          updatedAt: serverTimestamp(),
        }, { merge: true }).catch(() => {});
        return;
      }

      try {
        const snapshot = await Promise.race([
          getDoc(userRef),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Role lookup timeout")), 5000)),
        ]);

        if (disposed) return;

        const data = snapshot.exists() ? snapshot.data() : null;
        const savedRole = data?.role;
        const resolvedRole = [ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE].includes(savedRole)
          ? savedRole
          : ROLES.EMPLOYEE;

        setRole(resolvedRole);
        setRoleLoading(false);

        if (!snapshot.exists()) {
          setDoc(userRef, {
            uid: currentUser.uid,
            email: currentUser.email || "",
            displayName: currentUser.displayName || "User",
            photoURL: currentUser.photoURL || "",
            role: ROLES.EMPLOYEE,
            authProvider: currentUser.providerData?.[0]?.providerId || "",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true }).catch(() => {});
        }

        if (resolvedRole === ROLES.EMPLOYEE) {
          ensureEmployeeForUser(currentUser, ROLES.EMPLOYEE).catch(() => {});
        }
      } catch (error) {
        // A role lookup must never trap an authenticated user on the login
        // route. Firestore may be temporarily unavailable during bootstrap.
        if (!disposed) {
          setRole(ROLES.EMPLOYEE);
          setRoleLoading(false);
        }
      }
    };

    const bootstrapAuth = async () => {
      // Wait until Firebase has selected its persistence mechanism before
      // attaching the listener. This prevents the initial null event from
      // racing a restored Google/email session.
      await authPersistenceReady;
      if (disposed) return;

      unsubscribe = onAuthStateChanged(auth, handleUser);

    };

    bootstrapAuth().catch((error) => {
      if (!disposed) {
        console.error("Authentication bootstrap failed:", error);
        setLoading(false);
        setRoleLoading(false);
      }
    });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, []);

  const refreshAuthUser = async (updates = {}) => {
    if (!auth.currentUser) return null;
    try {
      if (updates.displayName !== undefined || updates.photoURL !== undefined) {
        await updateProfile(auth.currentUser, {
          displayName: updates.displayName ?? auth.currentUser.displayName ?? "",
          photoURL: updates.photoURL ?? auth.currentUser.photoURL ?? null,
        });
      }
      await auth.currentUser.reload();
      setUser(auth.currentUser);
      return auth.currentUser;
    } catch (error) {
      console.warn("Unable to refresh Firebase profile:", error);
      setUser(auth.currentUser);
      return auth.currentUser;
    }
  };

  const value = useMemo(() => {
    const resolvedUser = user || auth.currentUser || null;
    const isAdmin = role === ROLES.ADMIN;
    const isHR = role === ROLES.HR;
    const isManager = role === ROLES.MANAGER;
    const isEmployee = role === ROLES.EMPLOYEE;
    return {
      user: resolvedUser,
      role,
      loading,
      roleLoading,
      isAuthenticated: Boolean(resolvedUser),
      isAdmin,
      isHR,
      isManager,
      isEmployee,
      isManagement: isAdmin || isHR || isManager,
      isGoogleUser: isGoogleUser(resolvedUser),
      isAdminIdentity: isAdminIdentity(resolvedUser),
      refreshAuthUser,
    };
  }, [user, role, loading, roleLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
