import { resolve } from "node:path";
import { UnauthorizedException, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { createDatabase } from "@fumep/db";
import { config } from "dotenv";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuthService } from "../src/auth/auth.service.js";
import { SESSION_CONFIG } from "../src/auth/auth.contracts.js";
import { InstitutionModule } from "../src/institutions/institution.module.js";

config({ path: resolve(import.meta.dirname, "../../../.env"), quiet: true });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const { client } = createDatabase(process.env.DATABASE_URL);

describe("Institution administrative CRUD", () => {
  let app: INestApplication;
  const ids: string[] = [];
  const csrf = "a".repeat(43);
  const origin = "http://localhost:3000";
  const mutate = (method: "post" | "patch" | "delete", path: string) =>
    request(app.getHttpServer())
      [method](path)
      .set("Cookie", "fumep_session=admin")
      .set("Origin", origin)
      .set("X-CSRF-Token", csrf);
  beforeAll(async () => {
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
            userId: crypto.randomUUID(),
            role: id === "admin" ? "ADMIN" : "EDITOR",
            institutionIds: [],
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
    for (const id of ids) await client`DELETE FROM institutions WHERE id = ${id}`;
    await client.end();
  });
  it("supports create, list, read, update and delete for ADMIN", async () => {
    const slug = `fixture-${crypto.randomUUID()}`;
    const created = await mutate("post", "/api/v1/institutions")
      .send({ name: " Fixture ", slug })
      .expect(201);
    const id = created.body.id;
    ids.push(id);
    expect(created.body).toMatchObject({ name: "Fixture", slug, isActive: true });
    const list = await request(app.getHttpServer())
      .get("/api/v1/institutions")
      .set("Cookie", "fumep_session=admin")
      .expect(200);
    expect(list.body).toEqual(expect.arrayContaining([expect.objectContaining({ id })]));
    await request(app.getHttpServer())
      .get(`/api/v1/institutions/${id}`)
      .set("Cookie", "fumep_session=admin")
      .expect(200);
    const updated = await mutate("patch", `/api/v1/institutions/${id}`)
      .send({ name: "Updated", isActive: false })
      .expect(200);
    expect(updated.body).toMatchObject({ name: "Updated", isActive: false });
    await mutate("delete", `/api/v1/institutions/${id}`).expect(204);
    await request(app.getHttpServer())
      .get(`/api/v1/institutions/${id}`)
      .set("Cookie", "fumep_session=admin")
      .expect(404);
  });
  it("requires authentication and ADMIN on every route", async () => {
    for (const [method, path] of [
      ["get", ""],
      ["get", `/${crypto.randomUUID()}`],
      ["post", ""],
      ["patch", `/${crypto.randomUUID()}`],
      ["delete", `/${crypto.randomUUID()}`],
    ] as const) {
      await request(app.getHttpServer())[method](`/api/v1/institutions${path}`).expect(401);
      await request(app.getHttpServer())
        [method](`/api/v1/institutions${path}`)
        .set("Cookie", "fumep_session=editor")
        .expect(403);
    }
  });
  it("requires CSRF on mutations", async () => {
    for (const method of ["post", "patch", "delete"] as const) {
      const path = `/api/v1/institutions${method === "post" ? "" : `/${crypto.randomUUID()}`}`;
      await request(app.getHttpServer())
        [method](path)
        .set("Cookie", "fumep_session=admin")
        .expect(403);
      await request(app.getHttpServer())
        [method](path)
        .set("Cookie", "fumep_session=admin")
        .set("Origin", "https://untrusted.test")
        .set("X-CSRF-Token", csrf)
        .expect(403);
    }
  });
  it("rejects strict invalid inputs, empty updates and invalid UUIDs", async () => {
    for (const body of [
      { name: "", slug: "valid" },
      { name: "Valid", slug: "Invalid Slug" },
      { name: "Valid", slug: "valid", extra: true },
      { name: "Valid", slug: "valid", isActive: "true" },
      { name: "a".repeat(151), slug: "valid" },
    ])
      await mutate("post", "/api/v1/institutions").send(body).expect(400);
    await mutate("patch", `/api/v1/institutions/${crypto.randomUUID()}`).send({}).expect(400);
    await request(app.getHttpServer())
      .get("/api/v1/institutions/invalid")
      .set("Cookie", "fumep_session=admin")
      .expect(400);
    await mutate("patch", `/api/v1/institutions/${crypto.randomUUID()}`)
      .send({ name: "Absent" })
      .expect(404);
    await mutate("delete", `/api/v1/institutions/${crypto.randomUUID()}`).expect(404);
  });
  it("maps unique slug and dependency violations to safe conflicts", async () => {
    const slug = `fixture-${crypto.randomUUID()}`;
    const created = await mutate("post", "/api/v1/institutions")
      .send({ name: "Conflict fixture", slug })
      .expect(201);
    ids.push(created.body.id);
    const duplicate = await mutate("post", "/api/v1/institutions")
      .send({ name: "Duplicate", slug })
      .expect(409);
    expect(duplicate.body.message).toBe("Institution slug already exists");
    const [user] =
      await client`INSERT INTO users (name, email, password_hash, role) VALUES ('Dependency fixture', ${`${crypto.randomUUID()}@fumep.test`}, 'fixture-hash', 'EDITOR') RETURNING id`;
    try {
      await client`INSERT INTO user_institutions (user_id, institution_id) VALUES (${user.id}, ${created.body.id})`;
      const conflict = await mutate("delete", `/api/v1/institutions/${created.body.id}`).expect(
        409,
      );
      expect(conflict.body.message).toBe("Institution has dependencies");
    } finally {
      await client`DELETE FROM users WHERE id = ${user.id}`;
    }
  });
  it("documents all five REST operations", () => {
    const doc = SwaggerModule.createDocument(app, new DocumentBuilder().build());
    expect(doc.paths["/api/v1/institutions"]?.get).toBeDefined();
    expect(doc.paths["/api/v1/institutions"]?.post).toBeDefined();
    for (const method of ["get", "patch", "delete"] as const)
      expect(doc.paths["/api/v1/institutions/{id}"]?.[method]).toBeDefined();
  });

  it("persists settings and validates safe links, appearance and access", async () => {
    const created = await mutate("post", "/api/v1/institutions")
      .send({ name: "Settings fixture", slug: `fixture-${crypto.randomUUID()}` })
      .expect(201);
    const id = created.body.id;
    ids.push(id);
    const path = `/api/v1/institutions/${id}/settings`;
    await request(app.getHttpServer()).get(path).set("Cookie", "fumep_session=admin").expect(404);
    const updated = await mutate("patch", path)
      .send({
        email: "contact@fumep.test",
        phone: "123",
        address: "Address",
        socialLinks: [{ label: "Social", url: "https://example.test" }],
        footerLinks: [],
        appearanceDefault: "DARK",
      })
      .expect(200);
    expect(updated.body).toMatchObject({ email: "contact@fumep.test", appearanceDefault: "DARK" });
    expect(updated.body.contactEmail).toBeUndefined();
    const read = await request(app.getHttpServer())
      .get(path)
      .set("Cookie", "fumep_session=admin")
      .expect(200);
    expect(read.body).toEqual(updated.body);
    for (const body of [
      { appearanceDefault: "INVALID" },
      { email: "invalid" },
      { socialLinks: [{ label: "Unsafe", url: "javascript:alert(1)" }] },
      { footerLinks: [{ label: "Unsafe", url: "https://user:password@example.test" }] },
      { extra: true },
      {},
    ])
      await mutate("patch", path).send(body).expect(400);
    await request(app.getHttpServer()).get(path).expect(401);
    await request(app.getHttpServer()).get(path).set("Cookie", "fumep_session=editor").expect(403);
    await request(app.getHttpServer())
      .patch(path)
      .set("Cookie", "fumep_session=editor")
      .send({ phone: "123" })
      .expect(403);
    await request(app.getHttpServer())
      .patch(path)
      .set("Cookie", "fumep_session=admin")
      .send({ phone: "123" })
      .expect(403);
    await mutate("patch", `/api/v1/institutions/${crypto.randomUUID()}/settings`)
      .send({ phone: "123" })
      .expect(404);
    await mutate("patch", path).send({ email: null, appearanceDefault: "LIGHT" }).expect(200);
  });

  it("configures controlled theme colors only for ADMIN and rejects insufficient contrast", async () => {
    const created = await mutate("post", "/api/v1/institutions")
      .send({ name: "Theme fixture", slug: `fixture-${crypto.randomUUID()}` })
      .expect(201);
    const id = created.body.id;
    ids.push(id);
    const path = `/api/v1/institutions/${id}/theme`;
    const theme = {
      primary: "#123456",
      primaryForeground: "#ffffff",
      accent: "#000000",
      accentForeground: "#ffffff",
    };
    const updated = await mutate("patch", path).send(theme).expect(200);
    expect(updated.body).toMatchObject(theme);
    const read = await request(app.getHttpServer())
      .get(`/api/v1/institutions/${id}`)
      .set("Cookie", "fumep_session=admin")
      .expect(200);
    expect(read.body).toMatchObject(theme);
    await mutate("patch", path)
      .send({ ...theme, primary: "#ffffff" })
      .expect(400);
    await mutate("patch", path)
      .send({ ...theme, css: "arbitrary" })
      .expect(400);
    await request(app.getHttpServer()).patch(path).send(theme).expect(401);
    await request(app.getHttpServer())
      .patch(path)
      .set("Cookie", "fumep_session=editor")
      .send(theme)
      .expect(403);
    await request(app.getHttpServer())
      .patch(path)
      .set("Cookie", "fumep_session=admin")
      .send(theme)
      .expect(403);
  });

  it("publishes only active institution theme fields, uses SYSTEM and never opens CRUD", async () => {
    const slug = `fixture-${crypto.randomUUID()}`;
    const created = await mutate("post", "/api/v1/institutions")
      .send({ name: "Private administrative name", slug })
      .expect(201);
    const id = created.body.id;
    ids.push(id);
    const path = `/api/v1/public/institutions/${slug}/theme`;
    const first = await request(app.getHttpServer()).get(path).expect(200);
    expect(Object.keys(first.body).sort()).toEqual(
      [
        "id",
        "slug",
        "primary",
        "primaryForeground",
        "accent",
        "accentForeground",
        "appearanceDefault",
      ].sort(),
    );
    expect(first.body.appearanceDefault).toBe("SYSTEM");
    await mutate("patch", `/api/v1/institutions/${id}/settings`)
      .send({ email: "private@fumep.test", address: "Private address", appearanceDefault: "DARK" })
      .expect(200);
    const read = await request(app.getHttpServer()).get(path).expect(200);
    expect(read.body.appearanceDefault).toBe("DARK");
    expect(JSON.stringify(read.body)).not.toContain("Private");
    expect(JSON.stringify(read.body)).not.toContain("private@fumep.test");
    await request(app.getHttpServer()).get(`/api/v1/institutions/${id}`).expect(401);
    await request(app.getHttpServer()).patch(path).send({ appearanceDefault: "LIGHT" }).expect(404);
    await mutate("patch", `/api/v1/institutions/${id}`).send({ isActive: false }).expect(200);
    const inactive = await request(app.getHttpServer()).get(path).expect(404);
    const missing = await request(app.getHttpServer())
      .get(`/api/v1/public/institutions/missing-${crypto.randomUUID()}/theme`)
      .expect(404);
    expect(inactive.body).toEqual(missing.body);
    await request(app.getHttpServer())
      .get("/api/v1/public/institutions/Invalid%20Slug/theme")
      .expect(400);
    const doc = SwaggerModule.createDocument(app, new DocumentBuilder().build());
    expect(doc.paths["/api/v1/public/institutions/{slug}/theme"]?.get?.security).toBeUndefined();
  });
});
