import {
  createBlockRegistry,
  textBlockSchemaV1,
  heroBlockSchemaV1,
  imageBlockSchemaV1,
  imageTextBlockSchemaV1,
  cardsBlockSchemaV1,
  quickLinksBlockSchemaV1,
  ctaBlockSchemaV1,
  spacerBlockSchemaV1,
  faqBlockSchemaV1,
} from "@fumep/validation";
import { FaqBlockEditor } from "./editors/faq-block-editor";
import { FaqBlockRenderer } from "./renderers/faq-block-renderer";
import { SpacerBlockEditor } from "./editors/spacer-block-editor";
import { SpacerBlockRenderer } from "./renderers/spacer-block-renderer";
import { CtaBlockEditor } from "./editors/cta-block-editor";
import { CtaBlockRenderer } from "./renderers/cta-block-renderer";
import { CardsBlockEditor } from "./editors/cards-block-editor";
import { CardsBlockRenderer } from "./renderers/cards-block-renderer";
import { QuickLinksBlockEditor } from "./editors/quick-links-block-editor";
import { QuickLinksBlockRenderer } from "./renderers/quick-links-block-renderer";
import { ImageBlockEditor } from "./editors/image-block-editor";
import { ImageTextBlockEditor } from "./editors/image-text-block-editor";
import { ImageTextBlockRenderer } from "./renderers/image-text-block-renderer";
import { ImageBlockRenderer } from "./renderers/image-block-renderer";
import { HeroBlockEditor } from "./editors/hero-block-editor";
import { HeroBlockRenderer } from "./renderers/hero-block-renderer";
import { TextBlockEditor } from "./editors/text-block-editor";
import { TextBlockRenderer } from "./renderers/text-block-renderer";

// UI composition lives here, never in the shared API validation module.
// Only complete definitions belong in the operational frontend catalog.
export const frontendBlockRegistry = createBlockRegistry<
  | typeof TextBlockRenderer
  | typeof HeroBlockRenderer
  | typeof ImageBlockRenderer
  | typeof ImageTextBlockRenderer
  | typeof CardsBlockRenderer
  | typeof QuickLinksBlockRenderer
  | typeof CtaBlockRenderer
  | typeof SpacerBlockRenderer
  | typeof FaqBlockRenderer,
  | typeof TextBlockEditor
  | typeof HeroBlockEditor
  | typeof ImageBlockEditor
  | typeof ImageTextBlockEditor
  | typeof CardsBlockEditor
  | typeof QuickLinksBlockEditor
  | typeof CtaBlockEditor
  | typeof SpacerBlockEditor
  | typeof FaqBlockEditor
>([
  {
    type: "TEXT",
    schemaVersion: 1,
    zodSchema: textBlockSchemaV1,
    renderer: TextBlockRenderer,
    editor: TextBlockEditor,
    label: "Texto",
    allowedContexts: ["PAGE", "ARTICLE"],
  },
  {
    type: "HERO",
    schemaVersion: 1,
    zodSchema: heroBlockSchemaV1,
    renderer: HeroBlockRenderer,
    editor: HeroBlockEditor,
    label: "Destaque principal",
    allowedContexts: ["PAGE"],
  },
  {
    type: "IMAGE",
    schemaVersion: 1,
    zodSchema: imageBlockSchemaV1,
    renderer: ImageBlockRenderer,
    editor: ImageBlockEditor,
    label: "Imagem",
    allowedContexts: ["PAGE", "ARTICLE"],
  },
  {
    type: "IMAGE_TEXT",
    schemaVersion: 1,
    zodSchema: imageTextBlockSchemaV1,
    renderer: ImageTextBlockRenderer,
    editor: ImageTextBlockEditor,
    label: "Imagem e texto",
    allowedContexts: ["PAGE", "ARTICLE"],
  },
  {
    type: "CARDS",
    schemaVersion: 1,
    zodSchema: cardsBlockSchemaV1,
    renderer: CardsBlockRenderer,
    editor: CardsBlockEditor,
    label: "Cards com imagem",
    allowedContexts: ["PAGE"],
  },
  {
    type: "QUICK_LINKS",
    schemaVersion: 1,
    zodSchema: quickLinksBlockSchemaV1,
    renderer: QuickLinksBlockRenderer,
    editor: QuickLinksBlockEditor,
    label: "Links rápidos",
    allowedContexts: ["PAGE"],
  },
  {
    type: "CTA",
    schemaVersion: 1,
    zodSchema: ctaBlockSchemaV1,
    renderer: CtaBlockRenderer,
    editor: CtaBlockEditor,
    label: "Chamada para ação",
    allowedContexts: ["PAGE", "ARTICLE"],
  },
  {
    type: "SPACER",
    schemaVersion: 1,
    zodSchema: spacerBlockSchemaV1,
    renderer: SpacerBlockRenderer,
    editor: SpacerBlockEditor,
    label: "Espaçamento",
    allowedContexts: ["PAGE"],
  },
  {
    type: "FAQ",
    schemaVersion: 1,
    zodSchema: faqBlockSchemaV1,
    renderer: FaqBlockRenderer,
    editor: FaqBlockEditor,
    label: "Perguntas frequentes",
    allowedContexts: ["PAGE"],
  },
]);
