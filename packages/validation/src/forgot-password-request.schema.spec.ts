import { describe, expect, it } from "vitest";

import { forgotPasswordRequestSchema } from "./index.js";

describe("forgotPasswordRequestSchema", () => {
  it("normalizes email without accepting credentials or arbitrary fields", () => {
    expect(forgotPasswordRequestSchema.parse({ email: "  ADMIN@FUMEP.TEST  " })).toEqual({
      email: "admin@fumep.test",
    });
    expect(
      forgotPasswordRequestSchema.safeParse({ email: "admin@fumep.test", password: "secret" })
        .success,
    ).toBe(false);
  });

  it("rejects absent and malformed emails", () => {
    expect(forgotPasswordRequestSchema.safeParse({}).success).toBe(false);
    expect(forgotPasswordRequestSchema.safeParse({ email: "invalid" }).success).toBe(false);
  });
});
