import { spacerBlockSchemaV1 } from "@fumep/validation";
import { BlockBackground } from "./block-background";

export interface SpacerBlockRendererProps {
  block: unknown;
  backgroundImage?: unknown;
  theme?: unknown;
}

export function SpacerBlockRenderer({ block, backgroundImage, theme }: SpacerBlockRendererProps) {
  const parsed = spacerBlockSchemaV1.safeParse(block);
  if (!parsed.success || !parsed.data.isVisible) return null;
  return (
    <BlockBackground block={parsed.data} backgroundImage={backgroundImage} theme={theme}>
      <div
        className="spacer-block"
        data-size={parsed.data.data.size}
        id={parsed.data.anchor ?? undefined}
        aria-hidden="true"
      />
    </BlockBackground>
  );
}
