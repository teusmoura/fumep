import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  AUTH_USER_REPOSITORY,
  SESSION_STORE,
  type SessionData,
} from "../src/auth/auth.contracts.js";
import { AuthModule } from "../src/auth/auth.module.js";
import { PasswordHasherService } from "../src/auth/password-hasher.service.js";

describe("POST /api/v1/auth/login", () => {
  let app: INestApplication;
  let passwordHash: string;
  const createdSessions: SessionData[] = [];
  const sessions = new Map<string, SessionData>();

  beforeAll(async () => {
    passwordHash = await new PasswordHasherService().hash("correct-password");
    const moduleRef = await Test.createTestingModule({ imports: [AuthModule] })
      .overrideProvider(AUTH_USER_REPOSITORY)
      .useValue({
        findActiveByEmail: async (email: string) =>
          email === "admin@fumep.test"
            ? {
                id: "11111111-1111-4111-8111-111111111111",
                email,
                passwordHash,
                role: "ADMIN",
                institutionIds: [],
              }
            : undefined,
      })
      .overrideProvider(SESSION_STORE)
      .useValue({
        create: async (data: SessionData) => {
          createdSessions.push(data);
          sessions.set("test-session-id", data);
          return "test-session-id";
        },
        find: async (sessionId: string) => sessions.get(sessionId),
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
  });

  afterAll(async () => app.close());

  it("creates a server-side session and secure cookie contract for valid credentials", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "  ADMIN@FUMEP.TEST  ", password: "correct-password" })
      .expect(200)
      .expect({ authenticated: true });

    expect(createdSessions).toHaveLength(1);
    expect(createdSessions[0]).toMatchObject({
      userId: "11111111-1111-4111-8111-111111111111",
      role: "ADMIN",
      institutionIds: [],
    });
    expect(response.headers["set-cookie"]?.[0]).toContain("fumep_session=test-session-id");
    expect(response.headers["set-cookie"]?.[0]).toContain("HttpOnly");
    expect(response.headers["set-cookie"]?.[0]).toContain("SameSite=Lax");
  });

  it("rejects invalid credentials without creating a session", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "admin@fumep.test", password: "wrong-password" })
      .expect(401);

    expect(createdSessions).toHaveLength(1);
  });

  it("rejects an invalid request", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "not-an-email", password: "password" })
      .expect(400);
  });

  it("returns the current user without exposing session internals", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/auth/session")
      .set("Cookie", "fumep_session=test-session-id")
      .expect(200);

    expect(response.body).toEqual({
      authenticated: true,
      user: {
        id: "11111111-1111-4111-8111-111111111111",
        role: "ADMIN",
        institutionIds: [],
      },
    });
    expect(JSON.stringify(response.body)).not.toContain("test-session-id");
    expect(JSON.stringify(response.body)).not.toContain("absoluteExpiresAt");
  });

  it("rejects a missing or unknown session", async () => {
    await request(app.getHttpServer()).get("/api/v1/auth/session").expect(401);
    await request(app.getHttpServer())
      .get("/api/v1/auth/session")
      .set("Cookie", "fumep_session=unknown")
      .expect(401);
  });
});
