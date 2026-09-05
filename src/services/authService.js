import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  getRedirectResult,
  signInWithRedirect,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
} from "firebase/auth";

import { auth, authPersistenceReady, firebaseConfigReady } from "../config/firebase";

/*
|--------------------------------------------------------------------------
| GOOGLE PROVIDER
|--------------------------------------------------------------------------
*/

const googleProvider =
  new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account",
});

/*
|--------------------------------------------------------------------------
| REGISTER USER
|--------------------------------------------------------------------------
*/

export const registerUser = async ({
  fullName,
  email,
  password,
}) => {
  try {
    const cleanName =
      fullName?.trim() || "";

    const cleanEmail =
      email?.trim().toLowerCase() || "";

    if (!cleanName) {
      throw new Error(
        "Full name is required."
      );
    }

    if (!cleanEmail) {
      throw new Error(
        "Email address is required."
      );
    }

    if (!password) {
      throw new Error(
        "Password is required."
      );
    }

    const userCredential =
      await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

    const firebaseUser =
      userCredential.user;

    /*
    |--------------------------------------------------------------------------
    | SAVE DISPLAY NAME
    |--------------------------------------------------------------------------
    */

    await updateProfile(firebaseUser, {
      displayName: cleanName,
    });

    return {
      user: firebaseUser,
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: cleanName,
      photoURL:
        firebaseUser.photoURL || null,
    };
  } catch (error) {
    console.error(
      "Registration failed:",
      error
    );

    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| LOGIN WITH EMAIL
|--------------------------------------------------------------------------
|
| Login.jsx is using:
|
| loginWithEmail()
|
|--------------------------------------------------------------------------
*/

export const loginWithEmail = async (credentials, passwordArg) => {
  const email = typeof credentials === "string" ? credentials : credentials?.email;
  const password = typeof credentials === "string" ? passwordArg : credentials?.password;
  try {
    if (!firebaseConfigReady) {
      throw new Error("Firebase is not configured in this deployment. Add the VITE_FIREBASE_* GitHub Secrets and rebuild the site.");
    }
    await authPersistenceReady;
    const cleanEmail =
      email?.trim().toLowerCase() || "";

    if (!cleanEmail) {
      throw new Error(
        "Email address is required."
      );
    }

    if (!password) {
      throw new Error(
        "Password is required."
      );
    }

    const userCredential =
      await signInWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

    const firebaseUser =
      userCredential.user;

    return {
      user: firebaseUser,

      uid: firebaseUser.uid,

      email: firebaseUser.email,

      displayName:
        firebaseUser.displayName ||
        "User",

      photoURL:
        firebaseUser.photoURL || null,
    };
  } catch (error) {
    console.error(
      "Email login failed:",
      error
    );

    /*
    |--------------------------------------------------------------------------
    | FRIENDLY FIREBASE ERRORS
    |--------------------------------------------------------------------------
    */

    if (
      error?.code ===
      "auth/invalid-credential"
    ) {
      throw new Error(
        "Invalid email or password."
      );
    }

    if (
      error?.code ===
      "auth/user-not-found"
    ) {
      throw new Error(
        "No account found with this email address."
      );
    }

    if (
      error?.code ===
      "auth/wrong-password"
    ) {
      throw new Error(
        "Incorrect password."
      );
    }

    if (
      error?.code ===
      "auth/invalid-email"
    ) {
      throw new Error(
        "Please enter a valid email address."
      );
    }

    if (
      error?.code ===
      "auth/too-many-requests"
    ) {
      throw new Error(
        "Too many login attempts. Please try again later."
      );
    }

    throw error;
  }
};


/*
|--------------------------------------------------------------------------
| PASSWORD RESET
|--------------------------------------------------------------------------
*/

export const resetPassword = async (email) => {
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail) throw new Error("Email address is required.");

  try {
    await sendPasswordResetEmail(auth, cleanEmail);
    return true;
  } catch (error) {
    console.error("Password reset failed:", error);
    if (error?.code === "auth/invalid-email") {
      throw new Error("Please enter a valid email address.");
    }
    if (error?.code === "auth/user-not-found") {
      throw new Error("No account found with this email address.");
    }
    if (error?.code === "auth/too-many-requests") {
      throw new Error("Too many reset requests. Please try again later.");
    }
    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| LOGIN USER
|--------------------------------------------------------------------------
|
| Compatibility alias.
|
| Agar project ki kisi aur file mein:
|
| loginUser()
|
| use ho raha hai, to woh bhi work karega.
|
|--------------------------------------------------------------------------
*/

export const loginUser = async ({
  email,
  password,
}) => {
  return await loginWithEmail({
    email,
    password,
  });
};

/*
|--------------------------------------------------------------------------
| LOGIN WITH GOOGLE
|--------------------------------------------------------------------------
*/

export const loginWithGoogle = async () => {
  try {
    if (!firebaseConfigReady) {
      throw new Error("Firebase is not configured. Check the VITE_FIREBASE_* values and restart the dev server.");
    }

    await authPersistenceReady;

    // Popup is the primary localhost flow because it returns the Firebase
    // User immediately. Redirect is only a fallback when the browser blocks
    // the popup. The COOP message some browsers print is only a warning; it
    // does not mean Firebase authentication failed.
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Google login failed:", error);

    if (error?.code === "auth/popup-blocked") {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    if (error?.code === "auth/popup-closed-by-user") {
      throw new Error("Google sign-in was cancelled. Please complete the Google sign-in window.");
    }
    if (error?.code === "auth/unauthorized-domain") {
      throw new Error("This domain is not authorized in Firebase. Add localhost to Authentication → Settings → Authorized domains.");
    }
    if (error?.code === "auth/operation-not-allowed") {
      throw new Error("Google sign-in is disabled. Enable Google in Firebase Authentication → Sign-in method.");
    }
    if (error?.code === "auth/network-request-failed") {
      throw new Error("Network error while signing in with Google. Please check your connection and try again.");
    }
    throw error;
  }
};

export const completeGoogleRedirectLogin = async () => {
  try {
    if (!firebaseConfigReady) return null;
    await authPersistenceReady;
    const result = await getRedirectResult(auth);
    return result?.user || null;
  } catch (error) {
    console.error("Google redirect completion failed:", error);
    if (error?.code === "auth/unauthorized-domain") {
      throw new Error("This domain is not authorized in Firebase. Add it under Authentication → Settings → Authorized domains.");
    }
    if (error?.code === "auth/operation-not-allowed") {
      throw new Error("Google sign-in is disabled in Firebase Authentication.");
    }
    if (error?.code === "auth/account-exists-with-different-credential") {
      throw new Error("An account already exists with this email using another login method.");
    }
    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| LOGOUT
|--------------------------------------------------------------------------
*/

export const logoutUser =
  async () => {
    try {
      await signOut(auth);

      return true;
    } catch (error) {
      console.error(
        "Logout failed:",
        error
      );

      throw error;
    }
  };

/*
|--------------------------------------------------------------------------
| GET CURRENT USER
|--------------------------------------------------------------------------
*/

export const getCurrentUser = () => {
  return auth.currentUser;
};

/*
|--------------------------------------------------------------------------
| AUTH STATE LISTENER
|--------------------------------------------------------------------------
*/

export const subscribeToAuthChanges = (
  callback
) => {
  return onAuthStateChanged(
    auth,
    callback
  );
};

/*
|--------------------------------------------------------------------------
| IS USER LOGGED IN
|--------------------------------------------------------------------------
*/

export const isUserLoggedIn = () => {
  return !!auth.currentUser;
};

/*
|--------------------------------------------------------------------------
| GET USER PROFILE
|--------------------------------------------------------------------------
*/

export const getUserProfile = () => {
  const firebaseUser =
    auth.currentUser;

  if (!firebaseUser) {
    return null;
  }

  return {
    uid: firebaseUser.uid,

    email:
      firebaseUser.email || "",

    displayName:
      firebaseUser.displayName ||
      "User",

    photoURL:
      firebaseUser.photoURL || null,

    emailVerified:
      firebaseUser.emailVerified,
  };
};