import { extname } from "node:path";
import type {} from "multer";
import { BadRequestException, PayloadTooLargeException } from "@nestjs/common";
import { IMAGE_MAX_BYTES } from "@fumep/validation";

export function validateImage(file?: Express.Multer.File): string {
  if (!file || !file.buffer.length) throw new BadRequestException("Imagem obrigatória");
  if (file.size > IMAGE_MAX_BYTES || file.buffer.length > IMAGE_MAX_BYTES)
    throw new PayloadTooLargeException("Imagem excede 15 MB");
  if (
    !file.originalname ||
    file.originalname.length > 255 ||
    /[\x00-\x1f\x7f]/.test(file.originalname)
  )
    throw new BadRequestException("Nome inválido");
  const extension = extname(file.originalname).toLowerCase();
  const data = file.buffer;
  const png =
    data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = data.length >= 3 && data[0] === 255 && data[1] === 216 && data[2] === 255;
  const webp =
    data.length >= 12 &&
    data.toString("ascii", 0, 4) === "RIFF" &&
    data.toString("ascii", 8, 12) === "WEBP";
  let avif = false;
  if (data.length >= 16 && data.toString("ascii", 4, 8) === "ftyp") {
    const length = data.readUInt32BE(0);
    if (length >= 16 && length <= data.length && length <= 1024 && length % 4 === 0) {
      const brands = [data.toString("ascii", 8, 12)];
      for (let offset = 16; offset < length; offset += 4)
        brands.push(data.toString("ascii", offset, offset + 4));
      avif = brands.includes("avif") || brands.includes("avis");
    }
  }
  if ([".jpg", ".jpeg"].includes(extension) && file.mimetype === "image/jpeg" && jpeg)
    return ".jpg";
  if (extension === ".png" && file.mimetype === "image/png" && png) return ".png";
  if (extension === ".webp" && file.mimetype === "image/webp" && webp) return ".webp";
  if (extension === ".avif" && file.mimetype === "image/avif" && avif) return ".avif";
  throw new BadRequestException("Extensão, MIME e assinatura da imagem devem corresponder");
}
