import { mediaLibraryResponseSchema } from "@fumep/validation";

// Selection is advisory; the owner backend must recheck availability and MediaUsage.
export function availableLibraryDocuments(documents: readonly unknown[]) {
  return documents
    .flatMap((value) => {
      const parsed = mediaLibraryResponseSchema.shape.items.element.safeParse(value);
      return parsed.success &&
        parsed.data.type === "DOCUMENT" &&
        parsed.data.mimeType === "application/pdf" &&
        parsed.data.processingStatus === "READY"
        ? [parsed.data]
        : [];
    })
    .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index);
}
