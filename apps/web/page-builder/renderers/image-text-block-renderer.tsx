import { imageTextBlockSchemaV1, imageResolvedImageSchemaV1 } from "@fumep/validation";
import { BlockBackground } from "./block-background";
import { ImageBlockRenderer } from "./image-block-renderer";
import { TextBlockRenderer } from "./text-block-renderer";
export interface ImageTextBlockRendererProps {
  block: unknown;
  image?: unknown;
  backgroundImage?: unknown;
  theme?: unknown;
}
export function ImageTextBlockRenderer({
  block,
  image,
  backgroundImage,
  theme,
}: ImageTextBlockRendererProps) {
  const parsed = imageTextBlockSchemaV1.safeParse(block),
    resolved = imageResolvedImageSchemaV1.safeParse(image);
  if (
    !parsed.success ||
    !parsed.data.isVisible ||
    !resolved.success ||
    resolved.data.id !== parsed.data.data.imageId
  )
    return null;
  const { data } = parsed.data;
  if (data.imageAlt !== "" && !data.imageAlt?.trim() && !resolved.data.altText?.trim()) return null;
  // Derived render-only envelopes, not owner blocks or new persistence entities.
  const envelope = {
    ...parsed.data,
    background: "DEFAULT",
    backgroundMediaId: null,
    anchor: undefined,
  };
  return (
    <BlockBackground block={parsed.data} backgroundImage={backgroundImage} theme={theme}>
      <div
        className="image-text-block"
        data-position={data.imagePosition}
        id={parsed.data.anchor ?? undefined}
      >
        <div className="image-text-image">
          <ImageBlockRenderer
            image={resolved.data}
            block={{
              ...envelope,
              type: "IMAGE",
              data: { imageId: data.imageId, alt: data.imageAlt, decorative: data.imageAlt === "" },
            }}
          />
        </div>
        <div className="image-text-content">
          <TextBlockRenderer
            block={{ ...envelope, type: "TEXT", data: { title: data.title, content: data.text } }}
          />
          {data.button && (
            <a className="hero-block-cta" href={data.button.url}>
              {data.button.label}
            </a>
          )}
        </div>
      </div>
    </BlockBackground>
  );
}
