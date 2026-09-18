import { expect, it } from "vitest";
import { availableLibraryImages } from "./available-library-images";
const image = {
  id: "11111111-1111-4111-8111-111111111111",
  type: "IMAGE",
  originalFilename: "fachada.webp",
  mimeType: "image/webp",
  sizeBytes: 1000,
  categoryId: null,
  categoryName: null,
  processingStatus: "READY",
  altText: "Fachada",
  caption: null,
  width: 1200,
  height: 800,
  createdAt: "2026-09-17T12:00:00.000Z",
};
it("filters malformed/non-ready/document/SVG options and deduplicates fresh library projections", () => {
  const source = [
    image,
    image,
    null,
    {},
    { ...image, processingStatus: "PENDING" },
    { ...image, type: "DOCUMENT" },
    { ...image, mimeType: "image/svg+xml" },
    { ...image, deletionStatus: "REQUESTED" },
  ];
  const options = availableLibraryImages(source);
  expect(options).toEqual([image]);
  expect(options[0]).not.toBe(image);
  expect(source).toHaveLength(8);
});
