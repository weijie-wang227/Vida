import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
    throw new Error("Missing R2 environment variables.");
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrl: publicUrl.replace(/\/$/, ""),
  };
}

function createR2Client() {
  const { accountId, accessKeyId, secretAccessKey } = getR2Config();

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export async function createUploadUrl(params: {
  key: string;
  contentType: string;
}) {
  const { bucketName } = getR2Config();
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: params.key,
    ContentType: params.contentType,
  });

  return getSignedUrl(createR2Client(), command, {
    expiresIn: 60 * 5,
  });
}

export function createPublicR2Url(key: string) {
  return `${getR2Config().publicUrl}/${key}`;
}

export async function deleteR2Object(key: string) {
  const { bucketName } = getR2Config();
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return createR2Client().send(command);
}
