import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  addAnnouncement,
  deleteAnnouncement,
  getAnnouncements,
  updateAnnouncement,
} from "../services/announcementService";

import { useAuth } from "../context/AuthContext";

/*
|--------------------------------------------------------------------------
| USE ANNOUNCEMENTS
|--------------------------------------------------------------------------
*/

export function useAnnouncements() {
  const { user } = useAuth();

  const [announcements, setAnnouncements] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | LOAD
  |--------------------------------------------------------------------------
  */

  const loadAnnouncements =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const data =
          await getAnnouncements();

        setAnnouncements(data);
      } catch (error) {
        console.error(
          "Error loading announcements:",
          error
        );

        setError(
          error?.message ||
            "Unable to load announcements."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  /*
  |--------------------------------------------------------------------------
  | CREATE
  |--------------------------------------------------------------------------
  */

  const createAnnouncement =
    useCallback(
      async (announcementData) => {
        try {
          setSaving(true);
          setError("");

          const data = {
            ...announcementData,

            createdBy:
              user?.uid || "",

            createdByName:
              user?.displayName ||
              user?.email ||
              "Administrator",
          };

          const created =
            await addAnnouncement(data);

          await loadAnnouncements();

          return created;
        } catch (error) {
          console.error(
            "Error creating announcement:",
            error
          );

          setError(
            error?.message ||
              "Unable to create announcement."
          );

          throw error;
        } finally {
          setSaving(false);
        }
      },
      [
        user,
        loadAnnouncements,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | UPDATE
  |--------------------------------------------------------------------------
  */

  const editAnnouncement =
    useCallback(
      async (
        announcementId,
        announcementData
      ) => {
        try {
          setSaving(true);
          setError("");

          const updated =
            await updateAnnouncement(
              announcementId,
              announcementData
            );

          await loadAnnouncements();

          return updated;
        } catch (error) {
          console.error(
            "Error updating announcement:",
            error
          );

          setError(
            error?.message ||
              "Unable to update announcement."
          );

          throw error;
        } finally {
          setSaving(false);
        }
      },
      [loadAnnouncements]
    );

  /*
  |--------------------------------------------------------------------------
  | DELETE
  |--------------------------------------------------------------------------
  */

  const removeAnnouncement =
    useCallback(
      async (announcementId) => {
        try {
          setError("");

          await deleteAnnouncement(
            announcementId
          );

          setAnnouncements(
            (previous) =>
              previous.filter(
                (announcement) =>
                  announcement.id !==
                  announcementId
              )
          );

          return true;
        } catch (error) {
          console.error(
            "Error deleting announcement:",
            error
          );

          setError(
            error?.message ||
              "Unable to delete announcement."
          );

          return false;
        }
      },
      []
    );

  return {
    announcements,

    loading,
    saving,
    error,

    loadAnnouncements,

    createAnnouncement,
    editAnnouncement,
    removeAnnouncement,
  };
}

export default useAnnouncements;