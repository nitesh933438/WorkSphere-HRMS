import { initializeApp } from "firebase/app";
import { getAuth, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const requiredKeys = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
];

const missingKeys = requiredKeys.filter((key) => !firebaseConfig[key]);
if (missingKeys.length) {
  console.error(
    `[WorkSphere] Firebase configuration is incomplete. Missing: ${missingKeys.join(", ")}. ` +
    "For GitHub Pages, add all VITE_FIREBASE_* values to GitHub Actions Secrets and rebuild."
  );
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Persist sessions across refreshes and GitHub Pages redirects.
export const authPersistenceReady = setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn("[WorkSphere] Firebase auth persistence could not be initialized:", error);
  return null;
});

export const firebaseConfigReady = missingKeys.length === 0;

export default app;
