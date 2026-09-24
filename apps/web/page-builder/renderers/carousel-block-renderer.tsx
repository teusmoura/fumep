import {
  carouselBlockSchemaV1,
  imageResolvedImageSchemaV1,
  type CarouselItemV1,
  type ImageResolvedImageV1,
} from "@fumep/validation";
import { BlockBackground } from "./block-background";
import { CarouselInteraction } from "./carousel-interaction";

export interface CarouselBlockRendererProps {
  block: unknown;
  images?: readonly unknown[];
  backgroundImage?: unknown;
  theme?: unknown;
}

export type ResolvedCarouselSlide = { item: CarouselItemV1; image: ImageResolvedImageV1 };

export function CarouselBlockRenderer({
  block,
  images = [],
  backgroundImage,
  theme,
}: CarouselBlockRendererProps) {
  const parsed = carouselBlockSchemaV1.safeParse(block);
  if (!parsed.success || !parsed.data.isVisible) return null;
  const resolvedById = new Map(
    images.flatMap((value) => {
      const result = imageResolvedImageSchemaV1.safeParse(value);
      return result.success ? [[result.data.id, result.data] as const] : [];
    }),
  );
  const slides = parsed.data.data.items.map((item) => {
    const image = resolvedById.get(item.imageId);
    return image && item.alt.trim() ? { item, image } : undefined;
  });
  if (slides.some((slide) => !slide)) return null;
  return (
    <BlockBackground block={parsed.data} backgroundImage={backgroundImage} theme={theme}>
      <CarouselInteraction
        id={parsed.data.id}
        anchor={parsed.data.anchor}
        slides={slides as ResolvedCarouselSlide[]}
      />
    </BlockBackground>
  );
}
