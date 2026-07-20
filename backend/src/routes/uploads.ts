import { randomUUID } from "node:crypto";
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { createPublicR2Url, createUploadUrl } from "../lib/r2.js";
import { getString } from "../utils/input.js";

const router = Router();
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const safeFolders = new Set([
  "profiles",
  "classes",
  "posts",
  "groups",
  "activities",
  "vendors",
]);

function getSafeFolder(folder: string) {
  if (folder === "post") {
    return "posts";
  }

  return safeFolders.has(folder) ? folder : "misc";
}

function getImageExtension(contentType: string) {
  switch (contentType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    default:
      return "";
  }
}

// Creates an R2 presigned upload URL for a validated image or file key.
router.post("/presigned-url", requireAuth, async (req, res, next) => {
  try {
    const user = res.locals.user;
    const contentType = getString(req.body?.contentType);
    const folder = getSafeFolder(getString(req.body?.folder));

    if (!allowedImageTypes.has(contentType)) {
      res.status(400).json({ message: "Invalid image type." });
      return;
    }

    const extension = getImageExtension(contentType);
    const userId = String(user._id);
    const key =
      folder === "profiles"
        ? `profiles/${userId}/avatar${extension}`
        : `${folder}/${userId}/${randomUUID()}${extension}`;
    const uploadUrl = await createUploadUrl({
      key,
      contentType,
    });
    const publicUrl = createPublicR2Url(key);

    res.json({
      uploadUrl,
      key,
      publicUrl,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
