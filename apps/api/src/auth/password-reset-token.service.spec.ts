import { describe, expect, it } from "vitest";

import type { CreatePasswordResetTokenInput } from "@fumep/db";

import {
  hashPasswordResetToken,
  PasswordResetTokenService,
} from "./password-reset-token.service.js";

describe("PasswordResetTokenService", () => {
  it("issues distinct high-entropy tokens while persisting only hashes and a 30-minute expiry", async () => {
    const persisted: CreatePasswordResetTokenInput[] = [];
    const service = new PasswordResetTokenService({
      create: async (input) => {
        persisted.push(input);
      },
    });
    const userId = crypto.randomUUID();
    const before = Date.now();
    const first = await service.issue(userId);
    const second = await service.issue(userId);
    const after = Date.now();

    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(second).not.toBe(first);
    expect(persisted[0]).toMatchObject({ userId, tokenHash: hashPasswordResetToken(first) });
    expect(persisted[1].tokenHash).not.toBe(persisted[0].tokenHash);
    expect(JSON.stringify(persisted)).not.toContain(first);
    for (const input of persisted) {
      expect(input.tokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(input.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 30 * 60 * 1000);
      expect(input.expiresAt.getTime()).toBeLessThanOrEqual(after + 30 * 60 * 1000);
    }
  });

  it("does not return a token when persistence fails", async () => {
    const service = new PasswordResetTokenService({
      create: async () => {
        throw new Error("Persistence failed");
      },
    });
    await expect(service.issue(crypto.randomUUID())).rejects.toThrow("Persistence failed");
  });
});
