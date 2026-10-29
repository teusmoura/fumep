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

export interface GalleryBlock {
  id: string;
  type: "GALLERY_FEED";
  position: number;
  isVisible: boolean;
  schemaVersion: 1;
  background: "DEFAULT";
  backgroundMediaId: null;
  anchor: string | null;
  data: { galleryId: string; title: string; limit: number };
}

export interface NewsFeedBlock {
  id: string;
  type: "NEWS_FEED";
  position: number;
  isVisible: boolean;
  schemaVersion: 1;
  background: "DEFAULT";
  backgroundMediaId: null;
  anchor: string | null;
  data: {
    title: string;
    institutionIds: string[];
    categoryIds: string[];
    limit: number;
    order: "DEFAULT";
  };
}

export type PageBlock = TextBlock | GalleryBlock | NewsFeedBlock;
export interface PublicGalleryItem {
  media_id: string;
  alt_text: string;
  caption: string | null;
}

export interface PublicNewsCard {
  article_id: string;
  institution_slug: string;
  title: string;
  slug: string;
  summary: string | null;
  cover_image_alt: string;
  published_at: string;
}

export interface PageDraft {
  id: string;
  institution_id: string;
  title: string;
  slug: string;
  status: string;
  blocks: PageBlock[];
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
  blocks: PageBlock[];
  gallery_feeds: Record<string, PublicGalleryItem[]>;
  news_feeds: Record<string, PublicNewsCard[]>;
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

export function newGalleryBlock(position: number, galleryId: string): GalleryBlock {
  return {
    id: crypto.randomUUID(),
    type: "GALLERY_FEED",
    position,
    isVisible: true,
    schemaVersion: 1,
    background: "DEFAULT",
    backgroundMediaId: null,
    anchor: null,
    data: { galleryId, title: "Galeria", limit: 10 },
  };
}

export function newNewsFeedBlock(position: number): NewsFeedBlock {
  return {
    id: crypto.randomUUID(),
    type: "NEWS_FEED",
    position,
    isVisible: true,
    schemaVersion: 1,
    background: "DEFAULT",
    backgroundMediaId: null,
    anchor: null,
    data: { title: "Notícias", institutionIds: [], categoryIds: [], limit: 6, order: "DEFAULT" },
  };
}

export function normalizeTextBlocks(blocks: PageBlock[]): PageBlock[] {
  return blocks.map((block, position) => ({ ...block, position }));
}
