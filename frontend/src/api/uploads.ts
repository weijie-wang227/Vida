import { apiRequest } from "./client";

type FolderTypes = "profiles" | "classes" | "posts" | "groups" | "activities";

export async function getPresignedUploadUrl(data: {
  fileName: string;
  contentType: string;
  folder: FolderTypes;
}): Promise<{
  uploadUrl: string;
  key: string;
  publicUrl: string;
}> {
  return apiRequest("/uploads/presigned-url", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function uploadImageToR2(file: File, folder: FolderTypes) {
  const { uploadUrl, publicUrl } = await getPresignedUploadUrl({
    fileName: file.name,
    contentType: file.type,
    folder,
  });
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error("Failed to upload image.");
  }

  if (folder === "profiles") {
    return `${publicUrl}?v=${Date.now()}`;
  }

  return publicUrl;
}
