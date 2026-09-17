import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  Header,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiServiceUnavailableResponse,
} from "@nestjs/swagger";
import {
  createInstitutionRequestSchema,
  updateInstitutionRequestSchema,
  institutionIdSchema,
  institutionThemeSchema,
  updateInstitutionSettingRequestSchema,
  institutionLogoConfigurationSchema,
} from "@fumep/validation";
import { SessionGuard } from "../auth/session.guard.js";
import { RoleGuard } from "../auth/role.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { CsrfGuard } from "../auth/csrf.guard.js";
import { SESSION_COOKIE_NAME } from "../auth/session-cookie.js";
import { InstitutionService } from "./institution.service.js";
import { InstitutionSettingService } from "./institution-setting.service.js";
import { InstitutionLogoService } from "./institution-logo.service.js";
import type { AuthenticatedRequest } from "../auth/session.guard.js";

const properties = {
  name: { type: "string" as const, minLength: 1, maxLength: 150 },
  slug: { type: "string" as const, maxLength: 100, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" },
  isActive: { type: "boolean" as const },
};
const logoResponseSchema = {
  type: "object" as const,
  additionalProperties: false,
  required: ["id", "logoLightId", "logoDarkId"],
  properties: {
    id: { type: "string" as const, format: "uuid" },
    logoLightId: { type: "string" as const, format: "uuid", nullable: true },
    logoDarkId: { type: "string" as const, format: "uuid", nullable: true },
  },
};
@Controller("institutions")
@ApiTags("institutions")
@ApiCookieAuth(SESSION_COOKIE_NAME)
@ApiUnauthorizedResponse({ description: "Session required" })
@ApiForbiddenResponse({ description: "ADMIN and valid CSRF required" })
@ApiBadRequestResponse({ description: "Invalid request" })
@UseGuards(SessionGuard, RoleGuard, CsrfGuard)
@Roles("ADMIN")
export class InstitutionController {
  constructor(
    private readonly institutions: InstitutionService,
    private readonly settings: InstitutionSettingService,
    private readonly logos: InstitutionLogoService,
  ) {}

  @Get(":id/logos")
  @Header("Cache-Control", "no-store")
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOkResponse({
    description: "Selected library media IDs, nullable for each appearance",
    schema: logoResponseSchema,
  })
  @ApiNotFoundResponse({ description: "Institution not found" })
  async getLogos(@Param("id") id: string) {
    const owner = await this.institutions.get(this.id(id));
    return { id: owner.id, logoLightId: owner.logoLightId, logoDarkId: owner.logoDarkId };
  }

  @Patch(":id/logos")
  @Header("Cache-Control", "no-store")
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOperation({
    summary: "Select existing ready library images as institutional logos; ADMIN only",
  })
  @ApiBody({
    schema: {
      type: "object",
      additionalProperties: false,
      minProperties: 1,
      properties: {
        logoLightId: { type: "string", format: "uuid", nullable: true },
        logoDarkId: { type: "string", format: "uuid", nullable: true },
      },
    },
  })
  @ApiOkResponse({
    description: "Logo IDs and MediaUsage committed atomically",
    schema: logoResponseSchema,
  })
  @ApiServiceUnavailableResponse({
    description: "Configuration unavailable; no partial writes committed",
  })
  @ApiNotFoundResponse({ description: "Institution not found" })
  updateLogos(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    const parsed = institutionLogoConfigurationSchema.safeParse(body);
    if (!parsed.success || !Object.keys(parsed.data).length)
      throw new BadRequestException("Invalid logo selection");
    return this.logos.update(this.id(id), parsed.data, request.auth.userId);
  }

  @Patch(":id/theme")
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOperation({ summary: "Configure four controlled theme colors with at least 4.5:1 contrast" })
  @ApiBody({
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["primary", "primaryForeground", "accent", "accentForeground"],
      properties: Object.fromEntries(
        ["primary", "primaryForeground", "accent", "accentForeground"].map((key) => [
          key,
          { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
        ]),
      ),
    },
  })
  @ApiOkResponse({ description: "Institution theme updated" })
  @ApiNotFoundResponse({ description: "Institution not found" })
  updateTheme(@Param("id") id: string, @Body() body: unknown) {
    const parsed = institutionThemeSchema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException("Invalid theme colors or insufficient contrast");
    return this.institutions.updateTheme(this.id(id), parsed.data);
  }

  @Get(":id/settings")
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOperation({ summary: "Read institutional contact, links and appearance" })
  @ApiOkResponse({ description: "Institution settings" })
  @ApiNotFoundResponse({ description: "Institution or settings not found" })
  getSettings(@Param("id") id: string) {
    return this.settings.get(this.id(id));
  }

  @Patch(":id/settings")
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOperation({ summary: "Update institutional settings (ADMIN and CSRF required)" })
  @ApiBody({
    schema: {
      type: "object",
      minProperties: 1,
      additionalProperties: false,
      properties: {
        email: { type: "string", format: "email", nullable: true, maxLength: 255 },
        phone: { type: "string", nullable: true, maxLength: 50 },
        address: { type: "string", nullable: true, maxLength: 5000 },
        appearanceDefault: { type: "string", enum: ["SYSTEM", "LIGHT", "DARK"] },
        socialLinks: {
          type: "array",
          nullable: true,
          maxItems: 20,
          items: {
            type: "object",
            required: ["label", "url"],
            additionalProperties: false,
            properties: {
              label: { type: "string", minLength: 1, maxLength: 100 },
              url: {
                type: "string",
                format: "uri",
                maxLength: 2048,
                description: "HTTP(S), without credentials",
              },
            },
          },
        },
        footerLinks: {
          type: "array",
          nullable: true,
          maxItems: 20,
          items: {
            type: "object",
            required: ["label", "url"],
            additionalProperties: false,
            properties: {
              label: { type: "string", minLength: 1, maxLength: 100 },
              url: {
                type: "string",
                format: "uri",
                maxLength: 2048,
                description: "HTTP(S), without credentials",
              },
            },
          },
        },
      },
    },
  })
  @ApiOkResponse({ description: "Settings updated" })
  @ApiNotFoundResponse({ description: "Institution not found" })
  updateSettings(@Param("id") id: string, @Body() body: unknown) {
    const parsed = updateInstitutionSettingRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid institution settings request");
    return this.settings.update(this.id(id), parsed.data);
  }
  @Get()
  @ApiOperation({ summary: "List institutions (ADMIN only)" })
  @ApiOkResponse({ description: "Institutions" })
  list() {
    return this.institutions.list();
  }
  @Get(":id")
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOperation({ summary: "Read institution" })
  @ApiOkResponse({ description: "Institution" })
  @ApiNotFoundResponse({ description: "Institution not found" })
  get(@Param("id") id: string) {
    return this.institutions.get(this.id(id));
  }
  @Post()
  @ApiOperation({ summary: "Create institution" })
  @ApiBody({
    schema: { type: "object", required: ["name", "slug"], additionalProperties: false, properties },
  })
  @ApiCreatedResponse({ description: "Institution created" })
  @ApiConflictResponse({ description: "Slug already exists" })
  create(@Body() body: unknown) {
    const parsed = createInstitutionRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid institution request");
    return this.institutions.create(parsed.data);
  }
  @Patch(":id")
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOperation({ summary: "Update institution" })
  @ApiBody({
    schema: { type: "object", minProperties: 1, additionalProperties: false, properties },
  })
  @ApiOkResponse({ description: "Institution updated" })
  @ApiNotFoundResponse({ description: "Institution not found" })
  @ApiConflictResponse({ description: "Slug already exists" })
  update(@Param("id") id: string, @Body() body: unknown) {
    const parsed = updateInstitutionRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid institution request");
    return this.institutions.update(this.id(id), parsed.data);
  }
  @Delete(":id")
  @HttpCode(204)
  @ApiParam({ name: "id", format: "uuid" })
  @ApiOperation({ summary: "Delete institution without dependencies" })
  @ApiNoContentResponse({ description: "Institution deleted" })
  @ApiNotFoundResponse({ description: "Institution not found" })
  @ApiConflictResponse({ description: "Institution has dependencies" })
  delete(@Param("id") id: string) {
    return this.institutions.delete(this.id(id));
  }
  private id(value: string) {
    const parsed = institutionIdSchema.safeParse(value);
    if (!parsed.success) throw new BadRequestException("Invalid institution id");
    return parsed.data;
  }
}
