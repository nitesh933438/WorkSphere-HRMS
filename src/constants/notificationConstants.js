/*
|--------------------------------------------------------------------------
| NOTIFICATION TYPES
|--------------------------------------------------------------------------
*/

export const NOTIFICATION_TYPES = {
  INFO: "info",
  SUCCESS: "success",
  WARNING: "warning",
  ERROR: "error",
  ANNOUNCEMENT: "announcement",
};

/*
|--------------------------------------------------------------------------
| NOTIFICATION AUDIENCE
|--------------------------------------------------------------------------
*/

export const NOTIFICATION_AUDIENCE = {
  USER: "user",
};

/*
|--------------------------------------------------------------------------
| DEFAULT VALUES
|--------------------------------------------------------------------------
*/

export const DEFAULT_NOTIFICATION_TYPE =
  NOTIFICATION_TYPES.INFO;

export const DEFAULT_NOTIFICATION_LINK =
  "/notifications";

/*
|--------------------------------------------------------------------------
| NOTIFICATION LIMIT
|--------------------------------------------------------------------------
*/

export const NOTIFICATION_LIMIT = 50;