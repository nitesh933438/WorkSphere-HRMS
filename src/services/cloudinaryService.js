const configuredApiRoot = String(
  import.meta.env.VITE_API_BASE_URL || ""
)
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

const API_BASE_URL = configuredApiRoot
  ? `${configuredApiRoot}/api/cloudinary`
  : "/api/cloudinary";

/*
|--------------------------------------------------------------------------
| IMAGE TYPES
|--------------------------------------------------------------------------
*/

const IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

/*
|--------------------------------------------------------------------------
| DOCUMENT TYPES
|--------------------------------------------------------------------------
*/

const DOCUMENT_TYPES = [
  ...IMAGE_TYPES,

  "application/pdf",

  "application/msword",

  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  "application/vnd.ms-excel",

  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

  "text/plain",
];

/*
|--------------------------------------------------------------------------
| LIMITS
|--------------------------------------------------------------------------
*/

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const MAX_IMAGE_SIZE =
  5 * 1024 * 1024;

/*
|--------------------------------------------------------------------------
| HANDLE RESPONSE
|--------------------------------------------------------------------------
*/

const handleResponse = async (
  response
) => {
  let data = {};

  try {
    data =
      await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Request failed with status ${response.status}.`
    );
  }

  return data;
};

/*
|--------------------------------------------------------------------------
| VALIDATE FILE
|--------------------------------------------------------------------------
*/

const validateFile = (
  file,
  { imageOnly = false } = {}
) => {
  if (!file) {
    throw new Error(
      "Please select a file."
    );
  }

  const allowedTypes =
    imageOnly
      ? IMAGE_TYPES
      : DOCUMENT_TYPES;

  if (
    !allowedTypes.includes(
      file.type
    )
  ) {
    throw new Error(
      imageOnly
        ? "Only JPG, JPEG, PNG and WEBP images are allowed."
        : "This file type is not supported."
    );
  }

  const maxSize =
    imageOnly
      ? MAX_IMAGE_SIZE
      : MAX_FILE_SIZE;

  if (file.size > maxSize) {
    throw new Error(
      imageOnly
        ? "Image size must be less than 5 MB."
        : "File size must be less than 10 MB."
    );
  }
};

/*
|--------------------------------------------------------------------------
| UPLOAD TO CLOUDINARY
|--------------------------------------------------------------------------
*/

export const uploadToCloudinary = async (
  file,
  options = {}
) => {
  validateFile(
    file,
    options
  );

  const formData =
    new FormData();

  formData.append(
    "file",
    file
  );

  if (options.folder) {
    formData.append(
      "folder",
      options.folder
    );
  }

  if (options.resourceType) {
    formData.append(
      "resource_type",
      options.resourceType
    );
  }

  let response;

  try {
    const healthResponse = await fetch(
      `${API_BASE_URL}/health`,
      { method: "GET" }
    );

    if (!healthResponse.ok) {
      let healthData = {};
      try {
        healthData = await healthResponse.json();
      } catch {
        healthData = {};
      }
      throw new Error(
        healthData?.message ||
          "Cloudinary backend is unavailable or not configured."
      );
    }

    response = await fetch(
      `${API_BASE_URL}/upload`,
      {
        method: "POST",
        body: formData,
      }
    );
  } catch (error) {
    console.error(
      "Cloudinary connection error:",
      error
    );

    throw new Error(
      "Unable to reach the WorkSphere Cloudinary backend. Start the backend on port 5000 and verify backend/.env contains the Cloudinary credentials."
    );
  }

  const result =
    await handleResponse(
      response
    );

  const fileUrl =
    result?.secure_url ||
    result?.url ||
    result?.data?.secure_url ||
    result?.data?.url ||
    result?.file?.secure_url ||
    result?.file?.url ||
    "";

  const publicId =
    result?.public_id ||
    result?.publicId ||
    result?.data?.public_id ||
    result?.data?.publicId ||
    result?.file?.public_id ||
    result?.file?.publicId ||
    "";

  if (!fileUrl) {
    throw new Error(
      "Cloudinary upload succeeded, but no file URL was returned by the backend."
    );
  }

  return {
    ...result,

    url: fileUrl,

    secure_url: fileUrl,

    public_id: publicId,

    resource_type:
      result?.resource_type ||
      result?.resourceType ||
      "auto",

    format:
      result?.format ||
      "",

    bytes:
      result?.bytes ||
      file.size,

    width:
      result?.width ||
      null,

    height:
      result?.height ||
      null,

    original_filename:
      result?.original_filename ||
      result?.originalFilename ||
      file.name,
  };
};

/*
|--------------------------------------------------------------------------
| DELETE FROM CLOUDINARY
|--------------------------------------------------------------------------
*/

export const deleteFromCloudinary =
  async (
    publicId,
    resourceType = "auto"
  ) => {
    if (!publicId) {
      throw new Error(
        "Cloudinary public_id is required."
      );
    }

    let response;

    try {
      response = await fetch(
        `${API_BASE_URL}/delete`,
        {
          method: "DELETE",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            public_id:
              publicId,

            resource_type:
              resourceType ||
              "auto",
          }),
        }
      );
    } catch (error) {
      console.error(
        "Cloudinary delete connection error:",
        error
      );

      throw new Error(
        "Unable to connect to the WorkSphere backend while deleting the Cloudinary file."
      );
    }

    return handleResponse(
      response
    );
  };

/*
|--------------------------------------------------------------------------
| EMPLOYEE PHOTO
|--------------------------------------------------------------------------
*/

export const uploadEmployeePhoto =
  async (file) => {
    return uploadToCloudinary(
      file,
      {
        folder:
          "worksphere/employees",

        resourceType:
          "image",

        imageOnly: true,
      }
    );
  };

/*
|--------------------------------------------------------------------------
| GENERAL IMAGE
|--------------------------------------------------------------------------
*/

export const uploadImageToCloudinary =
  async (file) => {
    const result =
      await uploadToCloudinary(
        file,
        {
          folder:
            "worksphere/images",

          resourceType:
            "image",

          imageOnly: true,
        }
      );

    return result.url;
  };

/*
|--------------------------------------------------------------------------
| DEFAULT EXPORT
|--------------------------------------------------------------------------
*/

export default {
  uploadToCloudinary,

  deleteFromCloudinary,

  uploadEmployeePhoto,

  uploadImageToCloudinary,
};