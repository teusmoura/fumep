import { BadRequestException, PayloadTooLargeException } from "@nestjs/common";
import { IMAGE_MAX_BYTES } from "@fumep/validation";
import { describe, expect, it } from "vitest";
import { validateImage } from "./image-validation.js";

// Signature fixtures deliberately avoid decoding; decoding belongs to the Sharp Worker.
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const jpeg = Buffer.from([255, 216, 255, 224]);
const webp = Buffer.from("RIFF0000WEBP", "ascii");
const avif = Buffer.alloc(24);
avif.writeUInt32BE(24, 0);
avif.write("ftyp", 4);
avif.write("mif1", 8);
avif.write("avif", 16);
avif.write("miaf", 20);
const formats = [
  { name: "photo.jpg", mime: "image/jpeg", bytes: jpeg, extension: ".jpg" },
  { name: "photo.JPEG", mime: "image/jpeg", bytes: jpeg, extension: ".jpg" },
  { name: "photo.PNG", mime: "image/png", bytes: png, extension: ".png" },
  { name: "photo.webp", mime: "image/webp", bytes: webp, extension: ".webp" },
  { name: "photo.avif", mime: "image/avif", bytes: avif, extension: ".avif" },
];
function file(originalname: string, mimetype: string, buffer: Buffer, size = buffer.length) {
  return { originalname, mimetype, buffer, size } as Express.Multer.File;
}
describe("editorial image extension/MIME/signature validation", () => {
  it.each(formats)("accepts matching signature for $name", ({ name, mime, bytes, extension }) => {
    expect(validateImage(file(name, mime, bytes))).toBe(extension);
  });
  it.each(formats)(
    "independently rejects MIME, extension and signature mismatch for $name",
    ({ name, mime, bytes }) => {
      expect(() => validateImage(file(name, "application/octet-stream", bytes))).toThrow(
        BadRequestException,
      );
      expect(() => validateImage(file(`${name}.exe`, mime, bytes))).toThrow(BadRequestException);
      expect(() => validateImage(file(name, mime, Buffer.from("not an image")))).toThrow(
        BadRequestException,
      );
      expect(() => validateImage(file(name, mime, bytes.subarray(0, 2)))).toThrow(
        BadRequestException,
      );
    },
  );
  it.each(["svg", "gif", "bmp", "pdf", "exe"])(
    "rejects forbidden extension %s even with PNG signature/MIME",
    (extension) => {
      expect(() => validateImage(file(`renamed.${extension}`, "image/png", png))).toThrow(
        BadRequestException,
      );
    },
  );
  it("rejects absent/empty files and invalid metadata names", () => {
    expect(() => validateImage()).toThrow(BadRequestException);
    expect(() => validateImage(file("empty.png", "image/png", Buffer.alloc(0)))).toThrow(
      BadRequestException,
    );
    for (const name of [
      "",
      `${"a".repeat(252)}.png`,
      "control\u0000.png",
      "control\n.png",
      "control\u007f.png",
    ]) {
      expect(() => validateImage(file(name, "image/png", png))).toThrow(BadRequestException);
    }
  });
  it("accepts exactly 15 MiB but rejects excess buffer or reported size", () => {
    const maximum = Buffer.alloc(IMAGE_MAX_BYTES);
    png.copy(maximum);
    expect(validateImage(file("maximum.png", "image/png", maximum))).toBe(".png");
    expect(() =>
      validateImage(file("reported.png", "image/png", png, IMAGE_MAX_BYTES + 1)),
    ).toThrow(PayloadTooLargeException);
    const oversized = Buffer.alloc(IMAGE_MAX_BYTES + 1);
    png.copy(oversized);
    expect(() => validateImage(file("actual.png", "image/png", oversized, png.length))).toThrow(
      PayloadTooLargeException,
    );
  });
  it("checks full PNG prefix and both WebP container markers", () => {
    const fakePng = Buffer.from(png);
    fakePng[7] = 0;
    expect(() => validateImage(file("fake.png", "image/png", fakePng))).toThrow(
      BadRequestException,
    );
    for (const header of ["RIFF0000FAKE", "FAKE0000WEBP"])
      expect(() => validateImage(file("fake.webp", "image/webp", Buffer.from(header)))).toThrow(
        BadRequestException,
      );
  });
  it("accepts AVIF major/compatible brands but not other BMFF formats or malformed boxes", () => {
    const major = Buffer.alloc(16);
    major.writeUInt32BE(16, 0);
    major.write("ftyp", 4);
    major.write("avif", 8);
    expect(validateImage(file("major.avif", "image/avif", major))).toBe(".avif");
    for (const length of [0, 1, 12, 17, 1028]) {
      const malformed = Buffer.from(avif);
      malformed.writeUInt32BE(length, 0);
      expect(() => validateImage(file("invalid.avif", "image/avif", malformed))).toThrow(
        BadRequestException,
      );
    }
    const heic = Buffer.from(avif);
    heic.write("heic", 8);
    heic.write("heic", 16);
    expect(() => validateImage(file("heic.avif", "image/avif", heic))).toThrow(BadRequestException);
    expect(() => validateImage(file("truncated.avif", "image/avif", avif.subarray(0, 20)))).toThrow(
      BadRequestException,
    );
  });
});
