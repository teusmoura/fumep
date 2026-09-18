import { mediaLibraryResponseSchema } from "@fumep/validation";
// Fresh available-library projections supplied by the caller, not authorization.
export function availableLibraryImages(images: readonly unknown[]) {
  return images
    .flatMap((value) => {
      const parsed = mediaLibraryResponseSchema.shape.items.element.safeParse(value);
      return parsed.success &&
        parsed.data.type === "IMAGE" &&
        parsed.data.processingStatus === "READY" &&
        ["image/png", "image/jpeg", "image/webp", "image/avif"].includes(parsed.data.mimeType)
        ? [parsed.data]
        : [];
    })
    .filter((image, index, all) => all.findIndex((item) => item.id === image.id) === index);
}
