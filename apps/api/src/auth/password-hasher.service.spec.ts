import { describe, expect, it } from "vitest";

import { PasswordHasherService } from "./password-hasher.service.js";

describe("PasswordHasherService", () => {
  const service = new PasswordHasherService();
  const password = "secure-password";

  it("creates an Argon2id hash different from the plain password", async () => {
    const hash = await service.hash(password);

    expect(hash).not.toBe(password);
    expect(hash).toMatch(/^\$argon2id\$/);
  });

  it("verifies the valid password and rejects an invalid one", async () => {
    const hash = await service.hash(password);

    await expect(service.verify(hash, password)).resolves.toBe(true);
    await expect(service.verify(hash, "invalid-password")).resolves.toBe(false);
  });

  it("uses a distinct salt for each hash", async () => {
    const [firstHash, secondHash] = await Promise.all([
      service.hash(password),
      service.hash(password),
    ]);

    expect(firstHash).not.toBe(secondHash);
  });
});
