import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Portable object storage over the S3 API: RustFS/MinIO locally, Cloudflare R2 in production, MinIO/S3 on a VPS.
// Browsers upload directly with a presigned PUT URL, so files never pass through the app (Vercel limits bodies to 4.5 MB).

export const MEDIA_CACHE_CONTROL = "public, max-age=31536000, immutable";

type StorageConfig = { client: S3Client; bucket: string };
const globalForStorage = globalThis as typeof globalThis & { ajetStorage?: { signature: string; config: StorageConfig } };

export function getStorage(): StorageConfig | null {
  const endpoint = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null;
  const signature = [endpoint, bucket, accessKeyId].join("|");
  if (globalForStorage.ajetStorage?.signature !== signature) {
    globalForStorage.ajetStorage = {
      signature,
      config: {
        bucket,
        client: new S3Client({
          endpoint,
          region: process.env.S3_REGION ?? "auto",
          forcePathStyle: true,
          credentials: { accessKeyId, secretAccessKey },
          // Without this the SDK signs a checksum of the (empty) presign body, which R2 rejects on upload.
          requestChecksumCalculation: "WHEN_REQUIRED",
          responseChecksumValidation: "WHEN_REQUIRED",
        }),
      },
    };
  }
  return globalForStorage.ajetStorage.config;
}

/** Presigned PUT URL. The browser must send exactly these headers, or the signature check fails. */
export async function createUploadUrl(storage: StorageConfig, key: string, contentType: string) {
  const headers = { "Content-Type": contentType, "Cache-Control": MEDIA_CACHE_CONTROL };
  const url = await getSignedUrl(storage.client, new PutObjectCommand({
    Bucket: storage.bucket,
    Key: key,
    ContentType: contentType,
    CacheControl: MEDIA_CACHE_CONTROL,
  }), {
    expiresIn: 15 * 60,
    // Sign the headers (instead of moving them to the query) so an upload with another type is refused.
    signableHeaders: new Set(["content-type", "cache-control"]),
    unhoistableHeaders: new Set(["content-type", "cache-control"]),
  });
  return { url, headers };
}

export async function statObject(storage: StorageConfig, key: string) {
  try {
    const head = await storage.client.send(new HeadObjectCommand({ Bucket: storage.bucket, Key: key }));
    return { size: head.ContentLength ?? 0, contentType: head.ContentType ?? "" };
  } catch (error) {
    if (error instanceof Error && (error.name === "NotFound" || error.name === "NoSuchKey")) return null;
    throw error;
  }
}

/** Reads the first bytes of an object, for file signature checks. */
export async function readObjectStart(storage: StorageConfig, key: string, length = 32): Promise<Uint8Array> {
  const object = await storage.client.send(new GetObjectCommand({ Bucket: storage.bucket, Key: key, Range: `bytes=0-${length - 1}` }));
  return object.Body ? object.Body.transformToByteArray() : new Uint8Array();
}

export async function getObject(storage: StorageConfig, key: string, range?: string) {
  return storage.client.send(new GetObjectCommand({ Bucket: storage.bucket, Key: key, Range: range }));
}

export async function deleteObject(storage: StorageConfig, key: string) {
  await storage.client.send(new DeleteObjectCommand({ Bucket: storage.bucket, Key: key }));
}
