import { z } from "zod";

const uuid = z.uuid();
const internalLink = z.string().refine((value) => /^\/(?!\/)[\w\-/]*$/.test(value), {
  message: "Use um caminho interno iniciado por /.",
});
const optionalInternalLink = z.union([z.literal(""), internalLink]);
const requiredText = z.string().trim().min(1);
const optionalButton = z
  .object({ buttonLabel: z.string(), buttonUrl: z.string() })
  .superRefine((value, ctx) => {
    if (value.buttonLabel.trim() || value.buttonUrl.trim()) {
      if (!value.buttonLabel.trim() || !internalLink.safeParse(value.buttonUrl).success)
        ctx.addIssue({ code: "custom", path: ["buttonUrl"], message: "CTA inválido." });
    }
  });
const base = z.object({
  id: uuid,
  position: z.number().int().nonnegative(),
  isVisible: z.boolean(),
  schemaVersion: z.literal(1),
  background: z.enum(["NONE", "SURFACE"]),
  anchor: z
    .string()
    .regex(/^[a-z][a-z0-9-]*$/)
    .optional(),
});
const text = base
  .extend({
    type: z.literal("TEXT"),
    data: z.object({ title: z.string().trim().min(1), body: z.string().trim().min(1) }).strict(),
  })
  .strict();
const hero = base
  .extend({
    type: z.literal("HERO"),
    data: z
      .object({
        title: z.string().trim().min(1),
        description: z.string(),
        imageId: uuid,
        imageAlt: z.string(),
        decorative: z.boolean(),
        buttonLabel: z.string(),
        buttonUrl: z.string(),
      })
      .strict()
      .superRefine((value, ctx) => {
        if (!value.decorative && !value.imageAlt.trim())
          ctx.addIssue({ code: "custom", path: ["imageAlt"], message: "Alt é obrigatório." });
        if (value.buttonLabel.trim() || value.buttonUrl.trim()) {
          if (!value.buttonLabel.trim() || !internalLink.safeParse(value.buttonUrl).success)
            ctx.addIssue({ code: "custom", path: ["buttonUrl"], message: "CTA inválido." });
        }
      }),
  })
  .strict();
const image = base
  .extend({
    type: z.literal("IMAGE"),
    data: z
      .object({
        imageId: uuid,
        alt: z.string(),
        caption: z.string(),
        decorative: z.boolean(),
        link: z.string(),
      })
      .strict()
      .superRefine((value, ctx) => {
        if (!value.decorative && !value.alt.trim())
          ctx.addIssue({ code: "custom", path: ["alt"], message: "Alt é obrigatório." });
        if (value.link && !internalLink.safeParse(value.link).success)
          ctx.addIssue({ code: "custom", path: ["link"], message: "Link inválido." });
      }),
  })
  .strict();

const imageText = base
  .extend({
    type: z.literal("IMAGE_TEXT"),
    data: z
      .object({
        title: requiredText,
        text: requiredText,
        imageId: uuid,
        imageAlt: requiredText,
        imagePosition: z.enum(["IMAGE_LEFT", "IMAGE_RIGHT"]),
        buttonLabel: z.string(),
        buttonUrl: z.string(),
      })
      .strict()
      .superRefine((value, ctx) => {
        const result = optionalButton.safeParse(value);
        if (!result.success)
          ctx.addIssue({ code: "custom", path: ["buttonUrl"], message: "CTA inválido." });
      }),
  })
  .strict();
const card = z
  .object({
    imageId: uuid,
    alt: requiredText,
    title: requiredText,
    description: z.string(),
    url: optionalInternalLink,
  })
  .strict();
const cards = base
  .extend({
    type: z.literal("CARDS"),
    data: z.object({ title: z.string(), items: z.array(card).min(1).max(12) }).strict(),
  })
  .strict();
const quickLink = z
  .object({
    label: requiredText,
    url: internalLink,
    icon: z.enum(["NONE", "BOOK", "CALENDAR", "ARROW"]),
  })
  .strict();
const quickLinks = base
  .extend({
    type: z.literal("QUICK_LINKS"),
    data: z.object({ title: z.string(), items: z.array(quickLink).min(1).max(12) }).strict(),
  })
  .strict();
const cta = base
  .extend({
    type: z.literal("CTA"),
    data: z
      .object({
        title: requiredText,
        text: z.string(),
        buttonLabel: requiredText,
        buttonUrl: internalLink,
      })
      .strict(),
  })
  .strict();
const faq = base
  .extend({
    type: z.literal("FAQ"),
    data: z
      .object({
        title: z.string(),
        items: z
          .array(z.object({ question: requiredText, answer: requiredText }).strict())
          .min(1)
          .max(30),
      })
      .strict(),
  })
  .strict();
const tabs = base
  .extend({
    type: z.literal("TABS"),
    data: z
      .object({
        tabs: z
          .array(z.object({ label: requiredText, content: requiredText }).strict())
          .min(1)
          .max(8),
      })
      .strict(),
  })
  .strict();
const table = base
  .extend({
    type: z.literal("TABLE"),
    data: z
      .object({
        caption: z.string(),
        headers: z.array(requiredText).min(1).max(12),
        rows: z.array(z.array(z.string())).min(1).max(50),
      })
      .strict()
      .superRefine((value, ctx) => {
        if (value.rows.some((row) => row.length !== value.headers.length))
          ctx.addIssue({
            code: "custom",
            path: ["rows"],
            message: "Colunas da tabela não correspondem aos cabeçalhos.",
          });
      }),
  })
  .strict();
const timeline = base
  .extend({
    type: z.literal("TIMELINE"),
    data: z
      .object({
        title: z.string(),
        items: z
          .array(
            z.object({ date: z.string(), title: requiredText, description: requiredText }).strict(),
          )
          .min(1)
          .max(50),
      })
      .strict(),
  })
  .strict();
const statistics = base
  .extend({
    type: z.literal("STATISTICS"),
    data: z
      .object({
        items: z
          .array(
            z
              .object({ value: requiredText, label: requiredText, description: z.string() })
              .strict(),
          )
          .min(1)
          .max(12),
      })
      .strict(),
  })
  .strict();
const carousel = base
  .extend({
    type: z.literal("CAROUSEL"),
    data: z
      .object({
        items: z
          .array(
            z
              .object({
                imageId: uuid,
                alt: requiredText,
                caption: z.string(),
                url: optionalInternalLink,
              })
              .strict(),
          )
          .min(1)
          .max(10),
      })
      .strict(),
  })
  .strict();
export function videoEmbedUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    let id: string | null = null;
    if (host === "www.youtube.com" || host === "youtube.com") {
      if (
        url.pathname !== "/watch" ||
        url.hash ||
        [...url.searchParams.keys()].some((key) => key !== "v")
      )
        return null;
      id = url.searchParams.get("v");
      if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
      return `https://www.youtube-nocookie.com/embed/${id}`;
    }
    if (host === "youtu.be") {
      if (url.search || url.hash) return null;
      id = url.pathname.slice(1);
      if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
      return `https://www.youtube-nocookie.com/embed/${id}`;
    }
    if (host === "vimeo.com" || host === "www.vimeo.com") {
      if (url.search || url.hash) return null;
      id = url.pathname.slice(1);
      if (!/^[0-9]{1,15}$/.test(id)) return null;
      return `https://player.vimeo.com/video/${id}`;
    }
    return null;
  } catch {
    return null;
  }
}
const map = base
  .extend({
    type: z.literal("MAP"),
    data: z
      .object({
        title: z.string(),
        latitude: z.number().finite().min(-90).max(90),
        longitude: z.number().finite().min(-180).max(180),
        address: requiredText,
        zoom: z.number().int().min(1).max(20),
      })
      .strict(),
  })
  .strict();
const video = base
  .extend({
    type: z.literal("VIDEO"),
    data: z
      .object({
        url: z
          .string()
          .refine(
            (value) => videoEmbedUrl(value) !== null,
            "Use URL HTTPS de vídeo YouTube ou Vimeo.",
          ),
        title: requiredText,
        description: z.string(),
      })
      .strict(),
  })
  .strict();
const document = base
  .extend({
    type: z.literal("DOCUMENT"),
    data: z
      .object({
        mediaId: uuid,
        title: z.string(),
        description: z.string(),
        buttonLabel: z.string(),
      })
      .strict(),
  })
  .strict();

export const blockSchemas = {
  TEXT: text,
  HERO: hero,
  IMAGE: image,
  IMAGE_TEXT: imageText,
  CARDS: cards,
  QUICK_LINKS: quickLinks,
  CTA: cta,
  FAQ: faq,
  TABS: tabs,
  TABLE: table,
  TIMELINE: timeline,
  STATISTICS: statistics,
  CAROUSEL: carousel,
  MAP: map,
  VIDEO: video,
  DOCUMENT: document,
} as const;
export const blockSchema = z.discriminatedUnion("type", [
  text,
  hero,
  image,
  imageText,
  cards,
  quickLinks,
  cta,
  faq,
  tabs,
  table,
  timeline,
  statistics,
  carousel,
  map,
  video,
  document,
]);
export type BuilderBlock = z.infer<typeof blockSchema>;
export type BlockType = BuilderBlock["type"];
export const blockTypes: BlockType[] = [
  "TEXT",
  "HERO",
  "IMAGE",
  "IMAGE_TEXT",
  "CARDS",
  "QUICK_LINKS",
  "CTA",
  "FAQ",
  "TABS",
  "TABLE",
  "TIMELINE",
  "STATISTICS",
  "CAROUSEL",
  "MAP",
  "VIDEO",
  "DOCUMENT",
];

export const mediaFixture = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    label: "Fachada da ETMSL",
    src: "/builder/fachada.svg",
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    label: "Biblioteca",
    src: "/builder/biblioteca.svg",
  },
] as const;
export const pdfFixture = {
  id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  label: "Documento demonstrativo (PDF)",
  src: "/builder/demo-document.pdf",
} as const;

export function mediaFor(id: string) {
  return mediaFixture.find((item) => item.id === id);
}

export function createBlock(type: BlockType, position: number): BuilderBlock {
  const common = {
    id: crypto.randomUUID(),
    position,
    isVisible: true,
    schemaVersion: 1 as const,
    background: "NONE" as const,
  };
  switch (type) {
    case "TEXT":
      return { ...common, type, data: { title: "Novo título", body: "Escreva aqui." } };
    case "HERO":
      return {
        ...common,
        type,
        data: {
          title: "Destaque",
          description: "",
          imageId: mediaFixture[0].id,
          imageAlt: "Fachada da ETMSL",
          decorative: false,
          buttonLabel: "",
          buttonUrl: "",
        },
      };
    case "IMAGE":
      return {
        ...common,
        type,
        data: {
          imageId: mediaFixture[1].id,
          alt: "Biblioteca",
          caption: "",
          decorative: false,
          link: "",
        },
      };
    case "IMAGE_TEXT":
      return {
        ...common,
        type,
        data: {
          title: "Imagem e texto",
          text: "Escreva aqui.",
          imageId: mediaFixture[0].id,
          imageAlt: "Fachada da ETMSL",
          imagePosition: "IMAGE_LEFT",
          buttonLabel: "",
          buttonUrl: "",
        },
      };
    case "CARDS":
      return {
        ...common,
        type,
        data: {
          title: "Cards",
          items: [
            {
              imageId: mediaFixture[0].id,
              alt: "Fachada da ETMSL",
              title: "Primeiro card",
              description: "",
              url: "",
            },
          ],
        },
      };
    case "QUICK_LINKS":
      return {
        ...common,
        type,
        data: {
          title: "Links rápidos",
          items: [{ label: "Página institucional", url: "/etmsl", icon: "ARROW" }],
        },
      };
    case "CTA":
      return {
        ...common,
        type,
        data: { title: "Saiba mais", text: "", buttonLabel: "Acessar", buttonUrl: "/etmsl" },
      };
    case "FAQ":
      return {
        ...common,
        type,
        data: {
          title: "Perguntas frequentes",
          items: [
            { question: "Como participar?", answer: "Consulte as informações da instituição." },
          ],
        },
      };
    case "TABS":
      return {
        ...common,
        type,
        data: { tabs: [{ label: "Primeira aba", content: "Conteúdo da aba." }] },
      };
    case "TABLE":
      return {
        ...common,
        type,
        data: {
          caption: "Tabela demonstrativa",
          headers: ["Coluna 1", "Coluna 2"],
          rows: [["Valor 1", "Valor 2"]],
        },
      };
    case "TIMELINE":
      return {
        ...common,
        type,
        data: {
          title: "Linha do tempo",
          items: [{ date: "", title: "Marco", description: "Descrição do marco." }],
        },
      };
    case "STATISTICS":
      return {
        ...common,
        type,
        data: { items: [{ value: "1", label: "Indicador", description: "" }] },
      };
    case "CAROUSEL":
      return {
        ...common,
        type,
        data: {
          items: [{ imageId: mediaFixture[0].id, alt: "Fachada da ETMSL", caption: "", url: "" }],
        },
      };
    case "MAP":
      return {
        ...common,
        type,
        data: {
          title: "Localização",
          latitude: -22.56,
          longitude: -47.4,
          address: "Piracicaba, SP",
          zoom: 14,
        },
      };
    case "VIDEO":
      return {
        ...common,
        type,
        data: {
          url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
          title: "Vídeo demonstrativo",
          description: "",
        },
      };
    case "DOCUMENT":
      return {
        ...common,
        type,
        data: {
          mediaId: pdfFixture.id,
          title: "Documento demonstrativo",
          description: "PDF de fixture local, sem Media Library.",
          buttonLabel: "Abrir PDF de demonstração",
        },
      };
  }
}

export function normalizePositions(blocks: BuilderBlock[]): BuilderBlock[] {
  return blocks.map((block, position) => ({ ...block, position }));
}

export function moveBlock(blocks: BuilderBlock[], from: number, to: number): BuilderBlock[] {
  if (from < 0 || from >= blocks.length || to < 0 || to >= blocks.length) return blocks;
  const next = [...blocks];
  next.splice(to, 0, next.splice(from, 1)[0]!);
  return normalizePositions(next);
}

export function validatePage(blocks: BuilderBlock[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const anchors = new Set<string>();
  blocks.forEach((block, index) => {
    const result = blockSchema.safeParse(block);
    if (!result.success)
      errors.push(`Bloco ${index + 1}: ${result.error.issues[0]?.message ?? "inválido"}`);
    if (block.position !== index) errors.push(`Bloco ${index + 1}: posição inválida.`);
    if (ids.has(block.id)) errors.push(`Bloco ${index + 1}: ID duplicado.`);
    ids.add(block.id);
    if (block.anchor) {
      if (anchors.has(block.anchor)) errors.push(`Bloco ${index + 1}: âncora duplicada.`);
      anchors.add(block.anchor);
    }
    if (["HERO", "IMAGE", "IMAGE_TEXT"].includes(block.type)) {
      const mediaId = (block.data as { imageId: string }).imageId;
      if (!mediaFor(mediaId)) errors.push(`Bloco ${index + 1}: mídia não selecionável.`);
    }
    if (block.type === "CARDS" && block.data.items.some((item) => !mediaFor(item.imageId)))
      errors.push(`Bloco ${index + 1}: mídia não selecionável.`);
    if (block.type === "CAROUSEL" && block.data.items.some((item) => !mediaFor(item.imageId)))
      errors.push(`Bloco ${index + 1}: mídia não selecionável.`);
    if (block.type === "DOCUMENT" && block.data.mediaId !== pdfFixture.id)
      errors.push(`Bloco ${index + 1}: PDF não selecionável.`);
  });
  return errors;
}
