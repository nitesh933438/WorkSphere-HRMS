const express = require("express");
const fs = require("fs");
const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require("../config/cloudinary");

const router = express.Router();

router.get("/health", (_req, res) => {
  const configured = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );

  res.status(configured ? 200 : 503).json({
    success: configured,
    configured,
    message: configured
      ? "Cloudinary backend is configured."
      : "Cloudinary backend configuration is missing.",
  });
});

router.post("/upload", async (req, res) => {
  let tempFilePath = "";

  try {
    if (!req.files?.file) {
      return res.status(400).json({
        success: false,
        message: "No file was uploaded.",
      });
    }

    const file = req.files.file;
    tempFilePath = file.tempFilePath || "";

    const maxFileSize = 10 * 1024 * 1024;
    if (file.size > maxFileSize) {
      return res.status(400).json({
        success: false,
        message: "File size must be less than 10 MB.",
      });
    }

    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "File type is not supported.",
      });
    }

    if (!tempFilePath) {
      return res.status(400).json({
        success: false,
        message: "Temporary upload file was not created.",
      });
    }

    const resourceType =
      req.body?.resource_type ||
      (file.mimetype.startsWith("image/") ? "image" : "auto");

    const folder =
      req.body?.folder ||
      (file.mimetype.startsWith("image/")
        ? "worksphere/employees"
        : "worksphere/documents");

    const result = await uploadToCloudinary(tempFilePath, {
      folder,
      resourceType,
    });

    return res.status(200).json({
      success: true,
      message: "File uploaded successfully.",
      url: result.secure_url || result.url || "",
      secure_url: result.secure_url || result.url || "",
      public_id: result.public_id || "",
      resource_type: result.resource_type || resourceType,
      format: result.format || "",
      original_filename: result.original_filename || file.name,
      bytes: result.bytes || file.size,
      width: result.width || null,
      height: result.height || null,
    });
  } catch (error) {
    console.error("Cloudinary upload error:", error);

    const isConfigError = /Cloudinary environment variables are missing/i.test(
      error?.message || ""
    );

    return res.status(isConfigError ? 503 : 502).json({
      success: false,
      message: isConfigError
        ? "Cloudinary is not configured on the backend. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to backend/.env and restart the server."
        : error?.message || "Cloudinary upload failed.",
    });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.warn(
          "Unable to remove temporary upload file:",
          cleanupError
        );
      }
    }
  }
});

router.delete("/delete", async (req, res) => {
  try {
    const publicId =
      req.body?.public_id || req.body?.publicId || "";
    const resourceType =
      req.body?.resource_type || req.body?.resourceType || "image";

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: "Cloudinary public_id is required.",
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
      message: error?.message || "Cloudinary delete failed.",
    });
  }
});

module.exports = router;
