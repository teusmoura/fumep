import { describe, expect, it } from "vitest";

import { healthResponseSchema } from "./index.js";

describe("healthResponseSchema", () => {
  it("accepts the health response contract", () => {
    expect(healthResponseSchema.parse({ status: "ok" })).toEqual({
      status: "ok",
    });
  });

  it("rejects an invalid status", () => {
    expect(healthResponseSchema.safeParse({ status: "error" }).success).toBe(false);
  });
});
