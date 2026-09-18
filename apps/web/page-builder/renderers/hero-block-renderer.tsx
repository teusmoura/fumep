import Image from "next/image";
import { heroBlockSchemaV1, heroResolvedImageSchemaV1 } from "@fumep/validation";
export interface HeroBlockRendererProps {
  block: unknown;
  image?: unknown;
}
export function HeroBlockRenderer({ block, image }: HeroBlockRendererProps) {
  const parsed = heroBlockSchemaV1.safeParse(block);
  if (!parsed.success || !parsed.data.isVisible) return null;
  const { data } = parsed.data;
  const resolved = heroResolvedImageSchemaV1.safeParse(image);
  if (data.imageId && (!resolved.success || resolved.data.id !== data.imageId)) return null;
  return (
    <div className="hero-block" id={parsed.data.anchor ?? undefined}>
      <div className="hero-block-content">
        <h2>{data.title}</h2>
        {data.description && <p>{data.description}</p>}
        {data.button && (
          <a className="hero-block-cta" href={data.button.url}>
            {data.button.label}
          </a>
        )}
      </div>
      {data.imageId && resolved.success && (
        <Image
          className="hero-block-image"
          src={resolved.data.src}
          width={resolved.data.width}
          height={resolved.data.height}
          alt={data.imageAlt!}
          unoptimized
        />
      )}
    </div>
  );
}
