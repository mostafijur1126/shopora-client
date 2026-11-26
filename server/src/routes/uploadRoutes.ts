import { randomUUID } from "node:crypto";
import express from "express";
import rateLimit from "express-rate-limit";
import { Router, Request, Response } from "express";
import { v2 as cloudinary } from "cloudinary";
import { asyncHandler, AppError } from "../middleware/errorHandler.js";
import { protect, requirePermission } from "../middleware/auth.js";

const router = Router();

const configureCloudinary = () => {
  const cloudinaryUrl = process.env.CLOUDINARY_URL;
  if (cloudinaryUrl) {
    try {
      const parsed = new URL(cloudinaryUrl);
      if (
        parsed.protocol !== "cloudinary:" ||
        !parsed.hostname ||
        !parsed.username ||
        !parsed.password
      ) {
        throw new Error("Invalid Cloudinary URL");
      }
      cloudinary.config({
        cloud_name: parsed.hostname,
        api_key: decodeURIComponent(parsed.username),
        api_secret: decodeURIComponent(parsed.password),
        secure: true,
      });
    } catch {
      throw new AppError("Cloudinary configuration is invalid.", 503);
    }
    return;
  }

  const {
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
  } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new AppError("Cloudinary media storage is not configured.", 503);
  }
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
};

const uploadImage = async (buffer: Buffer, folder: string) => {
  configureCloudinary();
  return new Promise<{ secure_url: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        public_id: randomUUID(),
        overwrite: false,
      },
      (error, uploaded) => {
        if (error) reject(new AppError("Cloudinary image upload failed.", 502));
        else if (!uploaded?.secure_url)
          reject(new AppError("Media storage returned no URL.", 502));
        else resolve(uploaded as { secure_url: string });
      },
    );
    stream.end(buffer);
  });
};

const paymentProofUploadLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const matchesImageContentType = (buffer: Buffer, contentType: string) => {
  if (contentType === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (contentType === "image/png") {
    return (
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      )
    );
  }
  return (
    contentType === "image/webp" &&
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  );
};

router.post(
  "/media",
  express.raw({ type: ["image/*", "video/*"], limit: "100mb" }),
  protect,
  requirePermission("products:manage"),
  asyncHandler(async (req: Request, res: Response) => {
    const contentType = req.headers["content-type"]?.split(";")[0] || "";
    const resourceType = contentType.startsWith("image/")
      ? "image"
      : contentType.startsWith("video/")
        ? "video"
        : null;
    if (!resourceType) {
      throw new AppError("Upload an image or video file.", 415);
    }

    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      throw new AppError("The uploaded file is empty.", 400);
    }
    if (req.body.length > 100 * 1024 * 1024) {
      throw new AppError("Media files must be 100 MB or smaller.", 413);
    }

    configureCloudinary();
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "shopora/products",
          resource_type: resourceType,
          public_id: randomUUID(),
          overwrite: false,
        },
        (error, uploaded) => {
          if (error) reject(new AppError("Cloudinary media upload failed.", 502));
          else if (!uploaded?.secure_url)
            reject(new AppError("Media storage returned no URL.", 502));
          else resolve(uploaded as { secure_url: string });
        },
      );
      stream.end(req.body);
    });

    res.status(201).json({ success: true, url: result.secure_url });
  }),
);

router.post(
  "/payment-proof",
  paymentProofUploadLimit,
  express.raw({
    type: ["image/jpeg", "image/png", "image/webp"],
    limit: "5mb",
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const contentType = req.headers["content-type"]?.split(";")[0] || "";
    if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
      throw new AppError("Upload a JPG, PNG, or WebP screenshot.", 415);
    }
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      throw new AppError("The uploaded screenshot is empty.", 400);
    }
    if (req.body.length > 5_000_000) {
      throw new AppError("Screenshots must be 5 MB or smaller.", 413);
    }
    if (!matchesImageContentType(req.body, contentType)) {
      throw new AppError("The screenshot contents do not match its image type.", 415);
    }

    const result = await uploadImage(req.body, "shopora/payment-proofs");
    res.status(201).json({ success: true, url: result.secure_url });
  }),
);

export default router;
