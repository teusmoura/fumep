import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
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
import { IMAGE_MAX_BYTES } from "@fumep/validation";
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
      },
    },
  })
  @ApiCreatedResponse({
    description: "Original armazenado, processamento PENDING; sem URL interna",
  })
  @ApiResponse({ status: 413, description: "Imagem excede 15 MB" })
  @ApiResponse({ status: 503, description: "Falha ao salvar imagem" })
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: IMAGE_MAX_BYTES + 1, files: 1, fields: 1, parts: 3, fieldSize: 100 },
    }),
  )
  upload(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.media.upload(request.auth, body, file);
  }
}
