
/*
|--------------------------------------------------------------------------
| VALIDATION UTILITIES
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| REQUIRED
|--------------------------------------------------------------------------
*/

export const isRequired = (value) => {
  return (
    value !== null &&
    value !== undefined &&
    String(value).trim() !== ""
  );
};


/*
|--------------------------------------------------------------------------
| EMAIL
|--------------------------------------------------------------------------
*/

export const isValidEmail = (
  email
) => {
  if (!email) return false;

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(email).trim()
  );
};


/*
|--------------------------------------------------------------------------
| PHONE
|--------------------------------------------------------------------------
*/

export const isValidPhone = (
  phone
) => {
  if (!phone) return false;

  const digits = String(phone)
    .replace(/\D/g, "");

  return (
    digits.length >= 10 &&
    digits.length <= 15
  );
};


/*
|--------------------------------------------------------------------------
| MIN LENGTH
|--------------------------------------------------------------------------
*/

export const hasMinLength = (
  value,
  minimum
) => {
  if (!value) return false;

  return (
    String(value).trim().length >=
    minimum
  );
};


/*
|--------------------------------------------------------------------------
| MAX LENGTH
|--------------------------------------------------------------------------
*/

export const hasMaxLength = (
  value,
  maximum
) => {
  if (!value) return true;

  return (
    String(value).trim().length <=
    maximum
  );
};


/*
|--------------------------------------------------------------------------
| NUMBER
|--------------------------------------------------------------------------
*/

export const isValidNumber = (
  value
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return false;
  }

  return Number.isFinite(
    Number(value)
  );
};


/*
|--------------------------------------------------------------------------
| POSITIVE NUMBER
|--------------------------------------------------------------------------
*/

export const isPositiveNumber = (
  value
) => {
  return (
    isValidNumber(value) &&
    Number(value) > 0
  );
};


/*
|--------------------------------------------------------------------------
| NON-NEGATIVE NUMBER
|--------------------------------------------------------------------------
*/

export const isNonNegativeNumber = (
  value
) => {
  return (
    isValidNumber(value) &&
    Number(value) >= 0
  );
};


/*
|--------------------------------------------------------------------------
| URL
|--------------------------------------------------------------------------
*/

export const isValidUrl = (
  value
) => {
  if (!value) return false;

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};


/*
|--------------------------------------------------------------------------
| PASSWORD
|--------------------------------------------------------------------------
*/

export const isStrongPassword = (
  password
) => {
  if (!password) return false;

  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password)
  );
};


/*
|--------------------------------------------------------------------------
| CONFIRM PASSWORD
|--------------------------------------------------------------------------
*/

export const passwordsMatch = (
  password,
  confirmPassword
) => {
  return (
    password ===
    confirmPassword
  );
};


/*
|--------------------------------------------------------------------------
| DATE RANGE
|--------------------------------------------------------------------------
*/

export const isValidDateRange = (
  startDate,
  endDate
) => {
  if (!startDate || !endDate) {
    return false;
  }

  return (
    new Date(startDate) <=
    new Date(endDate)
  );
};


/*
|--------------------------------------------------------------------------
| REQUIRED FIELDS
|--------------------------------------------------------------------------
*/

export const validateRequiredFields = (
  data,
  fields
) => {
  const errors = {};

  fields.forEach((field) => {
    if (!isRequired(data?.[field])) {
      errors[field] =
        `${field} is required.`;
    }
  });

  return errors;
};


/*
|--------------------------------------------------------------------------
| VALIDATE EMAIL FIELD
|--------------------------------------------------------------------------
*/

export const validateEmailField = (
  email
) => {
  if (!isRequired(email)) {
    return "Email is required.";
  }

  if (!isValidEmail(email)) {
    return "Please enter a valid email address.";
  }

  return "";
};


/*
|--------------------------------------------------------------------------
| VALIDATE PHONE FIELD
|--------------------------------------------------------------------------
*/

export const validatePhoneField = (
  phone
) => {
  if (!isRequired(phone)) {
    return "Phone number is required.";
  }

  if (!isValidPhone(phone)) {
    return "Please enter a valid phone number.";
  }

  return "";
};
