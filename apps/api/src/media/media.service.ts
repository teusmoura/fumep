import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  createMediaCategorySchema,
  mediaUploadFieldsSchema,
  mediaUploadResponseSchema,
  pdfUploadResponseSchema,
  mediaDuplicateResponseSchema,
  mediaSelectionRequestSchema,
  mediaSelectionResponseSchema,
  mediaProcessingResponseSchema,
  type SessionData,
} from "@fumep/validation";
import type { Media } from "@fumep/db";
import { MediaStore } from "./media.store.js";
import { MediaStorage } from "./media.storage.js";
import { validateImage } from "./image-validation.js";
import { validatePdf } from "./pdf-validation.js";
import { mediaChecksum } from "./media-checksum.js";
import { MediaQueueProvider } from "./media-queue.provider.js";

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  constructor(
    private readonly store: MediaStore,
    private readonly storage: MediaStorage,
    private readonly jobs: MediaQueueProvider,
  ) {}
  private authorize(session: SessionData, institutionId: string | null) {
    if (
      session.role !== "ADMIN" &&
      (!institutionId || !session.institutionIds.includes(institutionId))
    )
      throw new ForbiddenException("Instituição não autorizada");
  }
  async categories(session: SessionData) {
    const categories = await this.store.categories(
      session.role === "ADMIN" ? undefined : session.institutionIds,
    );
    return categories.map(({ id, name, institutionId }) => ({ id, name, institutionId }));
  }
  async createCategory(session: SessionData, body: unknown) {
    const parsed = createMediaCategorySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("Categoria inválida");
    this.authorize(session, parsed.data.institutionId);
    if (parsed.data.institutionId && !(await this.store.institution(parsed.data.institutionId)))
      throw new NotFoundException("Instituição inexistente");
    try {
      return await this.store.createCategory(parsed.data, session.userId);
    } catch {
      throw new BadRequestException("Não foi possível criar categoria; verifique o slug");
    }
  }
  async upload(
    session: SessionData,
    fields: unknown,
    file?: Express.Multer.File,
    type: "IMAGE" | "DOCUMENT" = "IMAGE",
  ) {
    const parsed = mediaUploadFieldsSchema.safeParse(fields);
    if (!parsed.success) throw new BadRequestException("Campos de upload inválidos");
    const categoryId = parsed.data.categoryId ?? null;
    const category = categoryId ? await this.store.category(categoryId) : undefined;
    if (categoryId && !category) throw new NotFoundException("Categoria inexistente");
    this.authorize(session, category?.institutionId ?? null);
    const extension = type === "IMAGE" ? validateImage(file) : validatePdf(file);
    const image = file!;
    const checksumSha256 = mediaChecksum(image.buffer);
    if (!parsed.data.uploadAnyway) {
      const existing = await this.store.duplicate(
        checksumSha256,
        session.role === "ADMIN" ? undefined : session.institutionIds,
        type,
      );
      if (existing) {
        await this.store.recordDuplicate(session.userId, existing.id);
        return mediaDuplicateResponseSchema.parse({
          duplicate: true,
          existing: this.selection(existing),
        });
      }
    }
    const id = randomUUID();
    const storedFilename = `${id}${extension}`;
    const key = `${type === "IMAGE" ? "images/originals" : "documents"}/${storedFilename}`;
    const processingStatus = type === "IMAGE" ? "PENDING" : "READY";
    const response = (type === "IMAGE" ? mediaUploadResponseSchema : pdfUploadResponseSchema).parse(
      {
        id,
        originalFilename: image.originalname,
        mimeType: image.mimetype,
        sizeBytes: image.buffer.length,
        categoryId,
        processingStatus,
      },
    );
    try {
      await this.storage.put(key, image.buffer, image.mimetype);
      await this.store.create({
        id,
        type,
        processingStatus,
        categoryId,
        originalFilename: image.originalname,
        storedFilename,
        mimeType: image.mimetype,
        sizeBytes: BigInt(image.buffer.length),
        storageKey: key,
        checksumSha256,
        uploadedBy: session.userId,
      });
    } catch {
      try {
        await this.storage.remove(key);
      } catch {
        this.logger.error(`Upload compensation failed for media ${id}`);
      }
      throw new ServiceUnavailableException("Não foi possível salvar o arquivo. Tente novamente.");
    }
    // Derived enqueue failure must never compensate persisted Media.
    if (type === "IMAGE")
      try {
        await this.jobs.producer.enqueue(id);
      } catch {
        this.logger.error(JSON.stringify({ event: "media_enqueue_failed", media_id: id }));
      }
    return response;
  }
  private selection(media: Media) {
    return mediaSelectionResponseSchema.parse({
      id: media.id,
      originalFilename: media.originalFilename,
      mimeType: media.mimeType,
      sizeBytes: Number(media.sizeBytes),
      categoryId: media.categoryId,
      processingStatus: media.processingStatus,
    });
  }
  async select(session: SessionData, body: unknown) {
    const parsed = mediaSelectionRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("Seleção inválida");
    const media = await this.store.media(parsed.data.id);
    if (
      !media ||
      !(
        media.type === "IMAGE" ||
        (media.type === "DOCUMENT" && media.mimeType === "application/pdf")
      )
    )
      throw new NotFoundException("Mídia inexistente");
    const category = media.categoryId ? await this.store.category(media.categoryId) : undefined;
    this.authorize(session, category?.institutionId ?? null);
    return this.selection(media);
  }
  async processing(session: SessionData, id: string) {
    if (!mediaSelectionRequestSchema.safeParse({ id }).success)
      throw new BadRequestException("Mídia inválida");
    const media = await this.store.media(id);
    if (!media || media.type !== "IMAGE") throw new NotFoundException("Mídia inexistente");
    const category = media.categoryId ? await this.store.category(media.categoryId) : undefined;
    this.authorize(session, category?.institutionId ?? null);
    return mediaProcessingResponseSchema.parse({
      id: media.id,
      processingStatus: media.processingStatus,
      width: media.width,
      height: media.height,
      error: media.processingStatus === "FAILED" ? "Falha no processamento da imagem" : null,
    });
  }
}
