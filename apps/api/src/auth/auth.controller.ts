import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { Response } from "express";

import { loginRequestSchema } from "@fumep/validation";

import { AuthService } from "./auth.service.js";
import { SESSION_CONFIG, type SessionConfig } from "./auth.contracts.js";
import { readSessionId, SESSION_COOKIE_NAME, sessionCookieOptions } from "./session-cookie.js";
import { type AuthenticatedRequest, SessionGuard } from "./session.guard.js";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject(SESSION_CONFIG) private readonly sessionConfig: SessionConfig,
  ) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Authenticate an active administrative user" })
  @ApiOkResponse({ description: "Session created" })
  @ApiBadRequestResponse({ description: "Invalid request" })
  @ApiUnauthorizedResponse({ description: "Invalid credentials" })
  async login(@Body() body: unknown, @Res({ passthrough: true }) response: Response) {
    const parsed = loginRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid login request");

    const sessionId = await this.authService.login(parsed.data);
    response.cookie(SESSION_COOKIE_NAME, sessionId, {
      ...sessionCookieOptions(this.sessionConfig),
      maxAge: this.sessionConfig.inactivitySeconds * 1000,
    });
    return { authenticated: true };
  }

  @Get("session")
  @UseGuards(SessionGuard)
  @ApiCookieAuth(SESSION_COOKIE_NAME)
  @ApiOperation({ summary: "Read the current server-side session" })
  @ApiOkResponse({ description: "Current authenticated user" })
  @ApiUnauthorizedResponse({ description: "Session missing or invalid" })
  session(@Req() request: AuthenticatedRequest) {
    return {
      authenticated: true,
      user: {
        id: request.auth.userId,
        role: request.auth.role,
        institutionIds: request.auth.institutionIds,
      },
    };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "End the current server-side session" })
  @ApiOkResponse({ description: "Session ended and cookie invalidated" })
  async logout(
    @Headers("cookie") cookieHeader: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(readSessionId(cookieHeader));
    response.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions(this.sessionConfig));
    return { authenticated: false };
  }
}
