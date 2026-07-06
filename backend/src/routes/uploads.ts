import { randomUUID } from "node:crypto";
import { Router } from "express";
import { findAuthenticatedUser } from "../auth.js";
import { createPublicR2Url, createUploadUrl } from "../lib/r2.js";

const router = Router();
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const safeFolders = new Set([
  "profiles",
  "classes",
  "posts",
  "groups",
  "activities",
]);

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

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

router.post("/presigned-url", async (req, res, next) => {
  try {
    const user = await findAuthenticatedUser(req.headers.authorization);

    if (!user) {
      res.status(401).json({ message: "Not signed in." });
      return;
    }

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
