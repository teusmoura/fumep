import { resolve } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { UnauthorizedException, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { createDatabase } from "@fumep/db";
import { IMAGE_MAX_BYTES } from "@fumep/validation";
import { config } from "dotenv";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { AuthService } from "../src/auth/auth.service.js";
import { SESSION_CONFIG } from "../src/auth/auth.contracts.js";
import { MediaModule } from "../src/media/media.module.js";
import { MediaStore } from "../src/media/media.store.js";
import { MediaStorage } from "../src/media/media.storage.js";
import { MediaQueueProvider } from "../src/media/media-queue.provider.js";

config({ path: resolve(import.meta.dirname, "../../../.env"), quiet: true });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
const { client } = createDatabase(process.env.DATABASE_URL);
const userId = randomUUID();
const own = randomUUID();
const other = randomUUID();
const categoryIds: string[] = [];
const keys: string[] = [];
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK1sAAAAASUVORK5CYII=",
  "base64",
);
const csrf = "a".repeat(43);
const origin = "http://localhost:3000";
const enqueue = vi.fn<(id: string) => Promise<void>>(async () => undefined);
describe("Image upload through NestJS to real MinIO/PostgreSQL", () => {
  let app: INestApplication;
  let storage: MediaStorage;
  let store: MediaStore;
  const mutate = (path: string, role = "admin") => {
    const operation = request(app.getHttpServer())
      .post(`/api/v1/media/${path}`)
      .set("Cookie", `fumep_session=${role}`)
      .set("Origin", origin)
      .set("X-CSRF-Token", csrf);
    return path === "images" ? operation.field("uploadAnyway", "true") : operation;
  };
  beforeAll(async () => {
    await client`INSERT INTO users (id,name,email,password_hash,role) VALUES (${userId},'Media fixture',${`${userId}@fixture.test`},'unused','ADMIN')`;
    for (const id of [own, other])
      await client`INSERT INTO institutions (id,name,slug) VALUES (${id},'Media fixture',${`media-${id}`})`;
    const moduleRef = await Test.createTestingModule({ imports: [MediaModule] })
      .overrideProvider(MediaQueueProvider)
      .useValue({ producer: { enqueue } })
      .overrideProvider(SESSION_CONFIG)
      .useValue({
        appOrigin: origin,
        secureCookie: false,
        inactivitySeconds: 1800,
        absoluteSeconds: 28800,
      })
      .overrideProvider(AuthService)
      .useValue({
        getSession: async (id: string) => {
          if (!["admin", "editor"].includes(id)) throw new UnauthorizedException();
          return {
            userId,
            role: id === "admin" ? "ADMIN" : "EDITOR",
            institutionIds: [own],
            csrfToken: csrf,
          };
        },
      })
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
    storage = moduleRef.get(MediaStorage);
    store = moduleRef.get(MediaStore);
    for (const institutionId of [own, other, null]) {
      const category = await mutate("upload-categories")
        .send({ institutionId, name: institutionId ?? "Global", slug: `fixture-${randomUUID()}` })
        .expect(201);
      categoryIds.push(category.body.id);
    }
  });
  afterAll(async () => {
    vi.restoreAllMocks();
    for (const key of keys) await storage?.remove(key);
    await client`DELETE FROM audit_logs WHERE user_id = ${userId}`;
    await client`DELETE FROM media WHERE uploaded_by = ${userId}`;
    await client`DELETE FROM media_categories WHERE created_by = ${userId}`;
    for (const id of [own, other]) await client`DELETE FROM institutions WHERE id = ${id}`;
    await client`DELETE FROM users WHERE id = ${userId}`;
    await app?.close();
    await client.end();
  });
  it("stores identical original bytes, safe names, checksum, category and audit", async () => {
    const response = await mutate("images", "editor")
      .field("categoryId", categoryIds[0])
      .attach("file", png, { filename: "laboratorio.PNG", contentType: "image/png" })
      .expect(201);
    expect(response.body).toMatchObject({
      originalFilename: "laboratorio.PNG",
      sizeBytes: png.length,
      categoryId: categoryIds[0],
      processingStatus: "PENDING",
    });
    expect(Object.keys(response.body).sort()).toEqual([
      "categoryId",
      "id",
      "mimeType",
      "originalFilename",
      "processingStatus",
      "sizeBytes",
    ]);
    const [row] = await client`SELECT * FROM media WHERE id = ${response.body.id}`;
    expect(enqueue).toHaveBeenCalledWith(response.body.id);
    keys.push(row.storage_key);
    expect(row.stored_filename).toBe(`${response.body.id}.png`);
    expect(row.storage_key).toBe(`images/originals/${response.body.id}.png`);
    expect(row.checksum_sha256).toBe(createHash("sha256").update(png).digest("hex"));
    expect(row.uploaded_by).toBe(userId);
    const stream = await storage.client().getObject("portal-public", row.storage_key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    expect(Buffer.concat(chunks)).toEqual(png);
    const [audit] = await client`SELECT * FROM audit_logs WHERE entity_id = ${response.body.id}`;
    expect(audit.action).toBe("MEDIA_UPLOADED");
  });
  it("preserves persisted Media and original when derived enqueue fails", async () => {
    enqueue.mockRejectedValueOnce(new Error("fixture unavailable"));
    const response = await mutate("images")
      .attach("file", png, { filename: "redis-failure.png", contentType: "image/png" })
      .expect(201);
    const [row] = await client`SELECT * FROM media WHERE id = ${response.body.id}`;
    keys.push(row.storage_key);
    expect(row.processing_status).toBe("PENDING");
    expect((await storage.client().statObject("portal-public", row.storage_key)).size).toBe(
      png.length,
    );
  });
  it("exposes authorized processing states without leaking processing_error", async () => {
    const uploaded = await mutate("images", "editor")
      .field("categoryId", categoryIds[0])
      .attach("file", png, "status.png")
      .expect(201);
    keys.push(`images/originals/${uploaded.body.id}.png`);
    const read = (id: string, role = "editor") =>
      request(app.getHttpServer())
        .get(`/api/v1/media/${id}/processing`)
        .set("Cookie", `fumep_session=${role}`);
    for (const status of ["PENDING", "PROCESSING", "READY", "FAILED"]) {
      await client`UPDATE media SET processing_status = ${status}, processing_error = 'secret fixture' WHERE id = ${uploaded.body.id}`;
      const result = await read(uploaded.body.id).expect(200).expect("Cache-Control", "no-store");
      expect(result.body.processingStatus).toBe(status);
      expect(JSON.stringify(result.body)).not.toContain("secret");
      expect(result.body.error).toBe(
        status === "FAILED" ? "Falha no processamento da imagem" : null,
      );
    }
    await client`UPDATE media SET category_id = ${categoryIds[1]} WHERE id = ${uploaded.body.id}`;
    await read(uploaded.body.id).expect(403);
    await read(uploaded.body.id, "admin").expect(200);
    await read("invalid").expect(400);
    await read(randomUUID()).expect(404);
    await request(app.getHttpServer())
      .get(`/api/v1/media/${uploaded.body.id}/processing`)
      .expect(401);
  });
  it("allows global ADMIN and filters EDITOR category selection", async () => {
    const response = await mutate("images").attach("file", png, "fixture.png").expect(201);
    keys.push(`images/originals/${response.body.id}.png`);
    expect(response.body.categoryId).toBeNull();
    const categories = await request(app.getHttpServer())
      .get("/api/v1/media/upload-categories")
      .set("Cookie", "fumep_session=editor")
      .expect(200);
    expect(categories.body.map((item: { id: string }) => item.id)).toEqual([categoryIds[0]]);
  });
  it("blocks unauthenticated, invalid CSRF, foreign/global/uncategorized EDITOR uploads", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/media/images")
      .attach("file", png, "fixture.png")
      .expect(401);
    await request(app.getHttpServer())
      .post("/api/v1/media/images")
      .set("Cookie", "fumep_session=admin")
      .attach("file", png, "fixture.png")
      .expect(403);
    for (const categoryId of [categoryIds[1], categoryIds[2]])
      await mutate("images", "editor")
        .field("categoryId", categoryId)
        .attach("file", png, "fixture.png")
        .expect(403);
    await mutate("images", "editor").attach("file", png, "fixture.png").expect(403);
    await mutate("images")
      .field("categoryId", randomUUID())
      .attach("file", png, "fixture.png")
      .expect(404);
  });
  it("validates minimal category creation with institution scope and uniqueness", async () => {
    await mutate("upload-categories", "editor")
      .send({ institutionId: other, name: "No", slug: "no" })
      .expect(403);
    await mutate("upload-categories", "editor")
      .send({ institutionId: null, name: "No", slug: "no" })
      .expect(403);
    const body = { institutionId: own, name: "Editor category", slug: `editor-${randomUUID()}` };
    await mutate("upload-categories", "editor").send(body).expect(201);
    await mutate("upload-categories", "editor").send(body).expect(400);
  });
  it("rejects unsafe/invalid file input before storage write", async () => {
    const put = vi.spyOn(storage, "put");
    await mutate("images").expect(400);
    await mutate("images")
      .attach("file", Buffer.from("<svg/>"), { filename: "fake.png", contentType: "image/png" })
      .expect(400);
    await mutate("images")
      .attach("file", png, { filename: "fixture.svg", contentType: "image/svg+xml" })
      .expect(400);
    await mutate("images")
      .field("uploadedBy", userId)
      .attach("file", png, "fixture.png")
      .expect(400);
    expect(put).not.toHaveBeenCalled();
    put.mockRestore();
  });
  it("rejects extension/MIME/signature inconsistencies and multipart abuse without persistence", async () => {
    const put = vi.spyOn(storage, "put");
    const create = vi.spyOn(store, "create");
    const before = await client`SELECT count(*) FROM media WHERE uploaded_by = ${userId}`;
    for (const options of [
      { filename: "photo.jpg", contentType: "image/jpeg" },
      { filename: "photo.png", contentType: "image/jpeg" },
      { filename: "photo.pdf", contentType: "application/pdf" },
      { filename: "photo.png.exe", contentType: "image/png" },
    ])
      await mutate("images").attach("file", png, options).expect(400);
    await mutate("images")
      .attach("file", png.subarray(0, 7), { filename: "truncated.png", contentType: "image/png" })
      .expect(400);
    await mutate("images")
      .attach("file", png, "first.png")
      .attach("file", png, "second.png")
      .expect(400);
    await mutate("images")
      .field("categoryId", categoryIds[0])
      .field("categoryId", categoryIds[1])
      .attach("file", png, "fixture.png")
      .expect(400);
    expect(put).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(await client`SELECT count(*) FROM media WHERE uploaded_by = ${userId}`).toEqual(before);
    put.mockRestore();
    create.mockRestore();
  });
  it("accepts the inclusive multipart size boundary and rejects larger files before persistence", async () => {
    const maximum = Buffer.alloc(IMAGE_MAX_BYTES);
    png.copy(maximum);
    const result = await mutate("images").attach("file", maximum, "maximum.png").expect(201);
    keys.push(`images/originals/${result.body.id}.png`);
    expect(result.body.sizeBytes).toBe(IMAGE_MAX_BYTES);
    const put = vi.spyOn(storage, "put");
    const create = vi.spyOn(store, "create");
    const oversized = Buffer.alloc(IMAGE_MAX_BYTES + 1);
    png.copy(oversized);
    await mutate("images").attach("file", oversized, "oversized.png").expect(413);
    const parserOversized = Buffer.alloc(IMAGE_MAX_BYTES + 2);
    png.copy(parserOversized);
    await mutate("images").attach("file", parserOversized, "parser-oversized.png").expect(413);
    expect(put).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    put.mockRestore();
    create.mockRestore();
  });
  it("compensates storage when database fails, without metadata or error disclosure", async () => {
    const count = await client`SELECT count(*) FROM media WHERE uploaded_by = ${userId}`;
    const create = vi.spyOn(store, "create").mockRejectedValueOnce(new Error("secret SQL details"));
    const remove = vi.spyOn(storage, "remove");
    const response = await mutate("images").attach("file", png, "fixture.png").expect(503);
    expect(response.text).not.toContain("secret");
    expect(remove).toHaveBeenCalledOnce();
    const key = remove.mock.calls[0][0];
    await expect(storage.client().statObject("portal-public", key)).rejects.toThrow();
    expect(await client`SELECT count(*) FROM media WHERE uploaded_by = ${userId}`).toEqual(count);
    create.mockRestore();
    remove.mockRestore();
  });
  it("persists checksum by binary content, independently of original name and category", async () => {
    const uploaded: string[] = [];
    for (const [name, category] of [
      ["same-a.png", categoryIds[0]],
      ["same-b.PNG", categoryIds[1]],
    ] as const) {
      const response = await mutate("images")
        .field("categoryId", category)
        .attach("file", png, { filename: name, contentType: "image/png" })
        .expect(201);
      uploaded.push(response.body.id);
      keys.push(`images/originals/${response.body.id}.png`);
    }
    const changed = Buffer.from(png);
    changed[changed.length - 1] ^= 1;
    const response = await mutate("images").attach("file", changed, "same-a.png").expect(201);
    uploaded.push(response.body.id);
    keys.push(`images/originals/${response.body.id}.png`);
    const rows = await Promise.all(
      uploaded.map(
        async (id) => (await client`SELECT checksum_sha256 FROM media WHERE id = ${id}`)[0],
      ),
    );
    expect(uploaded[0]).not.toBe(uploaded[1]);
    expect(rows[0].checksum_sha256).toBe(rows[1].checksum_sha256);
    expect(rows[2].checksum_sha256).not.toBe(rows[0].checksum_sha256);
    expect(rows[2].checksum_sha256).toBe(createHash("sha256").update(changed).digest("hex"));
  });
  it("rejects client-supplied checksum before any storage or metadata write", async () => {
    const put = vi.spyOn(storage, "put");
    const create = vi.spyOn(store, "create");
    await mutate("images")
      .field("checksumSha256", "f".repeat(64))
      .attach("file", png, "fixture.png")
      .expect(400);
    expect(put).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    put.mockRestore();
    create.mockRestore();
  });
  it("warns before writing, selects authorized existing media or explicitly uploads another record", async () => {
    const enqueuedBefore = enqueue.mock.calls.length;
    const probe = () =>
      request(app.getHttpServer())
        .post("/api/v1/media/images")
        .set("Cookie", "fumep_session=editor")
        .set("Origin", origin)
        .set("X-CSRF-Token", csrf);
    const before = await client`SELECT count(*) FROM media WHERE uploaded_by = ${userId}`;
    const put = vi.spyOn(storage, "put");
    const create = vi.spyOn(store, "create");
    const warning = await probe()
      .field("categoryId", categoryIds[0])
      .attach("file", png, "duplicate.png")
      .expect(200);
    expect(warning.body.duplicate).toBe(true);
    expect(warning.body.existing.categoryId).toBe(categoryIds[0]);
    expect(put).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    const selected = await mutate("selection", "editor")
      .send({ id: warning.body.existing.id })
      .expect(200);
    expect(selected.body).toEqual(warning.body.existing);
    expect(enqueue.mock.calls.length).toBe(enqueuedBefore);
    expect(await client`SELECT count(*) FROM media WHERE uploaded_by = ${userId}`).toEqual(before);
    expect(put).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    const audit =
      await client`SELECT action FROM audit_logs WHERE user_id = ${userId} AND action = 'MEDIA_DUPLICATE_DETECTED' AND entity_id = ${selected.body.id}`;
    expect(audit.length).toBeGreaterThan(0);
    const uploaded = await probe()
      .field("categoryId", categoryIds[0])
      .field("uploadAnyway", "true")
      .attach("file", png, "duplicate.png")
      .expect(201);
    keys.push(`images/originals/${uploaded.body.id}.png`);
    expect(uploaded.body.id).not.toBe(selected.body.id);
    expect(put).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledOnce();
    put.mockRestore();
    create.mockRestore();
  });
  it("does not disclose or select foreign/global media for EDITOR, even when uploader is the same", async () => {
    for (const category of [categoryIds[1], null]) {
      const bytes = Buffer.concat([png, Buffer.from(`${userId}-${category ?? "global"}`)]);
      const operation = mutate("images");
      if (category) operation.field("categoryId", category);
      const foreign = await operation.attach("file", bytes, "restricted.png").expect(201);
      keys.push(`images/originals/${foreign.body.id}.png`);
      const ownUpload = await request(app.getHttpServer())
        .post("/api/v1/media/images")
        .set("Cookie", "fumep_session=editor")
        .set("Origin", origin)
        .set("X-CSRF-Token", csrf)
        .field("categoryId", categoryIds[0])
        .attach("file", bytes, "restricted.png")
        .expect(201);
      keys.push(`images/originals/${ownUpload.body.id}.png`);
      expect(ownUpload.body).not.toHaveProperty("duplicate");
      expect(ownUpload.text).not.toContain(foreign.body.id);
      await mutate("selection", "editor").send({ id: foreign.body.id }).expect(403);
      await mutate("selection").send({ id: foreign.body.id }).expect(200);
    }
  });
  it("revalidates existing media institution on selection and rejects invalid/unprotected choices", async () => {
    const existing = await store.duplicate(createHash("sha256").update(png).digest("hex"), [own]);
    expect(existing).toBeDefined();
    await client`UPDATE media_categories SET institution_id = ${other} WHERE id = ${categoryIds[0]}`;
    try {
      await mutate("selection", "editor").send({ id: existing!.id }).expect(403);
    } finally {
      await client`UPDATE media_categories SET institution_id = ${own} WHERE id = ${categoryIds[0]}`;
    }
    await mutate("selection").send({ id: "invalid" }).expect(400);
    await mutate("selection").send({ id: existing!.id, institutionId: own }).expect(400);
    await mutate("selection").send({ id: randomUUID() }).expect(404);
    await request(app.getHttpServer())
      .post("/api/v1/media/selection")
      .send({ id: existing!.id })
      .expect(401);
    await request(app.getHttpServer())
      .post("/api/v1/media/selection")
      .set("Cookie", "fumep_session=admin")
      .send({ id: existing!.id })
      .expect(403);
  });
  it("allows concurrent explicit duplicates without overwriting storage keys or records", async () => {
    const responses = await Promise.all([
      mutate("images").attach("file", png, "concurrent.png"),
      mutate("images").attach("file", png, "concurrent.png"),
    ]);
    for (const response of responses) {
      expect(response.status).toBe(201);
      keys.push(`images/originals/${response.body.id}.png`);
    }
    expect(responses[0].body.id).not.toBe(responses[1].body.id);
    for (const response of responses) {
      const object = await storage
        .client()
        .statObject("portal-public", `images/originals/${response.body.id}.png`);
      expect(object.size).toBe(png.length);
    }
  });
  it("does not create metadata on MinIO failure and documents multipart/OpenAPI", async () => {
    const put = vi
      .spyOn(storage, "put")
      .mockRejectedValueOnce(new Error("internal MinIO credentials"));
    const create = vi.spyOn(store, "create");
    await mutate("images").attach("file", png, "fixture.png").expect(503);
    expect(create).not.toHaveBeenCalled();
    put.mockRestore();
    create.mockRestore();
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addCookieAuth("fumep_session").build(),
    );
    expect(document.paths["/api/v1/media/images"].post?.requestBody).toHaveProperty(
      "content.multipart/form-data",
    );
    expect(document.paths["/api/v1/media/images"].post?.responses).toHaveProperty("413");
  });
});
