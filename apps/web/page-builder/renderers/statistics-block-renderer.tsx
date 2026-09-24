import { statisticsBlockSchemaV1 } from "@fumep/validation";
import { BlockBackground } from "./block-background";

export interface StatisticsBlockRendererProps {
  block: unknown;
  backgroundImage?: unknown;
  theme?: unknown;
}

export function StatisticsBlockRenderer({
  block,
  backgroundImage,
  theme,
}: StatisticsBlockRendererProps) {
  const parsed = statisticsBlockSchemaV1.safeParse(block);
  if (!parsed.success || !parsed.data.isVisible) return null;
  return (
    <BlockBackground block={parsed.data} backgroundImage={backgroundImage} theme={theme}>
      <section
        className="statistics-block"
        id={parsed.data.anchor ?? undefined}
        aria-label="Indicadores"
      >
        <ul>
          {parsed.data.data.items.map((item, index) => (
            <li key={index}>
              <p className="statistics-block-value">{item.value}</p>
              <p className="statistics-block-label">{item.label}</p>
              {item.description && (
                <p className="statistics-block-description">{item.description}</p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </BlockBackground>
  );
}
