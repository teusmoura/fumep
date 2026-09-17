import { resolve } from "node:path";
import { config } from "dotenv";
import { UnauthorizedException, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { createDatabase, InstitutionRepository } from "@fumep/db";
import { MediaStorage } from "@fumep/storage";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuthService } from "../src/auth/auth.service.js";
import { SESSION_CONFIG } from "../src/auth/auth.contracts.js";
import { InstitutionModule } from "../src/institutions/institution.module.js";
config({ path: resolve(import.meta.dirname, "../../../.env"), quiet: true });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
const { db, client } = createDatabase(process.env.DATABASE_URL);
const owner = crypto.randomUUID();
const image = crypto.randomUUID();
const actor = crypto.randomUUID();
const slug = `logo-api-${owner}`;
const key = `images/originals/${image}.png`;
const csrf = "a".repeat(43);
const origin = "http://localhost:3000";
const storage = new MediaStorage();
// Actual small PNG; exercise binary delivery through MinIO, not a presigned URL.
const bytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2ioAAAAASUVORK5CYII=",
  "base64",
);
describe("Institution logo API", () => {
  let app: INestApplication;
  beforeAll(async () => {
    await client`INSERT INTO users(id,name,email,password_hash,role) VALUES (${actor},'Logo API',${`${actor}@example.test`},'test-only','ADMIN')`;
    await client`INSERT INTO institutions(id,name,slug) VALUES (${owner},'Logo API',${slug})`;
    await client`INSERT INTO media(id,type,original_filename,stored_filename,mime_type,size_bytes,storage_key,checksum_sha256,processing_status) VALUES (${image},'IMAGE','logo.png',${`${image}.png`},'image/png',${bytes.length},${key},${"a".repeat(64)},'READY')`;
    await storage.put(key, bytes, "image/png");
    const moduleRef = await Test.createTestingModule({ imports: [InstitutionModule] })
      .overrideProvider(SESSION_CONFIG)
      .useValue({
        inactivitySeconds: 1800,
        absoluteSeconds: 28800,
        secureCookie: false,
        appOrigin: origin,
      })
      .overrideProvider(AuthService)
      .useValue({
        getSession: async (id: string) => {
          if (!["admin", "editor"].includes(id)) throw new UnauthorizedException();
          return {
            userId: actor,
            role: id === "admin" ? "ADMIN" : "EDITOR",
            institutionIds: [owner],
            csrfToken: csrf,
          };
        },
      })
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
    await new InstitutionRepository(db).delete(owner);
    await client`DELETE FROM audit_logs WHERE entity_type='INSTITUTION' AND entity_id=${owner}`;
    await client`DELETE FROM media WHERE id=${image}`;
    await client`DELETE FROM users WHERE id=${actor}`;
    await storage.remove(key);
    await client.end();
  });
  const patch = (id: string = owner) =>
    request(app.getHttpServer())
      .patch(`/api/v1/institutions/${id}/logos`)
      .set("Cookie", "fumep_session=admin")
      .set("Origin", origin)
      .set("X-CSRF-Token", csrf);
  it("requires session/ADMIN/CSRF, rejects invalid IDs and strict bodies", async () => {
    for (const method of ["get", "patch"] as const) {
      await request(app.getHttpServer())[method](`/api/v1/institutions/${owner}/logos`).expect(401);
      await request(app.getHttpServer())
        [method](`/api/v1/institutions/${owner}/logos`)
        .set("Cookie", "fumep_session=editor")
        .expect(403);
    }
    await request(app.getHttpServer())
      .patch(`/api/v1/institutions/${owner}/logos`)
      .set("Cookie", "fumep_session=admin")
      .send({ logoLightId: image })
      .expect(403);
    for (const body of [
      {},
      { logoLightId: "http://minio:9000/logo" },
      { logoLightId: image, storageKey: key },
    ])
      await patch().send(body).expect(400);
    await patch("bad").send({ logoLightId: image }).expect(400);
    await patch(crypto.randomUUID()).send({ logoLightId: image }).expect(404);
    await patch().send({ logoLightId: crypto.randomUUID() }).expect(400);
  });
  it("selects existing images, updates usages idempotently and exposes only same-origin paths", async () => {
    expect((await patch().send({ logoLightId: image, logoDarkId: null }).expect(200)).body).toEqual(
      { id: owner, logoLightId: image, logoDarkId: null },
    );
    const usages =
      await client`SELECT * FROM media_usages WHERE entity_type='INSTITUTION' AND entity_id=${owner}`;
    expect(usages).toHaveLength(1);
    await patch().send({ logoLightId: image }).expect(200);
    expect(
      await client`SELECT * FROM media_usages WHERE entity_type='INSTITUTION' AND entity_id=${owner}`,
    ).toEqual(usages);
    expect(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/institutions/${owner}/logos`)
          .set("Cookie", "fumep_session=admin")
          .expect(200)
      ).body,
    ).toEqual({ id: owner, logoLightId: image, logoDarkId: null });
    const theme = (
      await request(app.getHttpServer())
        .get(`/api/v1/public/institutions/${slug}/theme`)
        .expect(200)
    ).body;
    expect(theme.logoLightUrl).toBe(`/media/institutions/${slug}/logo/light`);
    expect(theme.logoDarkUrl).toBeUndefined();
    expect(JSON.stringify(theme)).not.toContain(key);
    expect(JSON.stringify(theme)).not.toContain("minio");
    await expect(client`DELETE FROM media WHERE id=${image}`).rejects.toThrow();
  });
  it("serves real image bytes publicly and dark falls back to light; inactive/unselected stays private", async () => {
    for (const appearance of ["light", "dark"]) {
      const result = await request(app.getHttpServer())
        .get(`/api/v1/public/institutions/${slug}/logo/${appearance}`)
        .expect(200);
      expect(result.headers["content-type"]).toContain("image/png");
      expect(result.headers["x-content-type-options"]).toBe("nosniff");
      expect(result.headers["cache-control"]).toBe("no-store");
      expect(result.body).toEqual(bytes);
    }
    await request(app.getHttpServer())
      .get(`/api/v1/public/institutions/${slug}/logo/system`)
      .expect(400);
    await client`UPDATE institutions SET is_active=false WHERE id=${owner}`;
    await request(app.getHttpServer())
      .get(`/api/v1/public/institutions/${slug}/logo/light`)
      .expect(404);
    await client`UPDATE institutions SET is_active=true WHERE id=${owner}`;
    await patch().send({ logoLightId: null }).expect(200);
    await request(app.getHttpServer())
      .get(`/api/v1/public/institutions/${slug}/logo/light`)
      .expect(404);
    expect(await client`SELECT id FROM media_usages WHERE entity_id=${owner}`).toHaveLength(0);
  });
  it("documents administration and binary public delivery in OpenAPI", () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addCookieAuth("fumep_session").build(),
    );
    expect(
      document.paths["/api/v1/institutions/{id}/logos"]?.patch?.responses["200"],
    ).toBeDefined();
    expect(
      document.paths["/api/v1/public/institutions/{slug}/logo/{appearance}"]?.get?.responses["200"],
    ).toBeDefined();
  });
});
