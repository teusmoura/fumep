import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { AUTH_USER_REPOSITORY, FORGOT_PASSWORD_ATTEMPT_STORE } from "../src/auth/auth.contracts.js";
import { AuthModule } from "../src/auth/auth.module.js";

describe("POST /api/v1/auth/forgot-password", () => {
  let app: INestApplication;
  let calls: { ip: string; email?: string }[] = [];
  let lookups = 0;
  beforeEach(() => {
    calls = [];
    lookups = 0;
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AuthModule] })
      .overrideProvider(FORGOT_PASSWORD_ATTEMPT_STORE)
      .useValue({
        consume: async (ip: string, email?: string) => {
          calls.push({ ip, email });
          return calls.length <= 5;
        },
      })
      .overrideProvider(AUTH_USER_REPOSITORY)
      .useValue({
        findActiveByEmail: async () => {
          lookups++;
          throw new Error("Account lookup must not be used in the initial neutral request");
        },
      })
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
  });
  afterAll(async () => app.close());

  it("returns a neutral response for any valid email without sessions or account enumeration", async () => {
    const existing = await request(app.getHttpServer())
      .post("/api/v1/auth/forgot-password")
      .send({ email: "  ADMIN@FUMEP.TEST  " })
      .expect(200);
    const missing = await request(app.getHttpServer())
      .post("/api/v1/auth/forgot-password")
      .send({ email: "missing@fumep.test" })
      .expect(200);
    expect(existing.body).toEqual(missing.body);
    expect(existing.body).toEqual({
      message:
        "Se existir uma conta associada a esse e-mail, enviaremos as instruções para redefinição da senha.",
    });
    expect(existing.headers["set-cookie"]).toBeUndefined();
    expect(calls[0]?.email).toBe("admin@fumep.test");
    expect(lookups).toBe(0);
  });

  it("returns 429 after five requests", async () => {
    for (let index = 0; index < 5; index++)
      await request(app.getHttpServer())
        .post("/api/v1/auth/forgot-password")
        .send({ email: "editor@fumep.test" })
        .expect(200);
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/forgot-password")
      .send({ email: "editor@fumep.test" })
      .expect(429);
    expect(response.headers["retry-after"]).toBe("3600");
  });

  it("rejects invalid input while consuming the IP limit", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/forgot-password")
      .send({ email: "invalid" })
      .expect(400);
    await request(app.getHttpServer())
      .post("/api/v1/auth/forgot-password")
      .send({ email: "admin@fumep.test", role: "ADMIN" })
      .expect(400);
    expect(calls.every(({ email }) => email === undefined)).toBe(true);
  });
});
