export interface TextBlock {
  id: string;
  type: "TEXT";
  position: number;
  isVisible: boolean;
  schemaVersion: 1;
  background: "DEFAULT";
  backgroundMediaId: null;
  anchor: string | null;
  data: { title: string; body: string };
}

export interface PageDraft {
  id: string;
  institution_id: string;
  title: string;
  slug: string;
  status: string;
  blocks: TextBlock[];
}

export interface InstitutionChoice {
  id: string;
  name: string;
  slug: string;
}

export interface PageTemplateChoice {
  id: string;
  institution_id: string | null;
  name: string;
  is_active: boolean;
  blocks_snapshot: Array<{ type: string }>;
}

export interface PublicPage {
  id: string;
  institution_slug: string;
  title: string;
  slug: string;
  version_number: number;
  blocks: TextBlock[];
}

export function newTextBlock(
  position: number,
  title = "Novo bloco",
  body = "Texto da página",
): TextBlock {
  return {
    id: crypto.randomUUID(),
    type: "TEXT",
    position,
    isVisible: true,
    schemaVersion: 1,
    background: "DEFAULT",
    backgroundMediaId: null,
    anchor: null,
    data: { title, body },
  };
}

export function normalizeTextBlocks(blocks: TextBlock[]): TextBlock[] {
  return blocks.map((block, position) => ({ ...block, position }));
}
