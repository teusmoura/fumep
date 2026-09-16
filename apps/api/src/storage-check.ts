import { MediaStorage } from "./media/media.storage.js";

const requiredEnvironment = [
  "MINIO_ENDPOINT",
  "MINIO_PORT",
  "MINIO_USE_SSL",
  "MINIO_ROOT_USER",
  "MINIO_ROOT_PASSWORD",
] as const;

for (const name of requiredEnvironment) {
  if (!process.env[name]) {
    throw new Error(`${name} is required`);
  }
}

const client = new MediaStorage().client();

const buckets = await client.listBuckets();
const bucketNames = new Set(buckets.map(({ name }) => name));

for (const expectedBucket of ["portal-public", "portal-private"]) {
  if (!bucketNames.has(expectedBucket)) {
    throw new Error(`Expected MinIO bucket not found: ${expectedBucket}`);
  }
}

console.log("MinIO storage access successful");
