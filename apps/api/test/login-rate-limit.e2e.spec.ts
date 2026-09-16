import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { AUTH_USER_REPOSITORY, LOGIN_ATTEMPT_STORE } from "../src/auth/auth.contracts.js";
import { AuthModule } from "../src/auth/auth.module.js";

describe("login rate limiting HTTP contract", () => {
  let app: INestApplication;
  let calls: { ip: string; email?: string }[] = [];
  let lookups = 0;

  beforeEach(() => {
    calls = [];
    lookups = 0;
  });
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AuthModule] })
      .overrideProvider(LOGIN_ATTEMPT_STORE)
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
          return undefined;
        },
      })
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
  });
  afterAll(async () => app.close());

  it("rejects the sixth attempt before checking credentials and ignores spoofed forwarded IPs", async () => {
    for (let index = 0; index < 5; index++) {
      await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .set("X-Forwarded-For", `192.0.2.${index}`)
        .send({ email: "  ADMIN@FUMEP.TEST  ", password: "wrong-password" })
        .expect(401);
    }
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "admin@fumep.test", password: "wrong-password" })
      .expect(429);
    expect(response.headers["retry-after"]).toBe("60");
    expect(response.headers["set-cookie"]).toBeUndefined();
    expect(lookups).toBe(5);
    expect(new Set(calls.map(({ ip }) => ip)).size).toBe(1);
    expect(calls.every(({ email }) => email === "admin@fumep.test")).toBe(true);
  });

  it("counts invalid payloads against the IP limit", async () => {
    for (let index = 0; index < 5; index++) {
      await request(app.getHttpServer()).post("/api/v1/auth/login").send({}).expect(400);
    }
    await request(app.getHttpServer()).post("/api/v1/auth/login").send({}).expect(429);
    expect(calls.every(({ email }) => email === undefined)).toBe(true);
    expect(lookups).toBe(0);
  });
});
