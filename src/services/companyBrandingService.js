import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../config/firebase";

const REF = doc(db, "companySettings", "branding");

export const getCompanyBranding = async () => {
  const snapshot = await getDoc(REF);
  return snapshot.exists() ? snapshot.data() : {};
};

export const saveCompanyBranding = async ({ user, ...branding }) => {
  if (!user?.uid) throw new Error("You must be signed in.");
  await setDoc(REF, {
    ...branding,
    updatedBy: user.uid,
    updatedByEmail: user.email || "",
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return getCompanyBranding();
};
