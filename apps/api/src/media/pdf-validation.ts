import { extname } from "node:path";
import type {} from "multer";
import { BadRequestException, PayloadTooLargeException } from "@nestjs/common";
import { PDF_MAX_BYTES } from "@fumep/validation";

export function validatePdf(file?: Express.Multer.File): string {
  if (!file || !file.buffer.length) throw new BadRequestException("PDF obrigatório");
  if (file.size > PDF_MAX_BYTES || file.buffer.length > PDF_MAX_BYTES)
    throw new PayloadTooLargeException("PDF excede 30 MB");
  if (
    !file.originalname ||
    file.originalname.length > 255 ||
    /[\x00-\x1f\x7f]/.test(file.originalname)
  )
    throw new BadRequestException("Nome inválido");
  // Signature validation is not a PDF parser or malware/content-disarm scan.
  if (
    extname(file.originalname).toLowerCase() !== ".pdf" ||
    file.mimetype !== "application/pdf" ||
    !/^%PDF-(?:1\.[0-7]|2\.0)[\r\n]/.test(file.buffer.toString("latin1", 0, 9))
  )
    throw new BadRequestException("Extensão, MIME e assinatura do PDF devem corresponder");
  return ".pdf";
}
