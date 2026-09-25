import { describe, expect, it } from "vitest";
import { getInstitution, institutions } from "./institutions";

describe("institution routes", () => {
  it.each([
    ["fumep", "/"],
    ["etmsl", "/etmsl"],
    ["cramam", "/cramam"],
  ])("resolves %s to %s", (slug, path) => {
    expect(getInstitution(slug)?.homePath).toBe(path);
  });

  it("does not accept unknown or prefix-matched institutions", () => {
    expect(getInstitution("etmsl-other")).toBeUndefined();
    expect(getInstitution("__proto__")).toBeUndefined();
    expect(getInstitution("")).toBeUndefined();
  });

  it("provides independent themes for all three institutions", () => {
    expect(new Set(Object.values(institutions).map(({ brand }) => brand)).size).toBe(3);
  });
});
