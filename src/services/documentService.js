import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  serverTimestamp,
  updateDoc,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "../config/firebase";
import { ROLES } from "../constants/roleConstants";
import { createNotification, notifyManagementSafely } from "./notificationService";

import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "./cloudinaryService";

const DOCUMENTS_COLLECTION = "documents";

const getCurrentUser = () => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("You must be logged in.");
  }

  return user;
};

export const formatFileSize = (bytes) => {
  const size = Number(bytes) || 0;

  if (size === 0) {
    return "0 Bytes";
  }

  const units = [
    "Bytes",
    "KB",
    "MB",
    "GB",
    "TB",
  ];

  const index = Math.floor(
    Math.log(size) / Math.log(1024)
  );

  const safeIndex = Math.min(
    index,
    units.length - 1
  );

  const value =
    size /
    Math.pow(1024, safeIndex);

  return `${value.toFixed(
    safeIndex === 0 ? 0 : 2
  )} ${units[safeIndex]}`;
};

export const formatDocumentDate = (
  timestamp
) => {
  if (!timestamp) {
    return "—";
  }

  let date = null;

  if (
    typeof timestamp.toDate ===
    "function"
  ) {
    date = timestamp.toDate();
  } else if (
    timestamp instanceof Date
  ) {
    date = timestamp;
  } else {
    date = new Date(timestamp);
  }

  if (
    !date ||
    Number.isNaN(date.getTime())
  ) {
    return "—";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
};

export const createDocument = async (
  documentData
) => {
  const user = getCurrentUser();

  if (!documentData) {
    throw new Error(
      "Document data is required."
    );
  }

  const file =
    documentData.file ||
    documentData.fileObject ||
    null;

  if (
    typeof File !== "undefined" &&
    !(file instanceof File)
  ) {
    throw new Error(
      "Please select a valid file."
    );
  }

  if (!file) {
    throw new Error(
      "Please select a valid file."
    );
  }

  let cloudinaryResult = null;

  try {
    cloudinaryResult =
      await uploadToCloudinary(file, {
        folder:
          "worksphere/documents",
        resourceType: "auto",
      });

    if (
      !cloudinaryResult ||
      cloudinaryResult.success === false
    ) {
      throw new Error(
        cloudinaryResult?.message ||
          "Cloudinary upload failed."
      );
    }

    const fileUrl =
      cloudinaryResult.secure_url ||
      cloudinaryResult.url ||
      "";

    if (!fileUrl) {
      throw new Error(
        "Cloudinary did not return a file URL."
      );
    }

    const cloudinaryPublicId =
      cloudinaryResult.public_id ||
      "";

    if (!cloudinaryPublicId) {
      throw new Error(
        "Cloudinary did not return a public ID."
      );
    }

    const firestoreData = {
      userId: user.uid,
      userEmail: user.email || "",
      ownerName: user.displayName || user.email || "Employee",

      name:
        documentData.name?.trim() ||
        file.name,

      originalName: file.name,

      fileName: file.name,

      fileType:
        file.type ||
        documentData.fileType ||
        "application/octet-stream",

      type:
        documentData.type ||
        file.type ||
        "file",

      size:
        Number(file.size) || 0,

      formattedSize:
        formatFileSize(file.size),

      category:
        documentData.category?.trim() ||
        "General",

      description:
        documentData.description?.trim() ||
        "",

      fileUrl,

      cloudinaryUrl:
        fileUrl,

      cloudinaryPublicId,

      cloudinaryResourceType:
        cloudinaryResult.resource_type ||
        "image",

      cloudinaryFormat:
        cloudinaryResult.format ||
        "",

      cloudinaryOriginalFilename:
        cloudinaryResult.original_filename ||
        file.name,

      cloudinaryBytes:
        Number(
          cloudinaryResult.bytes
        ) ||
        Number(file.size) ||
        0,

      createdAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp(),
    };

    let documentRef;

    try {
      documentRef =
        await addDoc(
          collection(
            db,
            DOCUMENTS_COLLECTION
          ),
          firestoreData
        );
    } catch (firestoreError) {
      try {
        await deleteFromCloudinary(
          cloudinaryPublicId,
          cloudinaryResult.resource_type ||
            "image"
        );
      } catch (cleanupError) {
        console.warn(
          "Cloudinary cleanup failed:",
          cleanupError
        );
      }

      throw firestoreError;
    }

    await notifyManagementSafely({
      title: "New document uploaded",
      message: `${firestoreData.name || "A document"} was uploaded by ${user.email || "an employee"}.`,
      type: "info",
      link: "/documents",
    });

    return {
      id: documentRef.id,
      ...firestoreData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (error) {
    console.error(
      "Create document error:",
      error
    );

    throw new Error(
      error?.message ||
        "Unable to upload document."
    );
  }
};

export const getDocuments = async () => {
  const user = getCurrentUser();
  try {
    const roleSnapshot = await getDoc(doc(db, "users", user.uid));
    const role = roleSnapshot.exists() ? roleSnapshot.data()?.role : ROLES.EMPLOYEE;
    const isManagement = [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER].includes(role);

    const documentsQuery = isManagement
      ? collection(db, DOCUMENTS_COLLECTION)
      : query(collection(db, DOCUMENTS_COLLECTION), where("userId", "==", user.uid));

    const snapshot = await getDocs(documentsQuery);
    const documents = snapshot.docs.map((documentSnapshot) => ({
      id: documentSnapshot.id,
      ...documentSnapshot.data(),
    }));

    documents.sort((a, b) => {
      const getTime = (timestamp) => {
        if (timestamp?.toDate) return timestamp.toDate().getTime();
        if (timestamp instanceof Date) return timestamp.getTime();
        const parsed = new Date(timestamp);
        return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
      };
      return getTime(b.createdAt) - getTime(a.createdAt);
    });

    return documents;
  } catch (error) {
    console.error("Error loading documents:", error);
    throw error;
  }
};

export const getDocumentsForUser = getDocuments;

export const deleteDocument = async (
  documentId,
  documentData = null
) => {
  getCurrentUser();

  if (!documentId) {
    throw new Error(
      "Document ID is required."
    );
  }

  try {
    let data = documentData;

    if (!data) {
      data =
        await getDocument(
          documentId
        );
    } else {
      if (
        data.userId &&
        data.userId !==
          auth.currentUser?.uid
      ) {
        throw new Error(
          "You are not allowed to delete this document."
        );
      }
    }

    const publicId =
      data?.cloudinaryPublicId ||
      data?.public_id ||
      data?.publicId ||
      "";

    const resourceType =
      data?.cloudinaryResourceType ||
      data?.resource_type ||
      "image";

    if (publicId) {
      try {
        await deleteFromCloudinary(
          publicId,
          resourceType
        );
      } catch (error) {
        console.warn(
          "Cloudinary delete warning:",
          error
        );
      }
    }

    await deleteDoc(
      doc(
        db,
        DOCUMENTS_COLLECTION,
        documentId
      )
    );
    await notifyManagementSafely({
      title: "Document deleted",
      message: `${data?.name || "A document"} was deleted by ${user.email || "an employee"}.`,
      type: "warning",
      link: "/documents",
    });

    return true;
  } catch (error) {
    console.error(
      "Delete document error:",
      error
    );

    throw new Error(
      error?.message ||
        "Unable to delete document."
    );
  }
};

export const updateDocument = async (
  documentId,
  updates
) => {
  const user = getCurrentUser();

  if (!documentId) {
    throw new Error(
      "Document ID is required."
    );
  }

  if (!updates) {
    throw new Error(
      "Update data is required."
    );
  }

  try {
    const existingDocument =
      await getDocument(
        documentId
      );

    if (
      existingDocument.userId !==
      user.uid
    ) {
      throw new Error(
        "You are not allowed to update this document."
      );
    }

    const safeUpdates = {
      ...updates,
      updatedAt:
        serverTimestamp(),
    };

    delete safeUpdates.file;
    delete safeUpdates.fileObject;
    delete safeUpdates.userId;

    delete safeUpdates.cloudinaryPublicId;
    delete safeUpdates.cloudinaryResourceType;
    delete safeUpdates.cloudinaryUrl;
    delete safeUpdates.fileUrl;

    if (
      typeof safeUpdates.name ===
      "string"
    ) {
      safeUpdates.name =
        safeUpdates.name.trim();
    }

    if (
      typeof safeUpdates.category ===
      "string"
    ) {
      safeUpdates.category =
        safeUpdates.category.trim();
    }

    if (
      typeof safeUpdates.description ===
      "string"
    ) {
      safeUpdates.description =
        safeUpdates.description.trim();
    }

    await updateDoc(
      doc(
        db,
        DOCUMENTS_COLLECTION,
        documentId
      ),
      safeUpdates
    );
    await notifyManagementSafely({
      title: "Document updated",
      message: `${existingDocument.name || "A document"} was updated by ${user.email || "an employee"}.`,
      type: "info",
      link: "/documents",
    });

    return {
      id: documentId,
      ...existingDocument,
      ...safeUpdates,
      updatedAt: new Date(),
    };
  } catch (error) {
    console.error(
      "Update document error:",
      error
    );

    throw new Error(
      error?.message ||
        "Unable to update document."
    );
  }
};
