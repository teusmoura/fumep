import Image from "next/image";
import { BlockBackground } from "./block-background";
import { imageBlockSchemaV1, imageResolvedImageSchemaV1 } from "@fumep/validation";
export interface ImageBlockRendererProps {
  block: unknown;
  image?: unknown;
  backgroundImage?: unknown;
  theme?: unknown;
}
export function ImageBlockRenderer({
  block,
  image,
  backgroundImage,
  theme,
}: ImageBlockRendererProps) {
  const parsed = imageBlockSchemaV1.safeParse(block);
  const resolved = imageResolvedImageSchemaV1.safeParse(image);
  if (
    !parsed.success ||
    !parsed.data.isVisible ||
    !resolved.success ||
    resolved.data.id !== parsed.data.data.imageId
  )
    return null;
  const { data } = parsed.data;
  const alt = data.decorative ? "" : data.alt?.trim() || resolved.data.altText?.trim() || "";
  if (!data.decorative && !alt) return null;
  const picture = (
    <Image
      className="image-block-image"
      src={resolved.data.src}
      width={resolved.data.width}
      height={resolved.data.height}
      alt={alt}
      unoptimized
    />
  );
  return (
    <BlockBackground block={parsed.data} backgroundImage={backgroundImage} theme={theme}>
      <figure className="image-block" id={parsed.data.anchor ?? undefined}>
        {data.link ? (
          <a href={data.link} aria-label={data.decorative ? data.caption?.trim() : undefined}>
            {picture}
          </a>
        ) : (
          picture
        )}
        {data.caption?.trim() && <figcaption>{data.caption}</figcaption>}
      </figure>
    </BlockBackground>
  );
}
