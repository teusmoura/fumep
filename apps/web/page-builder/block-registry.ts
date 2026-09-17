import { createBlockRegistry, textBlockSchemaV1 } from "@fumep/validation";
import { TextBlockEditor } from "./editors/text-block-editor";
import { TextBlockRenderer } from "./renderers/text-block-renderer";

// UI composition lives here, never in the shared API validation module.
// Only complete definitions belong in the operational frontend catalog.
export const frontendBlockRegistry = createBlockRegistry([
  {
    type: "TEXT",
    schemaVersion: 1,
    zodSchema: textBlockSchemaV1,
    renderer: TextBlockRenderer,
    editor: TextBlockEditor,
    label: "Texto",
    allowedContexts: ["PAGE", "ARTICLE"],
  },
]);
