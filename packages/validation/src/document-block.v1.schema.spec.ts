import { expect, it } from "vitest";
import {
  documentBlockDataSchemaV1,
  documentBlockSchemaV1,
  documentResolvedMediaSchemaV1,
} from "./index.js";

const id = "11111111-1111-4111-8111-111111111111";
const block = {
  id,
  type: "DOCUMENT",
  schemaVersion: 1,
  position: 0,
  isVisible: true,
  background: "DEFAULT",
  data: {
    mediaId: id,
    title: "Edital",
    description: "Leia antes de enviar",
    buttonLabel: "Visualizar",
  },
};
const media = {
  id,
  type: "DOCUMENT",
  processingStatus: "READY",
  deletionStatus: "NONE",
  mimeType: "application/pdf",
  originalFilename: "edital.pdf",
  href: "/media/documents/edital.pdf",
};

it("accepts one PDF reference with controlled optional text and valid projection", () => {
  expect(documentBlockSchemaV1.safeParse(block).success).toBe(true);
  expect(documentBlockDataSchemaV1.safeParse({ mediaId: id }).success).toBe(true);
  expect(documentResolvedMediaSchemaV1.safeParse(media).success).toBe(true);
});
it("rejects arbitrary HTML/URL keys, blank text, wrong media status or external URL", () => {
  for (const value of [
    { ...block.data, html: "<iframe/>" },
    { ...block.data, title: " " },
    { ...block.data, mediaId: "bad" },
  ])
    expect(documentBlockDataSchemaV1.safeParse(value).success).toBe(false);
  expect(documentBlockSchemaV1.safeParse({ ...block, schemaVersion: 2 }).success).toBe(false);
  for (const value of [
    { ...media, mimeType: "text/html" },
    { ...media, deletionStatus: "REQUESTED" },
    { ...media, href: "https://minio.internal/doc.pdf" },
  ])
    expect(documentResolvedMediaSchemaV1.safeParse(value).success).toBe(false);
});
