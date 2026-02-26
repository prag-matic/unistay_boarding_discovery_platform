import multer from "multer";
import type { Request, Response } from "express";

// Configure multer for memory storage (files stored in Buffer)
const storage = multer.memoryStorage();

// File filter for images
const imageFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.",
      ),
    );
  }
};

// File filter for videos
const videoFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedMimes = ["video/mp4", "video/webm", "video/quicktime"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only MP4, WebM, and MOV are allowed."));
  }
};

// Upload limits
const limits = {
  fileSize: 10 * 1024 * 1024, // 10MB per file
};

// Combined middleware for review uploads (handles both images and video)
export const uploadReviewMedia = multer({
  storage,
  limits: {
    ...limits,
    files: 6, // Max 5 images + 1 video
  },
}).fields([
  { name: "images", maxCount: 5 },
  { name: "video", maxCount: 1 },
]);

// Custom middleware to validate files
export const validateReviewFiles = (
  req: Request,
  res: Response,
  next: Function,
) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  // Validate images
  if (files.images) {
    const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    for (const image of files.images) {
      if (!allowedMimes.includes(image.mimetype)) {
        return res.status(400).json({
          success: false,
          error: "UploadError",
          message: `Invalid image type: ${image.originalname} (${image.mimetype}). Only JPEG, PNG, GIF, and WebP are allowed.`,
        });
      }
    }
  }

  // Validate video
  if (files.video && files.video.length > 0) {
    const allowedMimes = ["video/mp4", "video/webm", "video/quicktime"];
    const video = files.video[0];
    const fileExt = "." + video.originalname.split(".").pop()?.toLowerCase();
    const videoExtensions = [".mp4", ".webm", ".mov", ".mkv", ".avi"];

    // Allow octet-stream if file has video extension (curl sometimes doesn't detect MIME correctly)
    if (
      !allowedMimes.includes(video.mimetype) &&
      !(
        video.mimetype === "application/octet-stream" &&
        videoExtensions.includes(fileExt)
      )
    ) {
      return res.status(400).json({
        success: false,
        error: "UploadError",
        message: `Invalid video type: ${video.originalname} (${video.mimetype}). Only MP4, WebM, and MOV are allowed.`,
      });
    }
  }

  next();
};

export default {
  uploadReviewMedia,
  validateReviewFiles,
  storage,
  imageFilter,
  videoFilter,
  limits,
};
