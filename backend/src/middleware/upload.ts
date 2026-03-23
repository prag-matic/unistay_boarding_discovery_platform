import type { Request, Response } from "express";
import type { IFile, IOptions, FileFilterCallback } from "multer";
import multer from "multer";
import { AppError } from "@/errors/AppError.js";

const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const ALLOWED_VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const BOARDING_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_BOARDING_IMAGES = 8;

// Configure multer for memory storage (files stored in Buffer)
const storage = multer.memoryStorage();

// File filter for images
const imageFilter = (_req: Request, file: IFile, cb: FileFilterCallback) => {
  if (ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
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
const videoFilter = (_req: Request, file: IFile, cb: FileFilterCallback) => {
  if (ALLOWED_VIDEO_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only MP4, WebM, and MOV are allowed."));
  }
};

function boardingFileFilter(
  _req: Request,
  file: IFile,
  cb: FileFilterCallback,
): void {
  if (BOARDING_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError("Only JPEG/PNG/WebP images are allowed", 400));
  }
}

// Upload limits
const limits: IOptions["limits"] = {
  fileSize: 10 * 1024 * 1024, // 10MB per file
};

// Combined middleware for review uploads (handles both images and video)
export const uploadReviewMedia: ReturnType<typeof multer> = multer({
  storage,
  limits: {
    ...limits,
    files: 6, // Max 5 images + 1 video
  },
}).fields([
  { name: "images", maxCount: 5 },
  { name: "video", maxCount: 1 },
]);

export const uploadProfileImageMiddleware: ReturnType<typeof multer> = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).single("profileImage");

export const uploadBoardingImageMiddleware: ReturnType<typeof multer> = multer({
  storage,
  fileFilter: boardingFileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).array("images", MAX_BOARDING_IMAGES);

// Custom middleware to validate files
export const validateReviewFiles = (
  req: Request,
  res: Response,
  next: (...args: unknown[]) => unknown,
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
    const fileExt = `.${video.originalname.split(".").pop()?.toLowerCase()}`;
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
} as const;
