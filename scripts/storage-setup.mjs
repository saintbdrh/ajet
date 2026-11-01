// Prepares the media bucket: creates it if missing, allows browser uploads from the site origin (CORS),
// and, where supported, allows public read. Works against local RustFS/MinIO and Cloudflare R2.
// Usage: node --env-file-if-exists=.env.local scripts/storage-setup.mjs
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
  PutBucketPolicyCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const required = ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"];
for (const name of required) if (!process.env[name]) throw new Error(`${name} is not set.`);

const bucket = process.env.S3_BUCKET;
const origins = (process.env.S3_CORS_ORIGINS ?? process.env.PUBLIC_SITE_URL ?? "http://localhost:3000")
  .split(",").map((origin) => origin.trim()).filter(Boolean);
const client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? "auto",
  forcePathStyle: true,
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

try {
  await client.send(new HeadBucketCommand({ Bucket: bucket }));
  console.log(`bucket ${bucket} exists`);
} catch {
  await client.send(new CreateBucketCommand({ Bucket: bucket }));
  console.log(`created bucket ${bucket}`);
}

await client.send(new PutBucketCorsCommand({
  Bucket: bucket,
  CORSConfiguration: {
    CORSRules: [{
      AllowedOrigins: origins,
      AllowedMethods: ["PUT", "GET", "HEAD"],
      AllowedHeaders: ["content-type", "cache-control"],
      ExposeHeaders: ["etag"],
      MaxAgeSeconds: 3600,
    }],
  },
}));
console.log(`CORS allows uploads from ${origins.join(", ")}`);

try {
  await client.send(new PutBucketPolicyCommand({
    Bucket: bucket,
    Policy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [{ Effect: "Allow", Principal: "*", Action: ["s3:GetObject"], Resource: [`arn:aws:s3:::${bucket}/*`] }],
    }),
  }));
  console.log("public read enabled");
} catch (error) {
  // R2 has no bucket policies; enable public access with a custom domain or r2.dev in the Cloudflare dashboard.
  console.log(`public read policy not supported here (${error.name}); enable public access in the provider dashboard.`);
}
