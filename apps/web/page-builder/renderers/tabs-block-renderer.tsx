import { tabsBlockSchemaV1 } from "@fumep/validation";
import { BlockBackground } from "./block-background";
import { TabsInteraction } from "./tabs-interaction";

export interface TabsBlockRendererProps {
  block: unknown;
  backgroundImage?: unknown;
  theme?: unknown;
}

export function TabsBlockRenderer({ block, backgroundImage, theme }: TabsBlockRendererProps) {
  const parsed = tabsBlockSchemaV1.safeParse(block);
  if (!parsed.success || !parsed.data.isVisible) return null;
  return (
    <BlockBackground block={parsed.data} backgroundImage={backgroundImage} theme={theme}>
      <section
        className="tabs-block"
        id={parsed.data.anchor ?? undefined}
        aria-label="Abas de conteúdo"
      >
        <TabsInteraction id={parsed.data.id} tabs={parsed.data.data.tabs} />
      </section>
    </BlockBackground>
  );
}
