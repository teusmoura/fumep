import { z } from "zod";

export type BlockContext = "PAGE" | "ARTICLE";
// Renderer/editor bindings stay opaque here: importing validation on the API must
// never load React, Next.js or browser-only editor modules.
export interface BlockDefinition<Renderer = unknown, Editor = unknown> {
  readonly type: string;
  readonly schemaVersion: number;
  readonly zodSchema: z.ZodType;
  readonly renderer: Renderer;
  readonly editor: Editor;
  readonly label: string;
  readonly allowedContexts: readonly BlockContext[];
}
export interface BlockRegistry<Renderer = unknown, Editor = unknown> {
  get(
    type: string,
    schemaVersion: number,
    context?: BlockContext,
  ): BlockDefinition<Renderer, Editor> | undefined;
  list(context?: BlockContext): readonly BlockDefinition<Renderer, Editor>[];
}
// Application-code composition only. There is no runtime/editor registration API.
export function createBlockRegistry<Renderer = unknown, Editor = unknown>(
  definitions: readonly BlockDefinition<Renderer, Editor>[] = [],
): BlockRegistry<Renderer, Editor> {
  const entries = new Map<string, BlockDefinition<Renderer, Editor>>();
  for (const definition of definitions) {
    if (
      !/^[A-Z][A-Z0-9_]{0,49}$/.test(definition.type) ||
      !Number.isSafeInteger(definition.schemaVersion) ||
      definition.schemaVersion < 1 ||
      typeof definition.label !== "string" ||
      !definition.label.trim() ||
      typeof definition.zodSchema?.safeParse !== "function" ||
      definition.renderer == null ||
      definition.editor == null ||
      !Array.isArray(definition.allowedContexts) ||
      !definition.allowedContexts.length ||
      definition.allowedContexts.some((context) => context !== "PAGE" && context !== "ARTICLE") ||
      new Set(definition.allowedContexts).size !== definition.allowedContexts.length
    )
      throw new Error("Invalid block definition");
    const key = `${definition.type}@${definition.schemaVersion}`;
    if (entries.has(key)) throw new Error("Duplicate block type and schema version");
    entries.set(
      key,
      Object.freeze({
        ...definition,
        allowedContexts: Object.freeze([...definition.allowedContexts]),
      }),
    );
  }
  const snapshot = Object.freeze([...entries.values()]);
  return Object.freeze({
    get(type: string, schemaVersion: number, context?: BlockContext) {
      if (!Number.isSafeInteger(schemaVersion) || schemaVersion < 1) return undefined;
      const definition = entries.get(`${type}@${schemaVersion}`);
      return definition && (context === undefined || definition.allowedContexts.includes(context))
        ? definition
        : undefined;
    },
    list(context?: BlockContext) {
      return context !== undefined
        ? Object.freeze(
            snapshot.filter((definition) => definition.allowedContexts.includes(context)),
          )
        : snapshot;
    },
  });
}
// Intentionally empty in loop 5.1: concrete blocks are added only by their loops.
export const blockRegistry = createBlockRegistry();

// Identifiers from the canonical V1 catalog, not registered/implemented blocks.
export const contentBlockTypeSchema = z.enum([
  "TEXT",
  "HERO",
  "IMAGE",
  "IMAGE_TEXT",
  "CAROUSEL",
  "CARDS",
  "QUICK_LINKS",
  "FAQ",
  "TABS",
  "TABLE",
  "TIMELINE",
  "STATISTICS",
  "MAP",
  "VIDEO",
  "DOCUMENT",
  "NEWS_FEED",
  "EVENT_FEED",
  "COURSE_FEED",
  "CONTEST_FEED",
  "SELECTION_PROCESS_FEED",
  "GALLERY_FEED",
  "CTA",
  "SPACER",
]);
export const contentBlockBackgroundSchema = z.enum(["DEFAULT", "LIGHT", "INSTITUTION", "IMAGE"]);
export const contentBlockCommonSchema = z
  .object({
    id: z.uuid(),
    type: contentBlockTypeSchema,
    position: z.number().int().min(0).max(2147483647),
    isVisible: z.boolean(),
    schemaVersion: z.number().int().min(1).max(2147483647),
    background: contentBlockBackgroundSchema,
    backgroundMediaId: z.uuid().nullable().optional(),
    anchor: z
      .string()
      .max(100)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .nullable()
      .optional(),
  })
  .strict()
  .superRefine((block, context) => {
    if (block.background === "IMAGE" && !block.backgroundMediaId)
      context.addIssue({
        code: "custom",
        path: ["backgroundMediaId"],
        message: "Image background requires a library media UUID",
      });
  });
export type ContentBlockType = z.infer<typeof contentBlockTypeSchema>;
export type ContentBlockBackground = z.infer<typeof contentBlockBackgroundSchema>;
export type ContentBlockCommon = z.infer<typeof contentBlockCommonSchema>;

export const TEXT_V1_LIMITS = Object.freeze({
  titleCharacters: 200,
  runCharacters: 5000,
  documentCharacters: 100000,
  nodes: 200,
  inlineNodes: 100,
  listItems: 100,
  tableColumns: 12,
  tableRows: 100,
});
const textPlainSchemaV1 = z
  .string()
  .max(TEXT_V1_LIMITS.runCharacters)
  .refine(
    (value) => !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value),
    "Unsupported control characters",
  );
export const textLinkUrlSchemaV1 = z
  .string()
  .min(1)
  .max(2048)
  .refine((value) => {
    if (/[\x00-\x20\x7f\\]/.test(value)) return false;
    if (value.startsWith("#")) return /^#[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
    try {
      const url = new URL(value, "https://portal.invalid");
      if (value.startsWith("/"))
        return !value.startsWith("//") && url.origin === "https://portal.invalid";
      return (
        /^https?:\/\//i.test(value) &&
        ["http:", "https:"].includes(url.protocol) &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  }, "Use HTTP(S), a same-origin root-relative path or a valid anchor");
const textRunSchemaV1 = z
  .object({
    type: z.literal("text"),
    text: textPlainSchemaV1,
    marks: z
      .array(z.enum(["bold", "italic"]))
      .max(2)
      .refine((marks) => new Set(marks).size === marks.length, "Duplicate text mark")
      .optional(),
  })
  .strict();
export const textInlineNodeSchemaV1 = z.discriminatedUnion("type", [
  textRunSchemaV1,
  z
    .object({
      type: z.literal("link"),
      url: textLinkUrlSchemaV1,
      children: z.array(textRunSchemaV1).min(1).max(TEXT_V1_LIMITS.inlineNodes),
    })
    .strict(),
]);
const textInlinesSchemaV1 = z.array(textInlineNodeSchemaV1).max(TEXT_V1_LIMITS.inlineNodes);
const textListItemSchemaV1 = z.object({ children: textInlinesSchemaV1 }).strict();
const textTableSchemaV1 = z
  .object({
    type: z.literal("table"),
    caption: textPlainSchemaV1.max(300).optional(),
    headers: z
      .array(
        textPlainSchemaV1
          .max(200)
          .refine((value) => value.trim().length > 0, "Header label required"),
      )
      .min(1)
      .max(TEXT_V1_LIMITS.tableColumns),
    rows: z
      .array(z.array(textPlainSchemaV1).min(1).max(TEXT_V1_LIMITS.tableColumns))
      .max(TEXT_V1_LIMITS.tableRows),
  })
  .strict()
  .superRefine((table, context) => {
    table.rows.forEach((row, index) => {
      if (row.length !== table.headers.length)
        context.addIssue({
          code: "custom",
          path: ["rows", index],
          message: "Table row must match header column count",
        });
    });
  });
export const textContentNodeSchemaV1 = z.discriminatedUnion("type", [
  z.object({ type: z.literal("paragraph"), children: textInlinesSchemaV1 }).strict(),
  z
    .object({
      type: z.literal("heading"),
      level: z.union([z.literal(2), z.literal(3), z.literal(4)]),
      children: textInlinesSchemaV1,
    })
    .strict(),
  z.object({ type: z.literal("highlight"), children: textInlinesSchemaV1 }).strict(),
  z
    .object({
      type: z.literal("orderedList"),
      items: z.array(textListItemSchemaV1).min(1).max(TEXT_V1_LIMITS.listItems),
    })
    .strict(),
  z
    .object({
      type: z.literal("bulletList"),
      items: z.array(textListItemSchemaV1).min(1).max(TEXT_V1_LIMITS.listItems),
    })
    .strict(),
  textTableSchemaV1,
]);
export type TextInlineNodeV1 = z.infer<typeof textInlineNodeSchemaV1>;
export type TextContentNodeV1 = z.infer<typeof textContentNodeSchemaV1>;
function textInlineCharactersV1(nodes: TextInlineNodeV1[]) {
  return nodes.reduce(
    (total, node) =>
      total +
      (node.type === "text"
        ? node.text.length
        : node.url.length + node.children.reduce((sum, child) => sum + child.text.length, 0)),
    0,
  );
}
export const textDocumentSchemaV1 = z
  .object({
    type: z.literal("doc"),
    nodes: z.array(textContentNodeSchemaV1).max(TEXT_V1_LIMITS.nodes),
  })
  .strict()
  .superRefine((document, context) => {
    const characters = document.nodes.reduce((total, node) => {
      if (node.type === "table")
        return (
          total +
          (node.caption?.length ?? 0) +
          node.headers.reduce((sum, cell) => sum + cell.length, 0) +
          node.rows.reduce(
            (sum, row) => sum + row.reduce((length, cell) => length + cell.length, 0),
            0,
          )
        );
      if (node.type === "orderedList" || node.type === "bulletList")
        return (
          total + node.items.reduce((sum, item) => sum + textInlineCharactersV1(item.children), 0)
        );
      return total + textInlineCharactersV1(node.children);
    }, 0);
    if (characters > TEXT_V1_LIMITS.documentCharacters)
      context.addIssue({
        code: "custom",
        path: ["nodes"],
        message: "Text document exceeds the character limit",
      });
  });
export const textBlockDataSchemaV1 = z
  .object({
    title: textPlainSchemaV1.max(TEXT_V1_LIMITS.titleCharacters).optional(),
    content: textDocumentSchemaV1,
  })
  .strict();
export const textBlockSchemaV1 = contentBlockCommonSchema.safeExtend({
  type: z.literal("TEXT"),
  schemaVersion: z.literal(1),
  data: textBlockDataSchemaV1,
});
export type TextDocumentV1 = z.infer<typeof textDocumentSchemaV1>;
export type TextBlockDataV1 = z.infer<typeof textBlockDataSchemaV1>;
export type TextBlockV1 = z.infer<typeof textBlockSchemaV1>;

export const HERO_V1_LIMITS = Object.freeze({
  titleCharacters: 200,
  descriptionCharacters: 2000,
  altCharacters: 300,
  buttonLabelCharacters: 120,
});
const heroLabelSchemaV1 = textPlainSchemaV1.refine(
  (value) => value.trim().length > 0,
  "Non-blank label required",
);
export const heroBlockDataSchemaV1 = z
  .object({
    title: heroLabelSchemaV1.max(HERO_V1_LIMITS.titleCharacters),
    description: textPlainSchemaV1.max(HERO_V1_LIMITS.descriptionCharacters).optional(),
    imageId: z.uuid().optional(),
    imageAlt: textPlainSchemaV1
      .max(HERO_V1_LIMITS.altCharacters)
      .refine(
        (value) => value === "" || value.trim().length > 0,
        "Use an informative alt or exactly empty decorative alt",
      )
      .optional(),
    button: z
      .object({
        label: heroLabelSchemaV1.max(HERO_V1_LIMITS.buttonLabelCharacters),
        url: textLinkUrlSchemaV1,
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((data, context) => {
    if (data.imageId && data.imageAlt === undefined)
      context.addIssue({
        code: "custom",
        path: ["imageAlt"],
        message: "Image requires explicit informative or decorative alt",
      });
    if (!data.imageId && data.imageAlt !== undefined)
      context.addIssue({
        code: "custom",
        path: ["imageId"],
        message: "Alt requires a library image reference",
      });
  });
export const heroBlockSchemaV1 = contentBlockCommonSchema.safeExtend({
  type: z.literal("HERO"),
  schemaVersion: z.literal(1),
  data: heroBlockDataSchemaV1,
});
export type HeroBlockDataV1 = z.infer<typeof heroBlockDataSchemaV1>;
export type HeroBlockV1 = z.infer<typeof heroBlockSchemaV1>;
export const imageTextBlockDataSchemaV1 = z
  .object({
    title: textBlockDataSchemaV1.shape.title,
    text: textDocumentSchemaV1,
    imageId: z.uuid(),
    imageAlt: heroBlockDataSchemaV1.shape.imageAlt,
    imagePosition: z.enum(["IMAGE_LEFT", "IMAGE_RIGHT"]),
    button: heroBlockDataSchemaV1.shape.button,
  })
  .strict();
export const imageTextBlockSchemaV1 = contentBlockCommonSchema.safeExtend({
  type: z.literal("IMAGE_TEXT"),
  schemaVersion: z.literal(1),
  data: imageTextBlockDataSchemaV1,
});
export type ImageTextBlockDataV1 = z.infer<typeof imageTextBlockDataSchemaV1>;
export type ImageTextBlockV1 = z.infer<typeof imageTextBlockSchemaV1>;

export const CARDS_V1_LIMITS = Object.freeze({
  items: 12,
  titleCharacters: HERO_V1_LIMITS.titleCharacters,
  descriptionCharacters: HERO_V1_LIMITS.descriptionCharacters,
});
export const cardsBlockItemSchemaV1 = z
  .object({
    imageId: z.uuid(),
    title: heroBlockDataSchemaV1.shape.title,
    description: heroBlockDataSchemaV1.shape.description,
    url: textLinkUrlSchemaV1.optional(),
  })
  .strict();
export const cardsBlockDataSchemaV1 = z
  .object({ items: z.array(cardsBlockItemSchemaV1).min(1).max(CARDS_V1_LIMITS.items) })
  .strict();
export const cardsBlockSchemaV1 = contentBlockCommonSchema.safeExtend({
  type: z.literal("CARDS"),
  schemaVersion: z.literal(1),
  data: cardsBlockDataSchemaV1,
});
export type CardsBlockItemV1 = z.infer<typeof cardsBlockItemSchemaV1>;
export type CardsBlockDataV1 = z.infer<typeof cardsBlockDataSchemaV1>;
export type CardsBlockV1 = z.infer<typeof cardsBlockSchemaV1>;

export const QUICK_LINK_ICON_VALUES = [
  "ARROW_RIGHT",
  "EXTERNAL_LINK",
  "DOWNLOAD",
  "DOCUMENT",
  "CALENDAR",
  "LOCATION",
] as const;
export const QUICK_LINKS_V1_LIMITS = Object.freeze({
  titleCharacters: HERO_V1_LIMITS.titleCharacters,
  labelCharacters: HERO_V1_LIMITS.buttonLabelCharacters,
});
export const quickLinkIconSchemaV1 = z.enum(QUICK_LINK_ICON_VALUES);
export const quickLinkItemSchemaV1 = z
  .object({
    label: heroLabelSchemaV1.max(QUICK_LINKS_V1_LIMITS.labelCharacters),
    url: textLinkUrlSchemaV1,
    icon: quickLinkIconSchemaV1.optional(),
  })
  .strict();
export const quickLinksBlockDataSchemaV1 = z
  .object({
    title: heroBlockDataSchemaV1.shape.title.optional(),
    items: z.array(quickLinkItemSchemaV1).min(1),
  })
  .strict();
export const quickLinksBlockSchemaV1 = contentBlockCommonSchema.safeExtend({
  type: z.literal("QUICK_LINKS"),
  schemaVersion: z.literal(1),
  data: quickLinksBlockDataSchemaV1,
});
export type QuickLinkIconV1 = z.infer<typeof quickLinkIconSchemaV1>;
export type QuickLinkItemV1 = z.infer<typeof quickLinkItemSchemaV1>;
export type QuickLinksBlockDataV1 = z.infer<typeof quickLinksBlockDataSchemaV1>;
export type QuickLinksBlockV1 = z.infer<typeof quickLinksBlockSchemaV1>;

export const CTA_V1_LIMITS = Object.freeze({
  titleCharacters: HERO_V1_LIMITS.titleCharacters,
  textCharacters: HERO_V1_LIMITS.descriptionCharacters,
  buttonLabelCharacters: HERO_V1_LIMITS.buttonLabelCharacters,
});
export const ctaBlockDataSchemaV1 = z
  .object({
    title: heroBlockDataSchemaV1.shape.title,
    text: textPlainSchemaV1.max(CTA_V1_LIMITS.textCharacters).optional(),
    buttonLabel: heroLabelSchemaV1.max(CTA_V1_LIMITS.buttonLabelCharacters),
    buttonUrl: textLinkUrlSchemaV1,
  })
  .strict();
export const ctaBlockSchemaV1 = contentBlockCommonSchema.safeExtend({
  type: z.literal("CTA"),
  schemaVersion: z.literal(1),
  data: ctaBlockDataSchemaV1,
});
export type CtaBlockDataV1 = z.infer<typeof ctaBlockDataSchemaV1>;
export type CtaBlockV1 = z.infer<typeof ctaBlockSchemaV1>;

export const SPACER_SIZE_VALUES = ["SMALL", "MEDIUM", "LARGE"] as const;
export const spacerBlockDataSchemaV1 = z.object({ size: z.enum(SPACER_SIZE_VALUES) }).strict();
export const spacerBlockSchemaV1 = contentBlockCommonSchema.safeExtend({
  type: z.literal("SPACER"),
  schemaVersion: z.literal(1),
  data: spacerBlockDataSchemaV1,
});
export type SpacerBlockDataV1 = z.infer<typeof spacerBlockDataSchemaV1>;
export type SpacerBlockV1 = z.infer<typeof spacerBlockSchemaV1>;

export const FAQ_V1_LIMITS = Object.freeze({
  items: 30,
  titleCharacters: HERO_V1_LIMITS.titleCharacters,
  questionCharacters: HERO_V1_LIMITS.titleCharacters,
  answerCharacters: HERO_V1_LIMITS.descriptionCharacters,
});
export const faqItemSchemaV1 = z
  .object({
    question: heroLabelSchemaV1.max(FAQ_V1_LIMITS.questionCharacters),
    answer: heroLabelSchemaV1.max(FAQ_V1_LIMITS.answerCharacters),
  })
  .strict();
export const faqBlockDataSchemaV1 = z
  .object({
    title: heroBlockDataSchemaV1.shape.title.optional(),
    items: z.array(faqItemSchemaV1).min(1).max(FAQ_V1_LIMITS.items),
  })
  .strict();
export const faqBlockSchemaV1 = contentBlockCommonSchema.safeExtend({
  type: z.literal("FAQ"),
  schemaVersion: z.literal(1),
  data: faqBlockDataSchemaV1,
});
export type FaqItemV1 = z.infer<typeof faqItemSchemaV1>;
export type FaqBlockDataV1 = z.infer<typeof faqBlockDataSchemaV1>;
export type FaqBlockV1 = z.infer<typeof faqBlockSchemaV1>;

export const TABS_V1_LIMITS = Object.freeze({
  tabs: 8,
  labelCharacters: HERO_V1_LIMITS.buttonLabelCharacters,
  paragraphs: 20,
  contentCharacters: 10000,
});
export const tabContentSchemaV1 = z
  .object({
    type: z.literal("doc"),
    nodes: z
      .array(z.object({ type: z.literal("paragraph"), children: textInlinesSchemaV1 }).strict())
      .min(1)
      .max(TABS_V1_LIMITS.paragraphs),
  })
  .strict()
  .superRefine((document, context) => {
    const length = document.nodes.reduce(
      (total, node) => total + textInlineCharactersV1(node.children),
      0,
    );
    if (length > TABS_V1_LIMITS.contentCharacters)
      context.addIssue({
        code: "custom",
        path: ["nodes"],
        message: "Tab content exceeds the character limit",
      });
    if (
      !document.nodes.some((node) =>
        node.children.some((child) =>
          child.type === "text" ? child.text.trim() : child.children.some((run) => run.text.trim()),
        ),
      )
    )
      context.addIssue({
        code: "custom",
        path: ["nodes"],
        message: "Non-blank tab content required",
      });
  });
export const tabItemSchemaV1 = z
  .object({
    label: heroLabelSchemaV1.max(TABS_V1_LIMITS.labelCharacters),
    content: tabContentSchemaV1,
  })
  .strict();
export const tabsBlockDataSchemaV1 = z
  .object({ tabs: z.array(tabItemSchemaV1).min(1).max(TABS_V1_LIMITS.tabs) })
  .strict();
export const tabsBlockSchemaV1 = contentBlockCommonSchema.safeExtend({
  type: z.literal("TABS"),
  schemaVersion: z.literal(1),
  data: tabsBlockDataSchemaV1,
});
export type TabContentV1 = z.infer<typeof tabContentSchemaV1>;
export type TabItemV1 = z.infer<typeof tabItemSchemaV1>;
export type TabsBlockDataV1 = z.infer<typeof tabsBlockDataSchemaV1>;
export type TabsBlockV1 = z.infer<typeof tabsBlockSchemaV1>;

// TABLE is a standalone structured block. These bounds match the simple TEXT
// table and prevent unbounded JSONB/editor/SSR payloads.
export const TABLE_V1_LIMITS = Object.freeze({
  columns: TEXT_V1_LIMITS.tableColumns,
  rows: TEXT_V1_LIMITS.tableRows,
  captionCharacters: 300,
  headerCharacters: 200,
  cellCharacters: TEXT_V1_LIMITS.runCharacters,
});
export const tableBlockDataSchemaV1 = z
  .object({
    caption: textPlainSchemaV1.max(TABLE_V1_LIMITS.captionCharacters).optional(),
    headers: z
      .array(
        textPlainSchemaV1
          .max(TABLE_V1_LIMITS.headerCharacters)
          .refine((value) => value.trim().length > 0, "Header label required"),
      )
      .min(1)
      .max(TABLE_V1_LIMITS.columns),
    rows: z
      .array(
        z.array(textPlainSchemaV1.max(TABLE_V1_LIMITS.cellCharacters)).max(TABLE_V1_LIMITS.columns),
      )
      .min(1)
      .max(TABLE_V1_LIMITS.rows),
  })
  .strict()
  .superRefine((table, context) => {
    table.rows.forEach((row, index) => {
      if (row.length !== table.headers.length)
        context.addIssue({
          code: "custom",
          path: ["rows", index],
          message: "Table row must match header column count",
        });
    });
  });
export const tableBlockSchemaV1 = contentBlockCommonSchema.safeExtend({
  type: z.literal("TABLE"),
  schemaVersion: z.literal(1),
  data: tableBlockDataSchemaV1,
});
export type TableBlockDataV1 = z.infer<typeof tableBlockDataSchemaV1>;
export type TableBlockV1 = z.infer<typeof tableBlockSchemaV1>;

export const TIMELINE_V1_LIMITS = Object.freeze({
  items: 30,
  titleCharacters: HERO_V1_LIMITS.titleCharacters,
  dateCharacters: 120,
  itemTitleCharacters: HERO_V1_LIMITS.titleCharacters,
  descriptionCharacters: HERO_V1_LIMITS.descriptionCharacters,
});
export const timelineItemSchemaV1 = z
  .object({
    date: heroLabelSchemaV1.max(TIMELINE_V1_LIMITS.dateCharacters).optional(),
    title: heroLabelSchemaV1.max(TIMELINE_V1_LIMITS.itemTitleCharacters),
    description: heroLabelSchemaV1.max(TIMELINE_V1_LIMITS.descriptionCharacters),
  })
  .strict();
export const timelineBlockDataSchemaV1 = z
  .object({
    title: heroBlockDataSchemaV1.shape.title.optional(),
    items: z.array(timelineItemSchemaV1).min(1).max(TIMELINE_V1_LIMITS.items),
  })
  .strict();
export const timelineBlockSchemaV1 = contentBlockCommonSchema.safeExtend({
  type: z.literal("TIMELINE"),
  schemaVersion: z.literal(1),
  data: timelineBlockDataSchemaV1,
});
export type TimelineItemV1 = z.infer<typeof timelineItemSchemaV1>;
export type TimelineBlockDataV1 = z.infer<typeof timelineBlockDataSchemaV1>;
export type TimelineBlockV1 = z.infer<typeof timelineBlockSchemaV1>;

// Resolved transport metadata, never persisted as HERO JSONB or used as backend
// authorization. Caller must resolve a fresh, authorized library image.
export const heroResolvedImageSchemaV1 = z
  .object({
    id: z.uuid(),
    type: z.literal("IMAGE"),
    processingStatus: z.literal("READY"),
    deletionStatus: z.literal("NONE"),
    mimeType: z.enum(["image/png", "image/jpeg", "image/webp", "image/avif"]),
    width: z.number().int().positive().max(100000),
    height: z.number().int().positive().max(100000),
    src: z
      .string()
      .max(2048)
      .regex(/^\/media\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_.-]+)*$/)
      .refine(
        (value) => !value.split("/").some((segment) => segment === "." || segment === ".."),
        "Invalid media path",
      ),
  })
  .strict();
export type HeroResolvedImageV1 = z.infer<typeof heroResolvedImageSchemaV1>;

export const IMAGE_V1_LIMITS = Object.freeze({ altCharacters: 300, captionCharacters: 500 });
export const imageBlockDataSchemaV1 = z
  .object({
    imageId: z.uuid(),
    alt: textPlainSchemaV1.max(IMAGE_V1_LIMITS.altCharacters).optional(),
    caption: textPlainSchemaV1.max(IMAGE_V1_LIMITS.captionCharacters).optional(),
    link: textLinkUrlSchemaV1.optional(),
    decorative: z.boolean(),
  })
  .strict()
  .superRefine((data, context) => {
    if (data.decorative && data.alt !== undefined && data.alt !== "")
      context.addIssue({
        code: "custom",
        path: ["alt"],
        message: "Decorative image must not carry informative alt",
      });
    if (data.decorative && data.link && !data.caption?.trim())
      context.addIssue({
        code: "custom",
        path: ["caption"],
        message: "Linked decorative image requires an accessible caption label",
      });
  });
export const imageBlockSchemaV1 = contentBlockCommonSchema.safeExtend({
  type: z.literal("IMAGE"),
  schemaVersion: z.literal(1),
  data: imageBlockDataSchemaV1,
});
export const imageResolvedImageSchemaV1 = heroResolvedImageSchemaV1.safeExtend({
  altText: textPlainSchemaV1.max(IMAGE_V1_LIMITS.altCharacters).nullable().optional(),
});
export type ImageBlockDataV1 = z.infer<typeof imageBlockDataSchemaV1>;
export type ImageBlockV1 = z.infer<typeof imageBlockSchemaV1>;
export type ImageResolvedImageV1 = z.infer<typeof imageResolvedImageSchemaV1>;

export const processMediaPayloadSchema = z.object({ mediaId: z.uuid() }).strict();
export type ProcessMediaPayload = z.infer<typeof processMediaPayloadSchema>;
export const mediaProcessingResponseSchema = z
  .object({
    id: z.uuid(),
    processingStatus: z.enum(["PENDING", "PROCESSING", "READY", "FAILED"]),
    width: z.number().int().positive().nullable(),
    height: z.number().int().positive().nullable(),
    error: z.literal("Falha no processamento da imagem").nullable(),
  })
  .strict();
export const IMAGE_MAX_BYTES = 15 * 1024 * 1024;
export const PDF_MAX_BYTES = 30 * 1024 * 1024;
export const mediaUploadFieldsSchema = z
  .object({
    categoryId: z.uuid().optional(),
    uploadAnyway: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
  })
  .strict();
export const createMediaCategorySchema = z
  .object({
    institutionId: z.uuid().nullable(),
    name: z.string().trim().min(1).max(120),
    slug: z
      .string()
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  })
  .strict();
export type CreateMediaCategory = z.infer<typeof createMediaCategorySchema>;
export const updateMediaCategorySchema = createMediaCategorySchema.omit({ institutionId: true });
export type UpdateMediaCategory = z.infer<typeof updateMediaCategorySchema>;
export const mediaCategoryOptionSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    institutionId: z.uuid().nullable(),
  })
  .strict();
export const mediaUploadResponseSchema = z
  .object({
    id: z.uuid(),
    originalFilename: z.string(),
    mimeType: z.string(),
    sizeBytes: z.number().int().positive().max(IMAGE_MAX_BYTES),
    categoryId: z.uuid().nullable(),
    processingStatus: z.literal("PENDING"),
  })
  .strict();
export type MediaCategoryOption = z.infer<typeof mediaCategoryOptionSchema>;
export const mediaCategoryResponseSchema = mediaCategoryOptionSchema.extend({ slug: z.string() });
export const mediaCategoryContextSchema = z
  .object({
    categories: mediaCategoryResponseSchema.array(),
    institutions: z.object({ id: z.uuid(), name: z.string() }).strict().array(),
  })
  .strict();
export type MediaCategoryContext = z.infer<typeof mediaCategoryContextSchema>;
export const pdfUploadResponseSchema = mediaUploadResponseSchema.extend({
  mimeType: z.literal("application/pdf"),
  sizeBytes: z.number().int().positive().max(PDF_MAX_BYTES),
  processingStatus: z.literal("READY"),
});
export const mediaSelectionResponseSchema = mediaUploadResponseSchema.extend({
  sizeBytes: z.number().int().positive().max(PDF_MAX_BYTES),
  processingStatus: z.enum(["PENDING", "PROCESSING", "READY", "FAILED"]),
});
export const mediaDuplicateResponseSchema = z
  .object({ duplicate: z.literal(true), existing: mediaSelectionResponseSchema })
  .strict();
export const mediaSelectionRequestSchema = z.object({ id: z.uuid() }).strict();
export type MediaSelection = z.infer<typeof mediaSelectionResponseSchema>;
export const mediaLibraryQuerySchema = z
  .object({
    q: z.string().trim().max(200).optional(),
    categoryId: z.preprocess((value) => (value === "" ? undefined : value), z.uuid().optional()),
    page: z
      .string()
      .regex(/^[1-9]\d*$/)
      .default("1")
      .transform(Number)
      .pipe(z.number().int().max(10000)),
    limit: z
      .string()
      .regex(/^[1-9]\d*$/)
      .default("20")
      .transform(Number)
      .pipe(z.number().int().max(100)),
  })
  .strict();
export type MediaLibraryQuery = z.infer<typeof mediaLibraryQuerySchema>;
export const mediaLibraryResponseSchema = z
  .object({
    items: mediaSelectionResponseSchema
      .extend({
        type: z.enum(["IMAGE", "DOCUMENT"]),
        categoryName: z.string().nullable(),
        altText: z.string().nullable(),
        caption: z.string().nullable(),
        width: z.number().int().positive().nullable(),
        height: z.number().int().positive().nullable(),
        createdAt: z.iso.datetime(),
      })
      .array(),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive().max(100),
  })
  .strict();
export type MediaLibraryResponse = z.infer<typeof mediaLibraryResponseSchema>;

export const healthResponseSchema = z
  .object({
    status: z.literal("ok"),
  })
  .strict();

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const loginRequestSchema = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email()),
    password: z.string().min(1),
  })
  .strict();

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const forgotPasswordRequestSchema = z
  .object({ email: z.string().trim().toLowerCase().pipe(z.email()) })
  .strict();

export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;

export const resetPasswordRequestSchema = z
  .object({
    token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
    password: z.string().min(10),
  })
  .strict();
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;

export const sessionDataSchema = z
  .object({
    userId: z.uuid(),
    role: z.enum(["ADMIN", "EDITOR"]),
    institutionIds: z.array(z.uuid()),
    csrfToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
    createdAt: z.iso.datetime(),
    lastActivityAt: z.iso.datetime(),
    absoluteExpiresAt: z.iso.datetime(),
  })
  .strict();

export type SessionData = z.infer<typeof sessionDataSchema>;

export const institutionIdSchema = z.uuid();
export function contrastRatio(background: string, foreground: string): number {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5]
      .map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
      .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const values = [luminance(background), luminance(foreground)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
const themeColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/)
  .transform((value) => value.toLowerCase());
export const institutionThemeSchema = z
  .object({
    primary: themeColorSchema,
    primaryForeground: themeColorSchema,
    accent: themeColorSchema,
    accentForeground: themeColorSchema,
  })
  .strict()
  .refine(
    (value) =>
      contrastRatio(value.primary, value.primaryForeground) >= 4.5 &&
      contrastRatio(value.accent, value.accentForeground) >= 4.5,
    "Theme contrast must be at least 4.5:1",
  );
export type InstitutionTheme = z.infer<typeof institutionThemeSchema>;

// Configuration contract only: resolving or persisting Media references belongs to phase 4.
export const institutionLogoConfigurationSchema = z
  .object({
    logoLightId: z.uuid().nullable().optional(),
    logoDarkId: z.uuid().nullable().optional(),
  })
  .strict();
export type InstitutionLogoConfiguration = z.infer<typeof institutionLogoConfigurationSchema>;
export const institutionLogoSelectionSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(150),
  logoLightId: z.uuid().nullable(),
  logoDarkId: z.uuid().nullable(),
});
export type InstitutionLogoSelection = z.infer<typeof institutionLogoSelectionSchema>;
export const createInstitutionRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(150),
    slug: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    isActive: z.boolean().optional(),
  })
  .strict();
export const updateInstitutionRequestSchema = createInstitutionRequestSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0);
export type CreateInstitutionRequest = z.infer<typeof createInstitutionRequestSchema>;
export type UpdateInstitutionRequest = z.infer<typeof updateInstitutionRequestSchema>;

export const institutionalLinkSchema = z
  .object({
    label: z.string().trim().min(1).max(100),
    url: z
      .url({ protocol: /^https?$/ })
      .max(2048)
      .refine((value) => {
        try {
          const url = new URL(value);
          return !url.username && !url.password;
        } catch {
          return false;
        }
      }),
  })
  .strict();
export const appearanceDefaultSchema = z.enum(["SYSTEM", "LIGHT", "DARK"]);
export type AppearanceDefault = z.infer<typeof appearanceDefaultSchema>;
export const institutionSlugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const publicInstitutionThemeSchema = institutionThemeSchema
  .safeExtend({
    logoLightUrl: z
      .string()
      .regex(/^\/media\/institutions\/[a-z0-9]+(?:-[a-z0-9]+)*\/logo\/light$/)
      .optional(),
    logoDarkUrl: z
      .string()
      .regex(/^\/media\/institutions\/[a-z0-9]+(?:-[a-z0-9]+)*\/logo\/dark$/)
      .optional(),
    id: z.uuid(),
    slug: institutionSlugSchema,
    appearanceDefault: appearanceDefaultSchema,
  })
  .refine(
    (value) =>
      (!value.logoLightUrl ||
        value.logoLightUrl === `/media/institutions/${value.slug}/logo/light`) &&
      (!value.logoDarkUrl || value.logoDarkUrl === `/media/institutions/${value.slug}/logo/dark`),
    { message: "Logo paths must belong to the theme institution" },
  );
export type PublicInstitutionTheme = z.infer<typeof publicInstitutionThemeSchema>;
export const updateInstitutionSettingRequestSchema = z
  .object({
    email: z.email().max(255).nullable().optional(),
    phone: z.string().trim().max(50).nullable().optional(),
    address: z.string().trim().max(5000).nullable().optional(),
    socialLinks: z.array(institutionalLinkSchema).max(20).nullable().optional(),
    footerLinks: z.array(institutionalLinkSchema).max(20).nullable().optional(),
    appearanceDefault: appearanceDefaultSchema.optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0);
export type UpdateInstitutionSettingRequest = z.infer<typeof updateInstitutionSettingRequestSchema>;
export const deleteMediaPayloadSchema = z.object({ mediaId: z.uuid() }).strict();
export const mediaDeletionResponseSchema = z
  .object({ mediaId: z.uuid(), status: z.literal("REQUESTED") })
  .strict();
