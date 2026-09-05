import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../config/firebase";
import { createAnnouncementNotification, notifyManagementSafely } from "./notificationService";
import { ROLES } from "../constants/roleConstants";

const announcementsCollection = collection(
  db,
  "announcements"
);

/*
|--------------------------------------------------------------------------
| ADD ANNOUNCEMENT
|--------------------------------------------------------------------------
*/

export const addAnnouncement = async (
  announcementData
) => {
  try {
    if (!announcementData) {
      throw new Error(
        "Announcement data is required."
      );
    }

    const cleanData = {
      title:
        announcementData.title?.trim() || "",

      description:
        announcementData.description?.trim() || "",

      category:
        announcementData.category?.trim() ||
        "General",

      priority:
        announcementData.priority || "Normal",

      status:
        announcementData.status || "Published",

      publishDate:
        announcementData.publishDate || "",

      createdBy:
        announcementData.createdBy || "",

      createdByName:
        announcementData.createdByName || "",

      createdAt: serverTimestamp(),

      updatedAt: serverTimestamp(),
    };

    if (!cleanData.title) {
      throw new Error(
        "Announcement title is required."
      );
    }

    if (!cleanData.description) {
      throw new Error(
        "Announcement description is required."
      );
    }

    const announcementReference =
      await addDoc(
        announcementsCollection,
        cleanData
      );

    if (cleanData.status === "Published") {
      await createAnnouncementNotification({
        title: cleanData.title,
        message: cleanData.description,
        announcementId: announcementReference.id,
        type: cleanData.priority === "High" ? "warning" : "announcement",
        link: `/announcements`,
      });
    }

    return {
      id: announcementReference.id,
      ...cleanData,
    };
  } catch (error) {
    console.error(
      "Error adding announcement:",
      error
    );

    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| GET ANNOUNCEMENTS
|--------------------------------------------------------------------------
*/

export const getAnnouncements = async () => {
  try {
    const announcementsQuery = query(announcementsCollection, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(announcementsQuery);
    return snapshot.docs.map((announcementDocument) => ({ id: announcementDocument.id, ...announcementDocument.data() }));
  } catch (error) {
    console.error("Error fetching announcements:", error);
    throw error;
  }
};

export const getAnnouncementsForRole = async (role) => {
  const management = [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER].includes(role);

  // Management can see the full lifecycle, including drafts.
  if (management) {
    return getAnnouncements();
  }

  // Employees must never even read draft announcements from Firestore.
  const publishedQuery = query(
    announcementsCollection,
    where("status", "==", "Published")
  );
  const snapshot = await getDocs(publishedQuery);

  return snapshot.docs
    .map((announcementDocument) => ({
      id: announcementDocument.id,
      ...announcementDocument.data(),
    }))
    .sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });
};

/*
|--------------------------------------------------------------------------
| COMPATIBILITY ALIAS
|--------------------------------------------------------------------------
*/

export const getAllAnnouncements = async () => {
  return await getAnnouncements();
};

/*
|--------------------------------------------------------------------------
| GET SINGLE ANNOUNCEMENT
|--------------------------------------------------------------------------
*/

export const getAnnouncementById = async (
  announcementId
) => {
  try {
    if (!announcementId) {
      throw new Error(
        "Announcement ID is required."
      );
    }

    const announcementReference = doc(
      db,
      "announcements",
      announcementId
    );

    const snapshot = await getDoc(
      announcementReference
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
      "Error fetching announcement:",
      error
    );

    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE ANNOUNCEMENT
|--------------------------------------------------------------------------
*/

export const updateAnnouncement = async (
  announcementId,
  announcementData
) => {
  try {
    if (!announcementId) {
      throw new Error(
        "Announcement ID is required."
      );
    }

    if (!announcementData) {
      throw new Error(
        "Announcement data is required."
      );
    }

    const announcementReference = doc(
      db,
      "announcements",
      announcementId
    );

    const cleanData = {
      title:
        announcementData.title?.trim() || "",

      description:
        announcementData.description?.trim() || "",

      category:
        announcementData.category?.trim() ||
        "General",

      priority:
        announcementData.priority || "Normal",

      status:
        announcementData.status || "Published",

      publishDate:
        announcementData.publishDate || "",

      updatedAt: serverTimestamp(),
    };

    if (!cleanData.title) {
      throw new Error(
        "Announcement title is required."
      );
    }

    if (!cleanData.description) {
      throw new Error(
        "Announcement description is required."
      );
    }

    await updateDoc(
      announcementReference,
      cleanData
    );

    if (cleanData.status === "Published") {
      await createAnnouncementNotification({
        title: `Announcement updated: ${cleanData.title}`,
        message: cleanData.description,
        announcementId: announcementId,
        type: "announcement",
        link: `/announcements`,
      });
    }

    return {
      id: announcementId,
      ...cleanData,
    };
  } catch (error) {
    console.error(
      "Error updating announcement:",
      error
    );

    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| DELETE ANNOUNCEMENT
|--------------------------------------------------------------------------
*/

export const deleteAnnouncement = async (
  announcementId
) => {
  try {
    if (!announcementId) {
      throw new Error(
        "Announcement ID is required."
      );
    }

    const announcementReference = doc(
      db,
      "announcements",
      announcementId
    );

    const existing = await getAnnouncementById(announcementId);
    await deleteDoc(announcementReference);
    await notifyManagementSafely({
      title: "Announcement deleted",
      message: `${existing?.title || "An announcement"} was deleted.`,
      type: "warning",
      link: "/announcements",
    });

    return true;
  } catch (error) {
    console.error(
      "Error deleting announcement:",
      error
    );

    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| DEFAULT EXPORT
|--------------------------------------------------------------------------
*/

const announcementService = {
  addAnnouncement,
  getAnnouncements,
  getAllAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
};

export default announcementService;