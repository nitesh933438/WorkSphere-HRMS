const cloudinary = require("cloudinary").v2;
const dotenv = require("dotenv");

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ensureConfigured = () => {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error(
      "Cloudinary environment variables are missing. Check backend/.env."
    );
  }
};

const uploadToCloudinary = async (
  filePath,
  options = {}
) => {
  if (!filePath) {
    throw new Error("File path is required.");
  }

  ensureConfigured();

  const result = await cloudinary.uploader.upload(filePath, {
    folder:
      options.folder ||
      process.env.CLOUDINARY_FOLDER ||
      "worksphere/files",
    resource_type: options.resourceType || "auto",
    public_id: options.publicId || undefined,
    use_filename: options.useFilename ?? true,
    unique_filename: options.uniqueFilename ?? true,
    overwrite: options.overwrite ?? false,
  });

  return result;
};

const deleteFromCloudinary = async (
  publicId,
  resourceType = "image"
) => {
  if (!publicId) {
    throw new Error("Cloudinary public_id is required.");
  }

  ensureConfigured();

  return cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType || "image",
  });
};

module.exports = cloudinary;
module.exports.cloudinary = cloudinary;
module.exports.uploadToCloudinary = uploadToCloudinary;
module.exports.deleteFromCloudinary = deleteFromCloudinary;
