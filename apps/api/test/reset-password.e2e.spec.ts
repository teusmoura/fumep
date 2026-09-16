import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { createDatabase, PasswordResetTokenRepository } from "@fumep/db";
import { config } from "dotenv";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuthModule } from "../src/auth/auth.module.js";
import { SESSION_STORE, type SessionStore } from "../src/auth/auth.contracts.js";
import { PasswordHasherService } from "../src/auth/password-hasher.service.js";
import { hashPasswordResetToken } from "../src/auth/password-reset-token.service.js";

config({ path: resolve(import.meta.dirname, "../../../.env"), quiet: true });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const { client, db } = createDatabase(process.env.DATABASE_URL);

describe("POST reset-password", () => {
  let app: INestApplication;
  let userId: string;
  const hasher = new PasswordHasherService();
  const repository = new PasswordResetTokenRepository(db);
  const issue = async (expiresAt = new Date(Date.now() + 60000)) => {
    const token = randomBytes(32).toString("base64url");
    await repository.create({ userId, tokenHash: hashPasswordResetToken(token), expiresAt });
    return token;
  };
  beforeAll(async () => {
    const [user] =
      await client`INSERT INTO users (name, email, password_hash, role) VALUES ('Reset fixture', ${`${crypto.randomUUID()}@fumep.test`}, ${await hasher.hash("old-password")}, 'ADMIN') RETURNING id`;
    userId = user.id;
    const moduleRef = await Test.createTestingModule({ imports: [AuthModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
    if (userId) {
      await client`DELETE FROM audit_logs WHERE user_id = ${userId}`;
      await client`DELETE FROM users WHERE id = ${userId}`;
    }
    await client.end();
  });
  it("resets with Argon2id once, rejects reuse and exposes no credentials", async () => {
    const token = await issue();
    const sessions = app.get<SessionStore>(SESSION_STORE);
    const now = new Date();
    const sessionId = await sessions.create({
      userId,
      role: "ADMIN",
      institutionIds: [],
      csrfToken: "a".repeat(43),
      createdAt: now.toISOString(),
      lastActivityAt: now.toISOString(),
      absoluteExpiresAt: new Date(now.getTime() + 60000).toISOString(),
    });
    const result = await request(app.getHttpServer())
      .post("/api/v1/auth/reset-password")
      .send({ token, password: "new long password" })
      .expect(200);
    expect(JSON.stringify(result.body)).not.toContain(token);
    expect(result.headers["set-cookie"]).toBeUndefined();
    expect(await sessions.find(sessionId)).toBeUndefined();
    const [user] = await client`SELECT password_hash FROM users WHERE id = ${userId}`;
    expect(user.password_hash).toMatch(/^\$argon2id\$/);
    expect(await hasher.verify(user.password_hash, "new long password")).toBe(true);
    expect(await hasher.verify(user.password_hash, "old-password")).toBe(false);
    await request(app.getHttpServer())
      .post("/api/v1/auth/reset-password")
      .send({ token, password: "another password" })
      .expect(400);
  });
  it("rejects unknown and expired tokens with the same error", async () => {
    const invalid = randomBytes(32).toString("base64url");
    const expired = await issue(new Date(Date.now() - 1000));
    const responses = [];
    for (const token of [invalid, expired])
      responses.push(
        (
          await request(app.getHttpServer())
            .post("/api/v1/auth/reset-password")
            .send({ token, password: "valid password" })
            .expect(400)
        ).body,
      );
    expect(responses[0]).toEqual(responses[1]);
  });
  it("validates strict input and minimum length without consuming the token", async () => {
    const token = await issue();
    for (const body of [
      { token, password: "short" },
      { token, password: "valid password", extra: true },
      { token: "invalid", password: "valid password" },
    ]) {
      await request(app.getHttpServer()).post("/api/v1/auth/reset-password").send(body).expect(400);
    }
    const [row] =
      await client`SELECT consumed_at FROM password_reset_tokens WHERE token_hash = ${hashPasswordResetToken(token)}`;
    expect(row.consumed_at).toBeNull();
  });
  it("documents the reset request in OpenAPI", () => {
    const doc = SwaggerModule.createDocument(app, new DocumentBuilder().build());
    expect(doc.paths["/api/v1/auth/reset-password"]?.post?.requestBody).toMatchObject({
      content: { "application/json": { schema: { required: ["token", "password"] } } },
    });
  });
});
