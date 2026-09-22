import { quickLinksBlockSchemaV1 } from "@fumep/validation";
import { BlockBackground } from "./block-background";
import { QuickLinkIcon } from "./quick-link-icon";

export interface QuickLinksBlockRendererProps {
  block: unknown;
  backgroundImage?: unknown;
  theme?: unknown;
}

export function QuickLinksBlockRenderer({
  block,
  backgroundImage,
  theme,
}: QuickLinksBlockRendererProps) {
  const parsed = quickLinksBlockSchemaV1.safeParse(block);
  if (!parsed.success || !parsed.data.isVisible) return null;
  const titleId = `${parsed.data.id}-quick-links-title`;
  return (
    <BlockBackground block={parsed.data} backgroundImage={backgroundImage} theme={theme}>
      <nav
        className="quick-links-block"
        id={parsed.data.anchor ?? undefined}
        aria-label={parsed.data.data.title ? undefined : "Links rápidos"}
        aria-labelledby={parsed.data.data.title ? titleId : undefined}
      >
        {parsed.data.data.title && <h2 id={titleId}>{parsed.data.data.title}</h2>}
        <ul>
          {parsed.data.data.items.map((item, index) => (
            <li key={index}>
              <a href={item.url}>
                {item.icon && <QuickLinkIcon icon={item.icon} />}
                <span>{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </BlockBackground>
  );
}
