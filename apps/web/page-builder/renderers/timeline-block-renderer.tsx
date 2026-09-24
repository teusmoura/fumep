import { timelineBlockSchemaV1 } from "@fumep/validation";
import { BlockBackground } from "./block-background";

export interface TimelineBlockRendererProps {
  block: unknown;
  backgroundImage?: unknown;
  theme?: unknown;
}

export function TimelineBlockRenderer({
  block,
  backgroundImage,
  theme,
}: TimelineBlockRendererProps) {
  const parsed = timelineBlockSchemaV1.safeParse(block);
  if (!parsed.success || !parsed.data.isVisible) return null;
  const titleId = `${parsed.data.id}-timeline-title`;
  return (
    <BlockBackground block={parsed.data} backgroundImage={backgroundImage} theme={theme}>
      <section
        className="timeline-block"
        id={parsed.data.anchor ?? undefined}
        aria-labelledby={parsed.data.data.title ? titleId : undefined}
        aria-label={parsed.data.data.title ? undefined : "Linha do tempo"}
      >
        {parsed.data.data.title && <h2 id={titleId}>{parsed.data.data.title}</h2>}
        <ol>
          {parsed.data.data.items.map((item, index) => (
            <li key={index}>
              {item.date && <p className="timeline-block-date">{item.date}</p>}
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </li>
          ))}
        </ol>
      </section>
    </BlockBackground>
  );
}
