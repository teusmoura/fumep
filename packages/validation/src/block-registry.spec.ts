import { z } from "zod";
import { describe, expect, it } from "vitest";
import { blockRegistry, createBlockRegistry, type BlockDefinition } from "./index.js";
// Synthetic definitions are test-only; no concrete V1 block is registered yet.
const definition = (): BlockDefinition<() => string, () => string> => ({
  type: "FIXTURE",
  schemaVersion: 1,
  label: "Fixture",
  zodSchema: z.object({ title: z.string().min(1) }).strict(),
  renderer: () => "renderer",
  editor: () => "editor",
  allowedContexts: ["PAGE"],
});
describe("central BlockRegistry infrastructure", () => {
  it("starts empty in production for both canonical contexts", () => {
    expect(blockRegistry.list()).toEqual([]);
    expect(blockRegistry.list("PAGE")).toEqual([]);
    expect(blockRegistry.list("ARTICLE")).toEqual([]);
    expect(blockRegistry.get("TEXT", 1, "PAGE")).toBeUndefined();
  });
  it("resolves exact type/version only and preserves Zod and renderer/editor bindings", () => {
    const first = definition();
    const second = {
      ...definition(),
      schemaVersion: 2,
      allowedContexts: ["PAGE", "ARTICLE"] as const,
    };
    const registry = createBlockRegistry([first, second]);
    const entry = registry.get("FIXTURE", 1, "PAGE")!;
    expect(entry.zodSchema.safeParse({ title: "Valid" }).success).toBe(true);
    expect(entry.zodSchema.safeParse({ title: "", css: "free" }).success).toBe(false);
    expect(entry.renderer).toBe(first.renderer);
    expect(entry.editor).toBe(first.editor);
    expect(registry.get("FIXTURE", 3)).toBeUndefined();
    expect(registry.get("UNKNOWN", 1)).toBeUndefined();
    expect(registry.get("FIXTURE", "1" as unknown as number)).toBeUndefined();
    expect(registry.get("FIXTURE", 1, "" as never)).toBeUndefined();
    expect(registry.list("" as never)).toEqual([]);
    expect(registry.get("FIXTURE", 1, "ARTICLE")).toBeUndefined();
    expect(registry.get("FIXTURE", 2, "ARTICLE")?.schemaVersion).toBe(2);
    expect(registry.list("ARTICLE")).toHaveLength(1);
    expect(registry.list("PAGE")).toHaveLength(2);
  });
  it("refuses duplicate versions and malformed developer definitions", () => {
    expect(() => createBlockRegistry([definition(), definition()])).toThrow("Duplicate");
    for (const patch of [
      { type: "custom-css" },
      { schemaVersion: 0 },
      { schemaVersion: 1.5 },
      { schemaVersion: Infinity },
      { label: " " },
      { allowedContexts: [] },
      { allowedContexts: ["PAGE", "PAGE"] },
      { allowedContexts: ["EVENT"] },
      { zodSchema: null },
      { renderer: null },
      { editor: null },
    ])
      expect(() =>
        createBlockRegistry([{ ...definition(), ...patch } as unknown as BlockDefinition]),
      ).toThrow("Invalid block definition");
  });
  it("isolates registries and protects metadata/context/list snapshots from mutation", () => {
    const input = definition();
    const definitions = [input];
    const registry = createBlockRegistry(definitions);
    definitions.length = 0;
    (input.allowedContexts as string[]).push("ARTICLE");
    expect(registry.get("FIXTURE", 1, "ARTICLE")).toBeUndefined();
    expect(createBlockRegistry().list()).toEqual([]);
    expect(Object.isFrozen(registry)).toBe(true);
    expect(Object.isFrozen(registry.list())).toBe(true);
    expect(Object.isFrozen(registry.get("FIXTURE", 1))).toBe(true);
    expect(Object.isFrozen(registry.get("FIXTURE", 1)?.allowedContexts)).toBe(true);
    expect(blockRegistry.list()).toEqual([]);
  });
});
