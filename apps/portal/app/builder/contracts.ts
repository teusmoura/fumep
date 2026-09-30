import { z } from "zod";

const uuid = z.uuid();
const internalLink = z.string().refine((value) => /^\/(?!\/)[\w\-/]*$/.test(value), {
  message: "Use um caminho interno iniciado por /.",
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

export const blockSchemas = { TEXT: text, HERO: hero, IMAGE: image } as const;
export const blockSchema = z.discriminatedUnion("type", [text, hero, image]);
export type BuilderBlock = z.infer<typeof blockSchema>;
export type BlockType = BuilderBlock["type"];

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
    if (block.type !== "TEXT" && !mediaFor(block.data.imageId))
      errors.push(`Bloco ${index + 1}: mídia não selecionável.`);
  });
  return errors;
}
