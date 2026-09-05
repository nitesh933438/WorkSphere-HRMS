const fs = require("fs");
const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require("../config/cloudinary");

const uploadFile = async (req, res) => {
  let tempFilePath = "";

  try {
    const file = req.files?.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file was uploaded.",
      });
    }

    tempFilePath = file.tempFilePath || "";

    if (!tempFilePath) {
      return res.status(400).json({
        success: false,
        message: "Temporary upload file was not created.",
      });
    }

    const result = await uploadToCloudinary(tempFilePath, {
      folder:
        req.body?.folder ||
        (file.mimetype.startsWith("image/")
          ? "worksphere/employees"
          : "worksphere/documents"),
      resourceType:
        req.body?.resource_type ||
        (file.mimetype.startsWith("image/") ? "image" : "auto"),
    });

    return res.status(200).json({
      success: true,
      message: "File uploaded successfully.",
      url: result.secure_url || result.url || "",
      secure_url: result.secure_url || result.url || "",
      public_id: result.public_id || "",
      resource_type: result.resource_type || "auto",
      format: result.format || "",
      original_filename: result.original_filename || file.name,
      bytes: result.bytes || file.size,
      width: result.width || null,
      height: result.height || null,
    });
  } catch (error) {
    console.error("Cloudinary upload error:", error);

    return res.status(500).json({
      success: false,
      message: error?.message || "Unable to upload file to Cloudinary.",
    });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.warn("Temporary file cleanup failed:", cleanupError);
      }
    }
  }
};

const deleteFile = async (req, res) => {
  try {
    const publicId =
      req.body?.public_id || req.body?.publicId || "";
    const resourceType =
      req.body?.resource_type || req.body?.resourceType || "image";

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: "Cloudinary public ID is required.",
      });
    }

    const result = await deleteFromCloudinary(
      publicId,
      resourceType
    );

    return res.status(200).json({
      success: true,
      message: "File deleted successfully.",
      result,
    });
  } catch (error) {
    console.error("Cloudinary delete error:", error);

    return res.status(500).json({
      success: false,
      message: error?.message || "Unable to delete file from Cloudinary.",
    });
  }
};

module.exports = {
  uploadToCloudinary: uploadFile,
  deleteFromCloudinary: deleteFile,
  uploadFile,
  deleteFile,
};
