import type { BlockContext, TextBlockV1, HeroBlockV1, ImageBlockV1 } from "@fumep/validation";
import { frontendBlockRegistry } from "./block-registry";
import { availableLibraryImages } from "./available-library-images";
import type { ContentBlockBackground } from "@fumep/validation";
export type BuilderBlock = TextBlockV1 | HeroBlockV1 | ImageBlockV1;
export type BuilderType = BuilderBlock["type"];
export function setBuilderBlockBackground(
  blocks: readonly BuilderBlock[],
  context: BlockContext,
  id: string,
  background: ContentBlockBackground,
  imageId?: string,
  images: readonly unknown[] = [],
): BuilderBlock[] | undefined {
  const parsed = parseBuilderBlocks(blocks, context);
  if (!parsed || !parsed.some((block) => block.id === id)) return undefined;
  if (
    background === "IMAGE" &&
    !availableLibraryImages(images).some((image) => image.id === imageId)
  )
    return undefined;
  return parseBuilderBlocks(
    parsed.map((block) =>
      block.id === id
        ? { ...block, background, backgroundMediaId: background === "IMAGE" ? imageId : null }
        : block,
    ),
    context,
  );
}
export function setBuilderBlockAnchor(
  blocks: readonly BuilderBlock[],
  context: BlockContext,
  id: string,
  anchor: string,
): BuilderBlock[] | undefined {
  const parsed = parseBuilderBlocks(blocks, context);
  if (!parsed || typeof anchor !== "string" || !parsed.some((block) => block.id === id))
    return undefined;
  return parseBuilderBlocks(
    parsed.map((block) =>
      block.id === id ? { ...block, anchor: anchor === "" ? null : anchor } : block,
    ),
    context,
  );
}
export function removeBuilderBlock(
  blocks: readonly BuilderBlock[],
  context: BlockContext,
  id: string,
): BuilderBlock[] | undefined {
  const parsed = parseBuilderBlocks(blocks, context);
  if (!parsed || !parsed.some((block) => block.id === id)) return undefined;
  return parseBuilderBlocks(
    parsed.filter((block) => block.id !== id).map((block, position) => ({ ...block, position })),
    context,
  );
}
export function setBuilderBlockVisibility(
  blocks: readonly BuilderBlock[],
  context: BlockContext,
  id: string,
  visible: boolean,
): BuilderBlock[] | undefined {
  const parsed = parseBuilderBlocks(blocks, context);
  const source = parsed?.find((block) => block.id === id);
  if (!parsed || !source || typeof visible !== "boolean" || source.isVisible === visible)
    return undefined;
  return parseBuilderBlocks(
    parsed.map((block) => (block.id === id ? { ...block, isVisible: visible } : block)),
    context,
  );
}
export function duplicateBuilderBlock(
  blocks: readonly BuilderBlock[],
  context: BlockContext,
  sourceId: string,
  newId: string,
): BuilderBlock[] | undefined {
  const parsed = parseBuilderBlocks(blocks, context);
  const source = parsed?.find((block) => block.id === sourceId);
  if (!parsed || !source || parsed.some((block) => block.id === newId)) return undefined;
  const position = Math.max(...parsed.map((block) => block.position)) + 1;
  return parseBuilderBlocks(
    [...parsed, { ...structuredClone(source), id: newId, position, anchor: undefined }],
    context,
  );
}
export function reorderBuilderBlocks(
  blocks: readonly BuilderBlock[],
  context: BlockContext,
  sourceId: string,
  targetIndex: number,
): BuilderBlock[] | undefined {
  const parsed = parseBuilderBlocks(blocks, context);
  if (!parsed || !Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= parsed.length)
    return undefined;
  const sourceIndex = parsed.findIndex((block) => block.id === sourceId);
  if (sourceIndex < 0 || sourceIndex === targetIndex) return undefined;
  const [source] = parsed.splice(sourceIndex, 1);
  parsed.splice(targetIndex, 0, source!);
  return parseBuilderBlocks(
    parsed.map((block, position) => ({ ...block, position })),
    context,
  );
}
export function parseBuilderBlocks(
  value: unknown,
  context: BlockContext,
): BuilderBlock[] | undefined {
  if ((context !== "PAGE" && context !== "ARTICLE") || !Array.isArray(value)) return undefined;
  const result: BuilderBlock[] = [];
  const ids = new Set<string>();
  const positions = new Set<number>();
  const anchors = new Set<string>();
  for (const input of value) {
    if (!input || typeof input !== "object") return undefined;
    const raw = input as Record<string, unknown>;
    if (typeof raw.type !== "string" || typeof raw.schemaVersion !== "number") return undefined;
    const definition = frontendBlockRegistry.get(raw.type, raw.schemaVersion, context);
    const parsed = definition?.zodSchema.safeParse(input);
    if (!parsed?.success) return undefined;
    const block = parsed.data as BuilderBlock;
    if (ids.has(block.id) || positions.has(block.position)) return undefined;
    if (block.anchor) {
      if (anchors.has(block.anchor)) return undefined;
      anchors.add(block.anchor);
    }
    ids.add(block.id);
    positions.add(block.position);
    result.push(block);
  }
  return result.sort((a, b) => a.position - b.position);
}
export function newBuilderBlock(
  type: BuilderType,
  context: BlockContext,
  blocks: readonly BuilderBlock[],
  id: string,
  imageId?: string,
): BuilderBlock | undefined {
  if (!frontendBlockRegistry.get(type, 1, context)) return undefined;
  const position = blocks.length ? Math.max(...blocks.map((block) => block.position)) + 1 : 0;
  const data =
    type === "TEXT"
      ? { content: { type: "doc", nodes: [] } }
      : type === "HERO"
        ? { title: "Novo destaque" }
        : { imageId, decorative: false };
  return parseBuilderBlocks(
    [
      ...blocks,
      { id, type, position, isVisible: true, schemaVersion: 1, background: "DEFAULT", data },
    ],
    context,
  )?.find((block) => block.id === id);
}
