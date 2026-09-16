import { Client } from "minio";

export class StorageLimitError extends Error {}
export class MediaStorage {
  private connection?: Client;
  client() {
    if (!this.connection) {
      for (const name of [
        "MINIO_ENDPOINT",
        "MINIO_PORT",
        "MINIO_USE_SSL",
        "MINIO_ROOT_USER",
        "MINIO_ROOT_PASSWORD",
      ]) {
        if (!process.env[name]) throw new Error(`${name} is required`);
      }
      const port = Number(process.env.MINIO_PORT);
      if (
        !Number.isInteger(port) ||
        port < 1 ||
        port > 65535 ||
        !["true", "false"].includes(process.env.MINIO_USE_SSL!)
      )
        throw new Error("Invalid MinIO configuration");
      this.connection = new Client({
        endPoint: process.env.MINIO_ENDPOINT!,
        port,
        useSSL: process.env.MINIO_USE_SSL === "true",
        accessKey: process.env.MINIO_ROOT_USER!,
        secretKey: process.env.MINIO_ROOT_PASSWORD!,
      });
    }
    return this.connection;
  }
  put(key: string, buffer: Buffer, mime: string) {
    return this.client().putObject("portal-public", key, buffer, buffer.length, {
      "Content-Type": mime,
    });
  }
  remove(key: string) {
    return this.client().removeObject("portal-public", key);
  }
  async read(key: string, maximumBytes: number): Promise<Buffer> {
    if (!Number.isSafeInteger(maximumBytes) || maximumBytes <= 0)
      throw new StorageLimitError("Invalid storage read limit");
    const stream = await this.client().getObject("portal-public", key);
    const chunks: Buffer[] = [];
    let size = 0;
    try {
      for await (const chunk of stream) {
        const bytes = Buffer.from(chunk);
        size += bytes.length;
        if (size > maximumBytes) throw new StorageLimitError("Original exceeds read limit");
        chunks.push(bytes);
      }
      return Buffer.concat(chunks, size);
    } finally {
      stream.destroy();
    }
  }
}
