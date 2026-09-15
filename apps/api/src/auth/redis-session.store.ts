import { randomBytes } from "node:crypto";

import type { OnModuleDestroy } from "@nestjs/common";
import { createClient, type RedisClientType } from "redis";

import type { SessionData, SessionStore } from "./auth.contracts.js";

const INACTIVITY_TTL_SECONDS = 30 * 60;

export class RedisSessionStore implements SessionStore, OnModuleDestroy {
  private client?: RedisClientType;

  async create(data: SessionData): Promise<string> {
    const client = await this.getClient();
    const sessionId = randomBytes(32).toString("base64url");
    await client.set(`session:${sessionId}`, JSON.stringify(data), { EX: INACTIVITY_TTL_SECONDS });
    return sessionId;
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
