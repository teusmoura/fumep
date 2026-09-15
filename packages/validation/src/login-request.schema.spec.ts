import { describe, expect, it } from "vitest";

import { loginRequestSchema } from "./index.js";

describe("loginRequestSchema", () => {
  it("normalizes a valid email", () => {
    expect(
      loginRequestSchema.parse({ email: "  ADMIN@FUMEP.TEST  ", password: "password" }),
    ).toEqual({
      email: "admin@fumep.test",
      password: "password",
    });
  });

  it("rejects invalid or additional fields", () => {
    expect(loginRequestSchema.safeParse({ email: "invalid", password: "password" }).success).toBe(
      false,
    );
    expect(
      loginRequestSchema.safeParse({
        email: "admin@fumep.test",
        password: "password",
        role: "ADMIN",
      }).success,
    ).toBe(false);
  });
});
