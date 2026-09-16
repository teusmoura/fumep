import { resolve } from "node:path";

import { config as loadEnvironment } from "dotenv";
import { createClient } from "redis";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  authAttemptKeys,
  loginAttemptKeys,
  RedisLoginAttemptStore,
} from "./redis-login-attempt.store.js";
import {
  FORGOT_PASSWORD_POLICY,
  RedisForgotPasswordAttemptStore,
} from "./redis-forgot-password-attempt.store.js";

loadEnvironment({ path: resolve(import.meta.dirname, "../../../../.env"), quiet: true });
if (!process.env.REDIS_URL) throw new Error("REDIS_URL is required for login limit tests");

describe("RedisLoginAttemptStore", () => {
  const store = new RedisLoginAttemptStore();
  const recoveryStore = new RedisForgotPasswordAttemptStore();
  const inspector = createClient({ url: process.env.REDIS_URL });
  const keys = new Set<string>();
  const consume = (ip: string, email?: string) => {
    loginAttemptKeys(ip, email).forEach((key) => keys.add(key));
    return store.consume(ip, email);
  };

  beforeAll(async () => inspector.connect());
  afterEach(async () => {
    if (keys.size) await inspector.del([...keys]);
    keys.clear();
  });
  afterAll(async () => {
    await store.onModuleDestroy();
    await recoveryStore.onModuleDestroy();
    await inspector.quit();
  });

  it("allows exactly five concurrent attempts and sets an inactivity-independent window", async () => {
    const ip = crypto.randomUUID();
    const email = `${crypto.randomUUID()}@fumep.test`;
    const results = await Promise.all(Array.from({ length: 6 }, () => consume(ip, email)));
    expect(results.filter(Boolean)).toHaveLength(5);
    for (const key of loginAttemptKeys(ip, email)) {
      expect(await inspector.ttl(key)).toBeGreaterThan(58);
      expect(await inspector.ttl(key)).toBeLessThanOrEqual(60);
      await inspector.expire(key, 10);
    }
    expect(await consume(ip, email)).toBe(false);
    expect(await inspector.ttl(loginAttemptKeys(ip)[0]!)).toBeLessThanOrEqual(10);
    for (const key of loginAttemptKeys(ip, email)) await inspector.expire(key, 0);
    expect(await consume(ip, email)).toBe(true);
  });

  it("limits the same account across different IPs and normalizes email", async () => {
    const email = `${crypto.randomUUID()}@fumep.test`;
    for (let index = 0; index < 5; index++) {
      expect(await consume(crypto.randomUUID(), email)).toBe(true);
    }
    expect(await consume(crypto.randomUUID(), `  ${email.toUpperCase()}  `)).toBe(false);
    expect(await consume(crypto.randomUUID(), `${crypto.randomUUID()}@fumep.test`)).toBe(true);
  });

  it("limits an IP independently of the account or payload", async () => {
    const ip = crypto.randomUUID();
    for (let index = 0; index < 5; index++) expect(await consume(ip)).toBe(true);
    expect(await consume(ip, `${crypto.randomUUID()}@fumep.test`)).toBe(false);
  });

  it("limits recovery to five requests per hour without consuming login limits", async () => {
    const ip = crypto.randomUUID();
    const email = `${crypto.randomUUID()}@fumep.test`;
    const recoveryKeys = authAttemptKeys(FORGOT_PASSWORD_POLICY, ip, email);
    recoveryKeys.forEach((key) => keys.add(key));
    for (let index = 0; index < 5; index++)
      expect(await recoveryStore.consume(ip, email)).toBe(true);
    expect(await recoveryStore.consume(ip, email)).toBe(false);
    for (const key of recoveryKeys) {
      expect(await inspector.ttl(key)).toBeGreaterThan(3598);
      expect(await inspector.ttl(key)).toBeLessThanOrEqual(3600);
    }
    expect(await consume(ip, email)).toBe(true);
  });
});
