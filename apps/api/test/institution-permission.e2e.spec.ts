import {
  Controller,
  Get,
  type INestApplication,
  Param,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, it } from "vitest";

import type { SessionData } from "../src/auth/auth.contracts.js";
import { AuthService } from "../src/auth/auth.service.js";
import { InstitutionParam } from "../src/auth/institution-param.decorator.js";
import { InstitutionGuard } from "../src/auth/institution.guard.js";
import { RoleGuard } from "../src/auth/role.guard.js";
import { Roles } from "../src/auth/roles.decorator.js";
import { SessionGuard } from "../src/auth/session.guard.js";

const ETMSL_ID = "11111111-1111-4111-8111-111111111111";
const CRAMAM_ID = "22222222-2222-4222-8222-222222222222";

@Controller("institution-probe")
class InstitutionProbeController {
  @Get(":institutionId")
  @UseGuards(SessionGuard, RoleGuard, InstitutionGuard)
  @Roles("ADMIN", "EDITOR")
  @InstitutionParam()
  read(@Param("institutionId") institutionId: string) {
    return { institutionId };
  }
}

describe("simple institutional permissions", () => {
  let app: INestApplication;
  const now = new Date().toISOString();
  const editorSession: SessionData = {
    userId: "33333333-3333-4333-8333-333333333333",
    role: "EDITOR",
    institutionIds: [ETMSL_ID],
    createdAt: now,
    lastActivityAt: now,
    absoluteExpiresAt: new Date(Date.now() + 60_000).toISOString(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [InstitutionProbeController],
      providers: [
        SessionGuard,
        RoleGuard,
        InstitutionGuard,
        {
          provide: AuthService,
          useValue: {
            getSession: async (sessionId: string | undefined) => {
              if (sessionId !== "etmsl-editor-session") {
                throw new UnauthorizedException("Authentication required");
              }
              return editorSession;
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

  it("allows an ETMSL editor to access ETMSL", async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/institution-probe/${ETMSL_ID}`)
      .set("Cookie", "fumep_session=etmsl-editor-session")
      .expect(200)
      .expect({ institutionId: ETMSL_ID });
  });

  it("rejects an ETMSL editor trying to access CRAMAM", async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/institution-probe/${CRAMAM_ID}`)
      .set("Cookie", "fumep_session=etmsl-editor-session")
      .expect(403);
  });
});
