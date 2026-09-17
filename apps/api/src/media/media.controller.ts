import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Req,
  Res,
  HttpCode,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import type { Response } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiResponse,
} from "@nestjs/swagger";
import { IMAGE_MAX_BYTES, PDF_MAX_BYTES } from "@fumep/validation";
import { SessionGuard, type AuthenticatedRequest } from "../auth/session.guard.js";
import { CsrfGuard } from "../auth/csrf.guard.js";
import { MediaService } from "./media.service.js";

@Controller("media")
@ApiTags("media")
@ApiCookieAuth("fumep_session")
@ApiUnauthorizedResponse({ description: "Sessão obrigatória" })
@ApiForbiddenResponse({ description: "CSRF ou instituição não autorizada" })
@ApiBadRequestResponse({ description: "Entrada inválida" })
@ApiNotFoundResponse({ description: "Categoria/instituição inexistente" })
@UseGuards(SessionGuard, CsrfGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}
  @Get("upload-categories")
  @ApiOkResponse({ description: "Categorias disponíveis no escopo do usuário" })
  categories(@Req() request: AuthenticatedRequest) {
    return this.media.categories(request.auth);
  }
  @Post("upload-categories")
  @ApiBody({
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["institutionId", "name", "slug"],
      properties: {
        institutionId: { type: "string", format: "uuid", nullable: true },
        name: { type: "string", minLength: 1, maxLength: 120 },
        slug: { type: "string", maxLength: 120, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" },
      },
    },
  })
  @ApiCreatedResponse({ description: "Categoria mínima para upload criada" })
  createCategory(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.media.createCategory(request.auth, body);
  }
  @Post("images")
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["file"],
      properties: {
        file: { type: "string", format: "binary" },
        categoryId: { type: "string", format: "uuid" },
        uploadAnyway: { type: "string", enum: ["true", "false"] },
      },
    },
  })
  @ApiCreatedResponse({
    description: "Original armazenado, processamento PENDING; sem URL interna",
  })
  @ApiOkResponse({
    description: "Duplicata autorizada encontrada; escolha usar existente ou enviar assim mesmo",
    schema: {
      type: "object",
      required: ["duplicate", "existing"],
      properties: { duplicate: { type: "boolean", enum: [true] }, existing: { type: "object" } },
    },
  })
  @ApiResponse({ status: 413, description: "Imagem excede 15 MB" })
  @ApiResponse({ status: 503, description: "Falha ao salvar imagem" })
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: IMAGE_MAX_BYTES + 1, files: 1, fields: 2, parts: 4, fieldSize: 100 },
    }),
  )
  async upload(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
    @UploadedFile() file?: Express.Multer.File,
    @Res({ passthrough: true }) response?: Response,
  ) {
    const result = await this.media.upload(request.auth, body, file);
    if ("duplicate" in result) response?.status(200);
    return result;
  }
  @Post("documents")
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["file"],
      properties: {
        file: { type: "string", format: "binary" },
        categoryId: { type: "string", format: "uuid" },
        uploadAnyway: { type: "string", enum: ["true", "false"] },
      },
    },
  })
  @ApiCreatedResponse({
    description: "PDF original salvo com SHA-256, READY, sem Sharp ou URL interna",
    schema: {
      type: "object",
      additionalProperties: false,
      required: [
        "id",
        "originalFilename",
        "mimeType",
        "sizeBytes",
        "categoryId",
        "processingStatus",
      ],
      properties: {
        id: { type: "string", format: "uuid" },
        originalFilename: { type: "string" },
        mimeType: { type: "string", enum: ["application/pdf"] },
        sizeBytes: { type: "integer", minimum: 1, maximum: PDF_MAX_BYTES },
        categoryId: { type: "string", format: "uuid", nullable: true },
        processingStatus: { type: "string", enum: ["READY"] },
      },
    },
  })
  @ApiOkResponse({
    description: "PDF duplicado autorizado; usar existente ou enviar assim mesmo",
    schema: {
      type: "object",
      required: ["duplicate", "existing"],
      properties: { duplicate: { type: "boolean", enum: [true] }, existing: { type: "object" } },
    },
  })
  @ApiResponse({ status: 413, description: "PDF excede 30 MB" })
  @ApiResponse({ status: 503, description: "Falha ao salvar PDF" })
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: PDF_MAX_BYTES + 1, files: 1, fields: 2, parts: 4, fieldSize: 100 },
    }),
  )
  async uploadPdf(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
    @UploadedFile() file?: Express.Multer.File,
    @Res({ passthrough: true }) response?: Response,
  ) {
    const result = await this.media.upload(request.auth, body, file, "DOCUMENT");
    if ("duplicate" in result) response?.status(200);
    return result;
  }
  @Post("selection")
  @HttpCode(200)
  @ApiBody({
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["id"],
      properties: { id: { type: "string", format: "uuid" } },
    },
  })
  @ApiOkResponse({
    description: "Mídia autorizada selecionada, sem novo arquivo/registro ou vínculo de uso",
  })
  select(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.media.select(request.auth, body);
  }
  @Get(":id/processing")
  @Header("Cache-Control", "no-store")
  @ApiOkResponse({
    description: "Estado autorizado da imagem; erro amigável sem detalhes internos",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["id", "processingStatus", "width", "height", "error"],
      properties: {
        id: { type: "string", format: "uuid" },
        processingStatus: { type: "string", enum: ["PENDING", "PROCESSING", "READY", "FAILED"] },
        width: { type: "integer", minimum: 1, nullable: true },
        height: { type: "integer", minimum: 1, nullable: true },
        error: { type: "string", nullable: true },
      },
    },
  })
  processing(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.media.processing(request.auth, id);
  }
}
