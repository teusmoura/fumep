import { z } from "zod";
import {
  blockSchema,
  feedInstitutionFixture,
  normalizePositions,
  validatePage,
  type BuilderBlock,
} from "./contracts";
import { demoBlocks } from "./demo";

const pageTemplateBase = z
  .object({
    id: z.uuid(),
    institutionId: z.uuid().nullable(),
    name: z.string().trim().min(1).max(150),
    description: z.string().nullable(),
    blocksSnapshot: z.array(blockSchema).min(1),
    isActive: z.boolean(),
    createdBy: z.uuid().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict();
export const pageTemplateSchema = pageTemplateBase.superRefine((template, context) => {
  for (const message of validatePage(template.blocksSnapshot))
    context.addIssue({ code: "custom", path: ["blocksSnapshot"], message });
});
export type PageTemplate = z.infer<typeof pageTemplateSchema>;

/** Local examples only; neither is a row in page_templates. */
export const templateFixture: PageTemplate[] = [
  {
    id: "81818181-8181-4181-8181-818181818181",
    institutionId: null,
    name: "Página de serviço (demonstração)",
    description: "Modelo global de exemplo.",
    blocksSnapshot: structuredClone(demoBlocks.slice(0, 2)),
    isActive: true,
    createdBy: null,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  },
  {
    id: "92929292-9292-4292-8292-929292929292",
    institutionId: feedInstitutionFixture[1].id,
    name: "Página ETMSL (demonstração)",
    description: "Modelo institucional de exemplo.",
    blocksSnapshot: normalizePositions(structuredClone(demoBlocks.slice(3, 6))),
    isActive: true,
    createdBy: null,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  },
];

export function applyTemplate(
  candidate: unknown,
  institutionId: string,
  nextId: () => string = () => crypto.randomUUID(),
): BuilderBlock[] {
  const template = pageTemplateSchema.parse(candidate);
  if (!template.isActive) throw new Error("Modelo inativo.");
  if (!feedInstitutionFixture.some((item) => item.id === institutionId))
    throw new Error("Instituição de demonstração inválida.");
  if (template.institutionId !== null && template.institutionId !== institutionId)
    throw new Error("Modelo não disponível para esta instituição.");
  const sourceIds = new Set(template.blocksSnapshot.map((block) => block.id));
  const blocks = normalizePositions(
    template.blocksSnapshot.map((block) => ({ ...structuredClone(block), id: nextId() })),
  );
  if (blocks.some((block) => sourceIds.has(block.id)) || validatePage(blocks).length)
    throw new Error("Cópia do modelo inválida.");
  return blocks;
}
