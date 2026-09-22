import Image from "next/image";
import { cardsBlockSchemaV1, imageResolvedImageSchemaV1 } from "@fumep/validation";
import { BlockBackground } from "./block-background";

export interface CardsBlockRendererProps {
  block: unknown;
  images?: readonly unknown[];
  backgroundImage?: unknown;
  theme?: unknown;
}

export function CardsBlockRenderer({
  block,
  images = [],
  backgroundImage,
  theme,
}: CardsBlockRendererProps) {
  const parsed = cardsBlockSchemaV1.safeParse(block);
  if (!parsed.success || !parsed.data.isVisible) return null;
  const resolvedById = new Map(
    images.flatMap((value) => {
      const result = imageResolvedImageSchemaV1.safeParse(value);
      return result.success ? [[result.data.id, result.data] as const] : [];
    }),
  );
  const cards = parsed.data.data.items.map((item) => {
    const image = resolvedById.get(item.imageId);
    const alt = image?.altText?.trim();
    return image && alt ? { item, image, alt } : undefined;
  });
  if (cards.some((card) => !card)) return null;

  return (
    <BlockBackground block={parsed.data} backgroundImage={backgroundImage} theme={theme}>
      <ul className="cards-block" id={parsed.data.anchor ?? undefined}>
        {cards.map((card, index) => {
          const { item, image, alt } = card!;
          const content = (
            <>
              <Image
                className="cards-block-image"
                src={image.src}
                width={image.width}
                height={image.height}
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                alt={alt}
                unoptimized
              />
              <div className="cards-block-content">
                <h2 className="cards-block-title">{item.title}</h2>
                {item.description?.trim() && (
                  <p className="cards-block-description">{item.description}</p>
                )}
              </div>
            </>
          );
          return (
            <li key={index}>
              {item.url ? (
                <a className="cards-block-card" href={item.url}>
                  {content}
                </a>
              ) : (
                <article className="cards-block-card">{content}</article>
              )}
            </li>
          );
        })}
      </ul>
    </BlockBackground>
  );
}
