/*
|--------------------------------------------------------------------------
| STORAGE UTILITIES
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| SET LOCAL STORAGE
|--------------------------------------------------------------------------
*/

export const setLocalStorage = (
  key,
  value
) => {
  if (!key) return false;

  try {
    localStorage.setItem(
      key,
      JSON.stringify(value)
    );

    return true;
  } catch (error) {
    console.error(
      "LocalStorage set error:",
      error
    );

    return false;
  }
};


/*
|--------------------------------------------------------------------------
| GET LOCAL STORAGE
|--------------------------------------------------------------------------
*/

export const getLocalStorage = (
  key,
  fallback = null
) => {
  if (!key) return fallback;

  try {
    const value =
      localStorage.getItem(key);

    if (value === null) {
      return fallback;
    }

    return JSON.parse(value);
  } catch (error) {
    console.error(
      "LocalStorage get error:",
      error
    );

    return fallback;
  }
};


/*
|--------------------------------------------------------------------------
| REMOVE LOCAL STORAGE
|--------------------------------------------------------------------------
*/

export const removeLocalStorage = (
  key
) => {
  if (!key) return false;

  try {
    localStorage.removeItem(key);

    return true;
  } catch (error) {
    console.error(
      "LocalStorage remove error:",
      error
    );

    return false;
  }
};


/*
|--------------------------------------------------------------------------
| CLEAR LOCAL STORAGE
|--------------------------------------------------------------------------
*/

export const clearLocalStorage = () => {
  try {
    localStorage.clear();

    return true;
  } catch (error) {
    console.error(
      "LocalStorage clear error:",
      error
    );

    return false;
  }
};


/*
|--------------------------------------------------------------------------
| SET SESSION STORAGE
|--------------------------------------------------------------------------
*/

export const setSessionStorage = (
  key,
  value
) => {
  if (!key) return false;

  try {
    sessionStorage.setItem(
      key,
      JSON.stringify(value)
    );

    return true;
  } catch (error) {
    console.error(
      "SessionStorage set error:",
      error
    );

    return false;
  }
};


/*
|--------------------------------------------------------------------------
| GET SESSION STORAGE
|--------------------------------------------------------------------------
*/

export const getSessionStorage = (
  key,
  fallback = null
) => {
  if (!key) return fallback;

  try {
    const value =
      sessionStorage.getItem(key);

    if (value === null) {
      return fallback;
    }

    return JSON.parse(value);
  } catch (error) {
    console.error(
      "SessionStorage get error:",
      error
    );

    return fallback;
  }
};


/*
|--------------------------------------------------------------------------
| REMOVE SESSION STORAGE
|--------------------------------------------------------------------------
*/

export const removeSessionStorage = (
  key
) => {
  if (!key) return false;

  try {
    sessionStorage.removeItem(key);

    return true;
  } catch (error) {
    console.error(
      "SessionStorage remove error:",
      error
    );

    return false;
  }
};


/*
|--------------------------------------------------------------------------
| CLEAR SESSION STORAGE
|--------------------------------------------------------------------------
*/

export const clearSessionStorage = () => {
  try {
    sessionStorage.clear();

    return true;
  } catch (error) {
    console.error(
      "SessionStorage clear error:",
      error
    );

    return false;
  }
};
