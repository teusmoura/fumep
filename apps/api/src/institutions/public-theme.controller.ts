import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Injectable,
  NotFoundException,
  Param,
  Res,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiServiceUnavailableResponse,
} from "@nestjs/swagger";
import { institutionSlugSchema, publicInstitutionThemeSchema } from "@fumep/validation";
import type { Response } from "express";
import { InstitutionLogoService } from "./institution-logo.service.js";
import { INSTITUTION_REPOSITORY, type InstitutionStore } from "./institution.service.js";
import {
  INSTITUTION_SETTING_REPOSITORY,
  type InstitutionSettingStore,
} from "./institution-setting.service.js";

@Injectable()
export class PublicThemeService {
  constructor(
    @Inject(INSTITUTION_REPOSITORY) private readonly institutions: InstitutionStore,
    @Inject(INSTITUTION_SETTING_REPOSITORY) private readonly settings: InstitutionSettingStore,
    private readonly logos: InstitutionLogoService,
  ) {}
  async get(slug: string) {
    const institution = await this.institutions.findBySlug(slug);
    if (!institution?.isActive) throw new NotFoundException("Institution not found");
    const settings = await this.settings.findByInstitutionId(institution.id);
    const { id, primary, primaryForeground, accent, accentForeground } = institution;
    return publicInstitutionThemeSchema.parse({
      id,
      slug: institution.slug,
      primary,
      primaryForeground,
      accent,
      accentForeground,
      appearanceDefault: settings?.appearanceDefault ?? "SYSTEM",
      ...(await this.logos.publicPaths(institution)),
    });
  }
}
@Controller("public/institutions")
@ApiTags("public themes")
export class PublicThemeController {
  constructor(
    private readonly themes: PublicThemeService,
    private readonly logos: InstitutionLogoService,
  ) {}
  @Get(":slug/logo/:appearance")
  @ApiOperation({
    summary: "Read selected logo of an active institution, dark falls back to light",
  })
  @ApiParam({ name: "slug", schema: { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" } })
  @ApiParam({ name: "appearance", enum: ["light", "dark"] })
  @ApiOkResponse({
    description: "Image bytes, never a storage URL",
    content: {
      "image/png": { schema: { type: "string", format: "binary" } },
      "image/jpeg": { schema: { type: "string", format: "binary" } },
      "image/webp": { schema: { type: "string", format: "binary" } },
      "image/avif": { schema: { type: "string", format: "binary" } },
    },
  })
  @ApiBadRequestResponse({ description: "Invalid slug or appearance" })
  @ApiNotFoundResponse({ description: "Missing logo or inactive institution" })
  @ApiServiceUnavailableResponse({ description: "Logo storage temporarily unavailable" })
  async logo(
    @Param("slug") slug: string,
    @Param("appearance") appearance: string,
    @Res() response: Response,
  ) {
    const parsed = institutionSlugSchema.safeParse(slug);
    if (!parsed.success || (appearance !== "light" && appearance !== "dark"))
      throw new BadRequestException("Invalid logo route");
    try {
      const result = await this.logos.readPublic(parsed.data, appearance);
      response
        .set({
          "Content-Type": result.mimeType,
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        })
        .send(result.bytes);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ServiceUnavailableException)
        throw error;
      throw new ServiceUnavailableException("Logo unavailable");
    }
  }
  @Get(":slug/theme")
  @ApiOperation({ summary: "Read only the public theme of an active institution" })
  @ApiParam({
    name: "slug",
    schema: { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$", maxLength: 100 },
  })
  @ApiOkResponse({
    description: "Public controlled colors, appearance and optional same-origin logo paths",
    schema: {
      type: "object",
      additionalProperties: false,
      required: [
        "id",
        "slug",
        "primary",
        "primaryForeground",
        "accent",
        "accentForeground",
        "appearanceDefault",
      ],
      properties: {
        id: { type: "string", format: "uuid" },
        slug: { type: "string" },
        ...Object.fromEntries(
          ["primary", "primaryForeground", "accent", "accentForeground"].map((name) => [
            name,
            { type: "string", pattern: "^#[0-9a-f]{6}$" },
          ]),
        ),
        appearanceDefault: { type: "string", enum: ["SYSTEM", "LIGHT", "DARK"] },
        logoLightUrl: { type: "string", description: "Same-origin selected light logo path" },
        logoDarkUrl: {
          type: "string",
          description: "Same-origin selected dark logo path, optional",
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: "Invalid slug" })
  @ApiNotFoundResponse({ description: "Institution missing or inactive" })
  get(@Param("slug") slug: string) {
    const parsed = institutionSlugSchema.safeParse(slug);
    if (!parsed.success) throw new BadRequestException("Invalid institution slug");
    return this.themes.get(parsed.data);
  }
}
