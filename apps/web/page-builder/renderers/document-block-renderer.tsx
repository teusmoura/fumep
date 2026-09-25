import { documentBlockSchemaV1, documentResolvedMediaSchemaV1 } from "@fumep/validation";
import { BlockBackground } from "./block-background";

export interface DocumentBlockRendererProps {
  block: unknown;
  document?: unknown;
  backgroundImage?: unknown;
  theme?: unknown;
}

export function DocumentBlockRenderer({
  block,
  document,
  backgroundImage,
  theme,
}: DocumentBlockRendererProps) {
  const parsed = documentBlockSchemaV1.safeParse(block);
  const resolved = documentResolvedMediaSchemaV1.safeParse(document);
  if (
    !parsed.success ||
    !parsed.data.isVisible ||
    !resolved.success ||
    resolved.data.id !== parsed.data.data.mediaId
  )
    return null;
  const { title, description, buttonLabel } = parsed.data.data;
  return (
    <BlockBackground block={parsed.data} backgroundImage={backgroundImage} theme={theme}>
      <section
        className="document-block"
        id={parsed.data.anchor ?? undefined}
        aria-label={title ?? "Documento PDF"}
      >
        {title && <h2>{title}</h2>}
        {description && <p>{description}</p>}
        <p className="document-block-filename">PDF: {resolved.data.originalFilename}</p>
        <a href={resolved.data.href} type="application/pdf">
          {buttonLabel ?? "Visualizar PDF"}
        </a>
      </section>
    </BlockBackground>
  );
}
