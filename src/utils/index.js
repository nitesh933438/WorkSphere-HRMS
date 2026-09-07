/*
|--------------------------------------------------------------------------
| UTILS BARREL EXPORT
|--------------------------------------------------------------------------
| Import utilities from one place:
|
| import {
|   formatDate,
|   formatCurrency,
|   isValidEmail
| } from "../utils";
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| DATE
|--------------------------------------------------------------------------
*/

export {
  toDate,
  formatDate,
  formatDateTime,
  formatTime,
  getDateInputValue,
  getToday,
  calculateDays,
  isValidDateRange,
  isToday,
  isFutureDate,
  isPastDate,
  getRelativeTime,
  startOfDay,
  endOfDay,
  getCurrentYear,
  getCurrentMonth,
} from "./dateUtils";


/*
|--------------------------------------------------------------------------
| FORMAT
|--------------------------------------------------------------------------
*/

export {
  formatCurrency,
  formatNumber,
  formatPercentage,
  capitalize,
  titleCase,
  truncate,
  getInitials,
  formatFileSize,
  formatPhoneNumber,
  formatBoolean,
  displayValue,
} from "./formatUtils";


/*
|--------------------------------------------------------------------------
| VALIDATION
|--------------------------------------------------------------------------
*/

export {
  isRequired,
  isValidEmail,
  isValidPhone,
  hasMinLength,
  hasMaxLength,
  isValidNumber,
  isPositiveNumber,
  isNonNegativeNumber,
  isValidUrl,
  isStrongPassword,
  passwordsMatch,
  validateRequiredFields,
  validateEmailField,
  validatePhoneField,
} from "./validationUtils";


/*
|--------------------------------------------------------------------------
| STORAGE
|--------------------------------------------------------------------------
*/

export {
  setLocalStorage,
  getLocalStorage,
  removeLocalStorage,
  clearLocalStorage,
  setSessionStorage,
  getSessionStorage,
  removeSessionStorage,
  clearSessionStorage,
} from "./storageUtils";


/*
|--------------------------------------------------------------------------
| NOTIFICATIONS
|--------------------------------------------------------------------------
*/

export {
  NOTIFICATION_TYPES,
  getNotificationType,
  getNotificationTitle,
  getUnreadCount,
  sortNotifications,
  getUnreadNotifications,
  markLocalNotificationAsRead,
  markAllLocalNotificationsAsRead,
  normalizeNotification,
} from "./notificationUtils";
