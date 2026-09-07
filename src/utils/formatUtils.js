/*
|--------------------------------------------------------------------------
| FORMAT UTILITIES
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| CURRENCY
|--------------------------------------------------------------------------
*/

export const formatCurrency = (
  value,
  currency = "INR"
) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "₹0";
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }
  ).format(number);
};


/*
|--------------------------------------------------------------------------
| NUMBER
|--------------------------------------------------------------------------
*/

export const formatNumber = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return new Intl.NumberFormat(
    "en-IN"
  ).format(number);
};


/*
|--------------------------------------------------------------------------
| PERCENTAGE
|--------------------------------------------------------------------------
*/

export const formatPercentage = (
  value,
  decimals = 0
) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0%";
  }

  return `${number.toFixed(decimals)}%`;
};


/*
|--------------------------------------------------------------------------
| CAPITALIZE
|--------------------------------------------------------------------------
*/

export const capitalize = (value) => {
  if (!value) return "";

  const text = String(value).trim();

  if (!text) return "";

  return (
    text.charAt(0).toUpperCase() +
    text.slice(1).toLowerCase()
  );
};


/*
|--------------------------------------------------------------------------
| TITLE CASE
|--------------------------------------------------------------------------
*/

export const titleCase = (value) => {
  if (!value) return "";

  return String(value)
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) =>
      word
        ? word.charAt(0).toUpperCase() +
          word.slice(1)
        : ""
    )
    .join(" ");
};


/*
|--------------------------------------------------------------------------
| TRUNCATE
|--------------------------------------------------------------------------
*/

export const truncate = (
  value,
  maxLength = 100
) => {
  if (!value) return "";

  const text = String(value);

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(
    0,
    Math.max(0, maxLength - 3)
  )}...`;
};


/*
|--------------------------------------------------------------------------
| INITIALS
|--------------------------------------------------------------------------
*/

export const getInitials = (
  name,
  maxLetters = 2
) => {
  if (!name) return "U";

  const words = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 1) {
    return words[0]
      .slice(0, maxLetters)
      .toUpperCase();
  }

  return words
    .slice(0, maxLetters)
    .map((word) =>
      word.charAt(0)
    )
    .join("")
    .toUpperCase();
};


/*
|--------------------------------------------------------------------------
| FILE SIZE
|--------------------------------------------------------------------------
*/

export const formatFileSize = (
  bytes
) => {
  const size = Number(bytes);

  if (
    !Number.isFinite(size) ||
    size <= 0
  ) {
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
    Math.log(size) /
      Math.log(1024)
  );

  const safeIndex = Math.min(
    index,
    units.length - 1
  );

  const value =
    size /
    Math.pow(
      1024,
      safeIndex
    );

  return `${value.toFixed(
    safeIndex === 0 ? 0 : 2
  )} ${units[safeIndex]}`;
};


/*
|--------------------------------------------------------------------------
| PHONE NUMBER
|--------------------------------------------------------------------------
*/

export const formatPhoneNumber = (
  value
) => {
  if (!value) return "";

  const digits = String(value)
    .replace(/\D/g, "");

  if (digits.length === 10) {
    return `${digits.slice(
      0,
      5
    )} ${digits.slice(5)}`;
  }

  return String(value);
};


/*
|--------------------------------------------------------------------------
| BOOLEAN LABEL
|--------------------------------------------------------------------------
*/

export const formatBoolean = (
  value,
  trueLabel = "Yes",
  falseLabel = "No"
) => {
  return value
    ? trueLabel
    : falseLabel;
};


/*
|--------------------------------------------------------------------------
| EMPTY VALUE
|--------------------------------------------------------------------------
*/

export const displayValue = (
  value,
  fallback = "N/A"
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  return value;
};