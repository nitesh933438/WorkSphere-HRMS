const {
  uploadToCloudinary: upload,
  deleteFromCloudinary: remove,
} = require("../config/cloudinary");

const uploadToCloudinary = async (filePath, options = {}) => {
  return upload(filePath, options);
};

const deleteFromCloudinary = async (
  publicId,
  resourceType = "image"
) => {
  return remove(publicId, resourceType);
};

const uploadImage = async (
  filePath,
  folder = "worksphere/images"
) => {
  return uploadToCloudinary(filePath, {
    folder,
    resourceType: "image",
  });
};

const uploadDocument = async (
  filePath,
  folder = "worksphere/documents"
) => {
  return uploadToCloudinary(filePath, {
    folder,
    resourceType: "auto",
  });
};

const deleteImage = async (publicId) => {
  return deleteFromCloudinary(publicId, "image");
};

const deleteDocument = async (
  publicId,
  resourceType = "raw"
) => {
  return deleteFromCloudinary(publicId, resourceType);
};

module.exports = {
  uploadToCloudinary,
  uploadImage,
  uploadDocument,
  deleteFromCloudinary,
  deleteImage,
  deleteDocument,
};
