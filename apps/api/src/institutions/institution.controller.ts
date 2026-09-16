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
} from "@nestjs/swagger";
import {
  createInstitutionRequestSchema,
  updateInstitutionRequestSchema,
  institutionIdSchema,
} from "@fumep/validation";
import { SessionGuard } from "../auth/session.guard.js";
import { RoleGuard } from "../auth/role.guard.js";
import { Roles } from "../auth/roles.decorator.js";
import { CsrfGuard } from "../auth/csrf.guard.js";
import { SESSION_COOKIE_NAME } from "../auth/session-cookie.js";
import { InstitutionService } from "./institution.service.js";

const properties = {
  name: { type: "string" as const, minLength: 1, maxLength: 150 },
  slug: { type: "string" as const, maxLength: 100, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" },
  isActive: { type: "boolean" as const },
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
  constructor(private readonly institutions: InstitutionService) {}
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
