import { ctaBlockSchemaV1 } from "@fumep/validation";
import { BlockBackground } from "./block-background";

export interface CtaBlockRendererProps {
  block: unknown;
  backgroundImage?: unknown;
  theme?: unknown;
}

export function CtaBlockRenderer({ block, backgroundImage, theme }: CtaBlockRendererProps) {
  const parsed = ctaBlockSchemaV1.safeParse(block);
  if (!parsed.success || !parsed.data.isVisible) return null;
  const { data } = parsed.data;
  return (
    <BlockBackground block={parsed.data} backgroundImage={backgroundImage} theme={theme}>
      <section className="cta-block" id={parsed.data.anchor ?? undefined}>
        <h2>{data.title}</h2>
        {data.text && <p>{data.text}</p>}
        <a href={data.buttonUrl}>{data.buttonLabel}</a>
      </section>
    </BlockBackground>
  );
}
