/*
|--------------------------------------------------------------------------
| DATE UTILITIES
|--------------------------------------------------------------------------
*/

export const toDate = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  if (typeof value?.toDate === "function") {
    const date = value.toDate();
    return isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(value);

  return isNaN(date.getTime()) ? null : date;
};


/*
|--------------------------------------------------------------------------
| FORMAT DATE
|--------------------------------------------------------------------------
*/

export const formatDate = (
  value,
  options = {}
) => {
  const date = toDate(value);

  if (!date) return "N/A";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  }).format(date);
};


/*
|--------------------------------------------------------------------------
| FORMAT DATE TIME
|--------------------------------------------------------------------------
*/

export const formatDateTime = (value) => {
  const date = toDate(value);

  if (!date) return "N/A";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};


/*
|--------------------------------------------------------------------------
| FORMAT TIME
|--------------------------------------------------------------------------
*/

export const formatTime = (value) => {
  const date = toDate(value);

  if (!date) return "N/A";

  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};


/*
|--------------------------------------------------------------------------
| DATE INPUT VALUE
|--------------------------------------------------------------------------
*/

export const getDateInputValue = (
  value = new Date()
) => {
  const date = toDate(value);

  if (!date) return "";

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};


/*
|--------------------------------------------------------------------------
| TODAY
|--------------------------------------------------------------------------
*/

export const getToday = () => {
  return getDateInputValue(new Date());
};


/*
|--------------------------------------------------------------------------
| CALCULATE DAYS
|--------------------------------------------------------------------------
| Inclusive:
| 10 Aug → 12 Aug = 3 days
|--------------------------------------------------------------------------
*/

export const calculateDays = (
  startDate,
  endDate
) => {
  const start = toDate(startDate);
  const end = toDate(endDate);

  if (!start || !end) return 0;

  const startDay = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  );

  const endDay = new Date(
    end.getFullYear(),
    end.getMonth(),
    end.getDate()
  );

  const difference =
    endDay.getTime() -
    startDay.getTime();

  if (difference < 0) return 0;

  return (
    Math.floor(
      difference /
        (1000 * 60 * 60 * 24)
    ) + 1
  );
};


/*
|--------------------------------------------------------------------------
| VALID DATE RANGE
|--------------------------------------------------------------------------
*/

export const isValidDateRange = (
  startDate,
  endDate
) => {
  const start = toDate(startDate);
  const end = toDate(endDate);

  if (!start || !end) return false;

  return start <= end;
};


/*
|--------------------------------------------------------------------------
| TODAY CHECK
|--------------------------------------------------------------------------
*/

export const isToday = (value) => {
  const date = toDate(value);

  if (!date) return false;

  const today = new Date();

  return (
    date.getFullYear() ===
      today.getFullYear() &&
    date.getMonth() ===
      today.getMonth() &&
    date.getDate() ===
      today.getDate()
  );
};


/*
|--------------------------------------------------------------------------
| FUTURE DATE
|--------------------------------------------------------------------------
*/

export const isFutureDate = (value) => {
  const date = toDate(value);

  if (!date) return false;

  const today = new Date();

  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  return date > today;
};


/*
|--------------------------------------------------------------------------
| PAST DATE
|--------------------------------------------------------------------------
*/

export const isPastDate = (value) => {
  const date = toDate(value);

  if (!date) return false;

  const today = new Date();

  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  return date < today;
};


/*
|--------------------------------------------------------------------------
| RELATIVE TIME
|--------------------------------------------------------------------------
*/

export const getRelativeTime = (value) => {
  const date = toDate(value);

  if (!date) return "N/A";

  const now = new Date();

  const difference =
    now.getTime() -
    date.getTime();

  const seconds =
    Math.floor(difference / 1000);

  if (seconds < 10) {
    return "Just now";
  }

  if (seconds < 60) {
    return `${seconds} seconds ago`;
  }

  const minutes =
    Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes} ${
      minutes === 1
        ? "minute"
        : "minutes"
    } ago`;
  }

  const hours =
    Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} ${
      hours === 1
        ? "hour"
        : "hours"
    } ago`;
  }

  const days =
    Math.floor(hours / 24);

  if (days < 7) {
    return `${days} ${
      days === 1
        ? "day"
        : "days"
    } ago`;
  }

  return formatDate(date);
};


/*
|--------------------------------------------------------------------------
| START OF DAY
|--------------------------------------------------------------------------
*/

export const startOfDay = (
  value = new Date()
) => {
  const date = toDate(value);

  if (!date) return null;

  date.setHours(
    0,
    0,
    0,
    0
  );

  return date;
};


/*
|--------------------------------------------------------------------------
| END OF DAY
|--------------------------------------------------------------------------
*/

export const endOfDay = (
  value = new Date()
) => {
  const date = toDate(value);

  if (!date) return null;

  date.setHours(
    23,
    59,
    59,
    999
  );

  return date;
};


/*
|--------------------------------------------------------------------------
| CURRENT YEAR
|--------------------------------------------------------------------------
*/

export const getCurrentYear = () => {
  return new Date().getFullYear();
};


/*
|--------------------------------------------------------------------------
| CURRENT MONTH
|--------------------------------------------------------------------------
*/

export const getCurrentMonth = () => {
  return new Date().getMonth() + 1;
};