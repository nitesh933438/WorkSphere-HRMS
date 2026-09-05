/*
|--------------------------------------------------------------------------
| ANNOUNCEMENT CATEGORIES
|--------------------------------------------------------------------------
*/

export const ANNOUNCEMENT_CATEGORIES = [
  "General",
  "HR",
  "Finance",
  "IT",
  "Events",
  "Holiday",
  "Policy",
];

/*
|--------------------------------------------------------------------------
| ANNOUNCEMENT PRIORITIES
|--------------------------------------------------------------------------
*/

export const ANNOUNCEMENT_PRIORITIES = [
  "High",
  "Normal",
  "Low",
];

/*
|--------------------------------------------------------------------------
| ANNOUNCEMENT STATUS
|--------------------------------------------------------------------------
*/

export const ANNOUNCEMENT_STATUS = {
  PUBLISHED: "Published",
  DRAFT: "Draft",
};

/*
|--------------------------------------------------------------------------
| DEFAULT ANNOUNCEMENT
|--------------------------------------------------------------------------
*/

export const DEFAULT_ANNOUNCEMENT_CATEGORY =
  "General";

export const DEFAULT_ANNOUNCEMENT_PRIORITY =
  "Normal";

export const DEFAULT_ANNOUNCEMENT_STATUS =
  ANNOUNCEMENT_STATUS.PUBLISHED;

/*
|--------------------------------------------------------------------------
| NOTIFICATION LINK
|--------------------------------------------------------------------------
*/

export const ANNOUNCEMENT_NOTIFICATION_LINK =
  "/announcements";