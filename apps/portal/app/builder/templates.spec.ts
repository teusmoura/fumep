import { describe, expect, it } from "vitest";
import { feedInstitutionFixture, validatePage } from "./contracts";
import { applyTemplate, pageTemplateSchema, templateFixture } from "./templates";

const [fumep, etmsl] = feedInstitutionFixture.map((item) => item.id);
function ids() {
  let index = 0;
  return () => `abababab-abab-4bab-8bab-${String(++index).padStart(12, "0")}`;
}

describe("PageTemplate demonstrativo", () => {
  it("validates global and institutional complete snapshots", () => {
    expect(
      templateFixture.map((template) => pageTemplateSchema.safeParse(template).success),
    ).toEqual([true, true]);
    expect(templateFixture[0]?.institutionId).toBeNull();
    expect(templateFixture[1]?.institutionId).toBe(etmsl);
  });

  it("applies a global template independently with new block IDs", () => {
    const template = templateFixture[0]!;
    const original = structuredClone(template);
    const first = applyTemplate(template, fumep!, ids());
    const second = applyTemplate(template, etmsl!, ids());
    expect(validatePage(first)).toEqual([]);
    expect(first.map((block) => block.id)).not.toEqual(
      template.blocksSnapshot.map((block) => block.id),
    );
    expect(first.map((block) => block.position)).toEqual([0, 1]);
    expect(second).toEqual(first);
    if (first[0]?.type !== "HERO") throw new Error("Unexpected fixture");
    first[0].data.title = "Novo título local";
    expect(template).toEqual(original);
    expect(second[0]?.data).toEqual(original.blocksSnapshot[0]?.data);
  });

  it("limits institutional template to its own draft scope", () => {
    const template = templateFixture[1]!;
    expect(validatePage(applyTemplate(template, etmsl!, ids()))).toEqual([]);
    expect(() => applyTemplate(template, fumep!, ids())).toThrow("não disponível");
    expect(() => applyTemplate(template, "cccccccc-cccc-4ccc-8ccc-cccccccccccc", ids())).toThrow(
      "Instituição",
    );
  });

  it("rejects inactive, malformed and mutable snapshots", () => {
    const template = templateFixture[0]!;
    expect(() => applyTemplate({ ...template, isActive: false }, etmsl!, ids())).toThrow("inativo");
    expect(() => applyTemplate({ ...template, name: " " }, etmsl!, ids())).toThrow();
    expect(() => applyTemplate({ ...template, blocksSnapshot: [] }, etmsl!, ids())).toThrow();
    expect(() =>
      applyTemplate(
        { ...template, blocksSnapshot: [{ ...template.blocksSnapshot[0], position: 9 }] },
        etmsl!,
        ids(),
      ),
    ).toThrow();
    expect(() => applyTemplate(template, etmsl!, () => template.blocksSnapshot[0]!.id)).toThrow(
      "Cópia",
    );
  });
});
