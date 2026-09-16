import { Client } from "minio";

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
      this.connection = new Client({
        endPoint: process.env.MINIO_ENDPOINT!,
        port: Number(process.env.MINIO_PORT),
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
}
