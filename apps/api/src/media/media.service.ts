import { createHash, randomUUID } from "node:crypto";
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
  type SessionData,
} from "@fumep/validation";
import { MediaStore } from "./media.store.js";
import { MediaStorage } from "./media.storage.js";
import { validateImage } from "./image-validation.js";

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  constructor(
    private readonly store: MediaStore,
    private readonly storage: MediaStorage,
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
  async upload(session: SessionData, fields: unknown, file?: Express.Multer.File) {
    const parsed = mediaUploadFieldsSchema.safeParse(fields);
    if (!parsed.success) throw new BadRequestException("Campos de upload inválidos");
    const categoryId = parsed.data.categoryId ?? null;
    const category = categoryId ? await this.store.category(categoryId) : undefined;
    if (categoryId && !category) throw new NotFoundException("Categoria inexistente");
    this.authorize(session, category?.institutionId ?? null);
    const extension = validateImage(file);
    const image = file!;
    const id = randomUUID();
    const storedFilename = `${id}${extension}`;
    const key = `images/originals/${storedFilename}`;
    const response = mediaUploadResponseSchema.parse({
      id,
      originalFilename: image.originalname,
      mimeType: image.mimetype,
      sizeBytes: image.buffer.length,
      categoryId,
      processingStatus: "PENDING",
    });
    try {
      await this.storage.put(key, image.buffer, image.mimetype);
      await this.store.create({
        id,
        type: "IMAGE",
        categoryId,
        originalFilename: image.originalname,
        storedFilename,
        mimeType: image.mimetype,
        sizeBytes: BigInt(image.buffer.length),
        storageKey: key,
        checksumSha256: createHash("sha256").update(image.buffer).digest("hex"),
        uploadedBy: session.userId,
      });
      return response;
    } catch {
      try {
        await this.storage.remove(key);
      } catch {
        this.logger.error(`Upload compensation failed for media ${id}`);
      }
      throw new ServiceUnavailableException("Não foi possível salvar a imagem. Tente novamente.");
    }
  }
}
