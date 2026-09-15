import { resolve } from "node:path";

import { config as loadEnvironment } from "dotenv";
import { createClient } from "redis";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { SessionData } from "./auth.contracts.js";
import { RedisSessionStore } from "./redis-session.store.js";
import { loadSessionConfig } from "./session.config.js";

loadEnvironment({ path: resolve(import.meta.dirname, "../../../../.env"), quiet: true });

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) throw new Error("REDIS_URL is required for session tests");

describe("RedisSessionStore", () => {
  const store = new RedisSessionStore(loadSessionConfig());
  const inspector = createClient({ url: redisUrl });

  beforeAll(async () => inspector.connect());
  afterAll(async () => {
    await store.onModuleDestroy();
    await inspector.quit();
  });

  it("persists an opaque session with an inactivity TTL", async () => {
    const now = new Date();
    const data: SessionData = {
      userId: crypto.randomUUID(),
      role: "EDITOR",
      institutionIds: [crypto.randomUUID()],
      createdAt: now.toISOString(),
      lastActivityAt: now.toISOString(),
      absoluteExpiresAt: new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString(),
    };

    const sessionId = await store.create(data);
    const key = `session:${sessionId}`;

    expect(sessionId).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(JSON.parse((await inspector.get(key)) ?? "null")).toEqual(data);
    expect(await inspector.ttl(key)).toBeGreaterThan(29 * 60);
    const refreshed = await store.find(sessionId);
    expect(refreshed).toMatchObject({
      userId: data.userId,
      role: data.role,
      institutionIds: data.institutionIds,
      createdAt: data.createdAt,
      absoluteExpiresAt: data.absoluteExpiresAt,
    });
    expect(new Date(refreshed?.lastActivityAt ?? 0).getTime()).toBeGreaterThanOrEqual(
      new Date(data.lastActivityAt).getTime(),
    );
    await inspector.del(key);
  });

  it("rejects and removes an absolutely expired session", async () => {
    const sessionId = "expired-session";
    const key = `session:${sessionId}`;
    await inspector.set(
      key,
      JSON.stringify({
        userId: crypto.randomUUID(),
        role: "ADMIN",
        institutionIds: [],
        createdAt: new Date(0).toISOString(),
        lastActivityAt: new Date(0).toISOString(),
        absoluteExpiresAt: new Date(0).toISOString(),
      }),
    );

    await expect(store.find(sessionId)).resolves.toBeUndefined();
    await expect(inspector.exists(key)).resolves.toBe(0);
  });

  it("rejects and removes a malformed session payload", async () => {
    const sessionId = "malformed-session";
    const key = `session:${sessionId}`;
    await inspector.set(key, JSON.stringify({ userId: "not-a-uuid", role: "ADMIN" }));

    await expect(store.find(sessionId)).resolves.toBeUndefined();
    await expect(inspector.exists(key)).resolves.toBe(0);
  });
});
