import {
  createBlockRegistry,
  textBlockSchemaV1,
  heroBlockSchemaV1,
  imageBlockSchemaV1,
  imageTextBlockSchemaV1,
} from "@fumep/validation";
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
  | typeof ImageTextBlockRenderer,
  | typeof TextBlockEditor
  | typeof HeroBlockEditor
  | typeof ImageBlockEditor
  | typeof ImageTextBlockEditor
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
]);
