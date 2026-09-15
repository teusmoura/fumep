import { randomBytes } from "node:crypto";

import { Inject, type OnModuleDestroy } from "@nestjs/common";
import { createClient, type RedisClientType } from "redis";

import { sessionDataSchema } from "@fumep/validation";

import {
  SESSION_CONFIG,
  type SessionConfig,
  type SessionData,
  type SessionStore,
} from "./auth.contracts.js";

export class RedisSessionStore implements SessionStore, OnModuleDestroy {
  private client?: RedisClientType;

  constructor(@Inject(SESSION_CONFIG) private readonly config: SessionConfig) {}

  async create(data: SessionData): Promise<string> {
    const client = await this.getClient();
    const sessionId = randomBytes(32).toString("base64url");
    await client.set(`session:${sessionId}`, JSON.stringify(data), {
      EX: this.config.inactivitySeconds,
    });
    return sessionId;
  }

  async find(sessionId: string): Promise<SessionData | undefined> {
    const client = await this.getClient();
    const key = `session:${sessionId}`;
    const serialized = await client.get(key);
    if (!serialized) return undefined;

    let rawData: unknown;
    try {
      rawData = JSON.parse(serialized);
    } catch {
      await client.del(key);
      return undefined;
    }

    const parsed = sessionDataSchema.safeParse(rawData);
    if (!parsed.success) {
      await client.del(key);
      return undefined;
    }
    const data = parsed.data;

    if (new Date(data.absoluteExpiresAt).getTime() <= Date.now()) {
      await client.del(key);
      return undefined;
    }

    const refreshed = { ...data, lastActivityAt: new Date().toISOString() };
    await client.set(key, JSON.stringify(refreshed), { EX: this.config.inactivitySeconds });
    return refreshed;
  }

  async delete(sessionId: string): Promise<void> {
    const client = await this.getClient();
    await client.del(`session:${sessionId}`);
  }

  private async getClient(): Promise<RedisClientType> {
    if (!this.client) {
      const redisUrl = process.env.REDIS_URL;
      if (!redisUrl) throw new Error("REDIS_URL is required");
      this.client = createClient({ url: redisUrl });
      await this.client.connect();
    }
    return this.client;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client?.isOpen) await this.client.quit();
  }
}
