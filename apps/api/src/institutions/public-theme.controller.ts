import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Injectable,
  NotFoundException,
  Param,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { institutionSlugSchema, publicInstitutionThemeSchema } from "@fumep/validation";
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
    });
  }
}
@Controller("public/institutions")
@ApiTags("public themes")
export class PublicThemeController {
  constructor(private readonly themes: PublicThemeService) {}
  @Get(":slug/theme")
  @ApiOperation({ summary: "Read only the public theme of an active institution" })
  @ApiParam({
    name: "slug",
    schema: { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$", maxLength: 100 },
  })
  @ApiOkResponse({
    description: "Public colors and appearance only",
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
