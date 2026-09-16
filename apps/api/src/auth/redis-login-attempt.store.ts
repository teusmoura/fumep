import { createHash } from "node:crypto";

import type { OnModuleDestroy } from "@nestjs/common";
import { createClient, type RedisClientType } from "redis";

import type { LoginAttemptStore } from "./auth.contracts.js";

export const LOGIN_ATTEMPT_LIMIT = 5;
export const LOGIN_ATTEMPT_WINDOW_SECONDS = 60;

export interface AuthAttemptPolicy {
  namespace: string;
  limit: number;
  windowSeconds: number;
}

const loginPolicy: AuthAttemptPolicy = {
  namespace: "login-attempt",
  limit: LOGIN_ATTEMPT_LIMIT,
  windowSeconds: LOGIN_ATTEMPT_WINDOW_SECONDS,
};

export function loginAttemptKeys(ip: string, email?: string): string[] {
  return authAttemptKeys(loginPolicy, ip, email);
}

export function authAttemptKeys(policy: AuthAttemptPolicy, ip: string, email?: string): string[] {
  const hash = (value: string) => createHash("sha256").update(value).digest("hex");
  const keys = [`${policy.namespace}:ip:${hash(ip)}`];
  if (email) keys.push(`${policy.namespace}:account:${hash(email.trim().toLowerCase())}`);
  return keys;
}

// Increment and initial expiration must be atomic, including concurrent API instances.
const consumeScript = `
local allowed = 1
for _, key in ipairs(KEYS) do
  local count = redis.call('INCR', key)
  if count == 1 then redis.call('EXPIRE', key, ARGV[2]) end
  if count > tonumber(ARGV[1]) then allowed = 0 end
end
return allowed
`;

export class RedisLoginAttemptStore implements LoginAttemptStore, OnModuleDestroy {
  private client?: RedisClientType;
  private connection?: Promise<RedisClientType>;

  constructor(private readonly policy: AuthAttemptPolicy = loginPolicy) {}

  async consume(ip: string, email?: string): Promise<boolean> {
    const client = await this.getClient();
    const allowed = await client.eval(consumeScript, {
      keys: authAttemptKeys(this.policy, ip, email),
      arguments: [String(this.policy.limit), String(this.policy.windowSeconds)],
    });
    return allowed === 1;
  }

  private getClient(): Promise<RedisClientType> {
    if (this.connection) return this.connection;
    const url = process.env.REDIS_URL;
    if (!url) throw new Error("REDIS_URL is required");
    const client: RedisClientType = createClient({ url });
    this.client = client;
    const connection = client.connect().then(() => client);
    this.connection = connection;
    return connection;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client?.isOpen) await this.client.quit();
  }
}
