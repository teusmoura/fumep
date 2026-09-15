import {
  Controller,
  Get,
  type INestApplication,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, it } from "vitest";

import type { SessionData } from "../src/auth/auth.contracts.js";
import { AuthService } from "../src/auth/auth.service.js";
import { RoleGuard } from "../src/auth/role.guard.js";
import { Roles } from "../src/auth/roles.decorator.js";
import { SessionGuard } from "../src/auth/session.guard.js";

@Controller("role-probe")
class RoleProbeController {
  @Get("admin")
  @UseGuards(SessionGuard, RoleGuard)
  @Roles("ADMIN")
  adminOnly() {
    return { allowed: true };
  }
}

describe("RoleGuard", () => {
  let app: INestApplication;
  const baseSession = {
    institutionIds: [],
    csrfToken: "a".repeat(43),
    createdAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    absoluteExpiresAt: new Date(Date.now() + 60_000).toISOString(),
  };
  const sessions = new Map<string, SessionData>([
    [
      "admin-session",
      {
        ...baseSession,
        userId: "11111111-1111-4111-8111-111111111111",
        role: "ADMIN",
      },
    ],
    [
      "editor-session",
      {
        ...baseSession,
        userId: "22222222-2222-4222-8222-222222222222",
        role: "EDITOR",
      },
    ],
  ]);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [RoleProbeController],
      providers: [
        SessionGuard,
        RoleGuard,
        {
          provide: AuthService,
          useValue: {
            getSession: async (sessionId: string | undefined) => {
              const session = sessionId ? sessions.get(sessionId) : undefined;
              if (!session) throw new UnauthorizedException("Authentication required");
              return session;
            },
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
  });

  afterAll(async () => app.close());

  it("allows an authenticated user with the declared role", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/role-probe/admin")
      .set("Cookie", "fumep_session=admin-session")
      .expect(200)
      .expect({ allowed: true });
  });

  it("rejects a different authenticated role", async () => {
    await request(app.getHttpServer())
      .get("/api/v1/role-probe/admin")
      .set("Cookie", "fumep_session=editor-session")
      .expect(403);
  });
});
