import { expect, it } from "vitest";
import { availableLibraryDocuments } from "./available-library-documents";

export const pdfFixture = {
  id: "11111111-1111-4111-8111-111111111111",
  type: "DOCUMENT",
  originalFilename: "edital.pdf",
  mimeType: "application/pdf",
  sizeBytes: 1000,
  categoryId: null,
  categoryName: null,
  processingStatus: "READY",
  altText: null,
  caption: null,
  width: null,
  height: null,
  createdAt: "2026-09-17T12:00:00.000Z",
};
it("selects only ready valid PDFs and deduplicates projections", () => {
  expect(
    availableLibraryDocuments([
      pdfFixture,
      pdfFixture,
      null,
      { ...pdfFixture, type: "IMAGE" },
      { ...pdfFixture, mimeType: "text/html" },
      { ...pdfFixture, processingStatus: "FAILED" },
      { ...pdfFixture, deletionStatus: "REQUESTED" },
    ]),
  ).toEqual([pdfFixture]);
});
