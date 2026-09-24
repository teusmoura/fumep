import { faqBlockSchemaV1 } from "@fumep/validation";
import { BlockBackground } from "./block-background";

export interface FaqBlockRendererProps {
  block: unknown;
  backgroundImage?: unknown;
  theme?: unknown;
}

export function FaqBlockRenderer({ block, backgroundImage, theme }: FaqBlockRendererProps) {
  const parsed = faqBlockSchemaV1.safeParse(block);
  if (!parsed.success || !parsed.data.isVisible) return null;
  const titleId = `${parsed.data.id}-faq-title`;
  return (
    <BlockBackground block={parsed.data} backgroundImage={backgroundImage} theme={theme}>
      <section
        className="faq-block"
        id={parsed.data.anchor ?? undefined}
        aria-labelledby={parsed.data.data.title ? titleId : undefined}
        aria-label={parsed.data.data.title ? undefined : "Perguntas frequentes"}
      >
        {parsed.data.data.title && <h2 id={titleId}>{parsed.data.data.title}</h2>}
        <div className="faq-block-items">
          {parsed.data.data.items.map((item, index) => (
            <details key={index}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </BlockBackground>
  );
}
