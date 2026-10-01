import type { Component } from "vue";
import { blockSchemas, type BlockType } from "./contracts";
import BlockFields from "./BlockFields.vue";
import TextBlock from "./TextBlock.vue";
import HeroBlock from "./HeroBlock.vue";
import ImageBlock from "./ImageBlock.vue";
import ImageTextBlock from "./ImageTextBlock.vue";
import CardsBlock from "./CardsBlock.vue";
import QuickLinksBlock from "./QuickLinksBlock.vue";
import CtaBlock from "./CtaBlock.vue";
import FaqBlock from "./FaqBlock.vue";
import TabsBlock from "./TabsBlock.vue";
import TableBlock from "./TableBlock.vue";
import TimelineBlock from "./TimelineBlock.vue";
import StatisticsBlock from "./StatisticsBlock.vue";
import CarouselBlock from "./CarouselBlock.vue";

export const blockRegistry: Record<
  BlockType,
  {
    label: string;
    schemaVersion: 1;
    schema: (typeof blockSchemas)[BlockType];
    editor: Component;
    renderer: Component;
    allowedContexts: readonly ["PAGE"];
  }
> = {
  TEXT: {
    label: "Texto",
    schemaVersion: 1,
    schema: blockSchemas.TEXT,
    editor: BlockFields,
    renderer: TextBlock,
    allowedContexts: ["PAGE"],
  },
  HERO: {
    label: "Destaque",
    schemaVersion: 1,
    schema: blockSchemas.HERO,
    editor: BlockFields,
    renderer: HeroBlock,
    allowedContexts: ["PAGE"],
  },
  IMAGE: {
    label: "Imagem",
    schemaVersion: 1,
    schema: blockSchemas.IMAGE,
    editor: BlockFields,
    renderer: ImageBlock,
    allowedContexts: ["PAGE"],
  },
  IMAGE_TEXT: {
    label: "Imagem e texto",
    schemaVersion: 1,
    schema: blockSchemas.IMAGE_TEXT,
    editor: BlockFields,
    renderer: ImageTextBlock,
    allowedContexts: ["PAGE"],
  },
  CARDS: {
    label: "Cards",
    schemaVersion: 1,
    schema: blockSchemas.CARDS,
    editor: BlockFields,
    renderer: CardsBlock,
    allowedContexts: ["PAGE"],
  },
  QUICK_LINKS: {
    label: "Links rápidos",
    schemaVersion: 1,
    schema: blockSchemas.QUICK_LINKS,
    editor: BlockFields,
    renderer: QuickLinksBlock,
    allowedContexts: ["PAGE"],
  },
  CTA: {
    label: "Chamada para ação",
    schemaVersion: 1,
    schema: blockSchemas.CTA,
    editor: BlockFields,
    renderer: CtaBlock,
    allowedContexts: ["PAGE"],
  },
  FAQ: {
    label: "Perguntas frequentes",
    schemaVersion: 1,
    schema: blockSchemas.FAQ,
    editor: BlockFields,
    renderer: FaqBlock,
    allowedContexts: ["PAGE"],
  },
  TABS: {
    label: "Abas",
    schemaVersion: 1,
    schema: blockSchemas.TABS,
    editor: BlockFields,
    renderer: TabsBlock,
    allowedContexts: ["PAGE"],
  },
  TABLE: {
    label: "Tabela",
    schemaVersion: 1,
    schema: blockSchemas.TABLE,
    editor: BlockFields,
    renderer: TableBlock,
    allowedContexts: ["PAGE"],
  },
  TIMELINE: {
    label: "Linha do tempo",
    schemaVersion: 1,
    schema: blockSchemas.TIMELINE,
    editor: BlockFields,
    renderer: TimelineBlock,
    allowedContexts: ["PAGE"],
  },
  STATISTICS: {
    label: "Indicadores",
    schemaVersion: 1,
    schema: blockSchemas.STATISTICS,
    editor: BlockFields,
    renderer: StatisticsBlock,
    allowedContexts: ["PAGE"],
  },
  CAROUSEL: {
    label: "Carrossel",
    schemaVersion: 1,
    schema: blockSchemas.CAROUSEL,
    editor: BlockFields,
    renderer: CarouselBlock,
    allowedContexts: ["PAGE"],
  },
};
