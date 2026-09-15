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
  Res,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { Response } from "express";

import { loginRequestSchema } from "@fumep/validation";

import { AuthService } from "./auth.service.js";
import { SESSION_CONFIG, type SessionConfig } from "./auth.contracts.js";

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
    response.cookie("fumep_session", sessionId, {
      httpOnly: true,
      secure: this.sessionConfig.secureCookie,
      sameSite: "lax",
      path: "/",
      maxAge: this.sessionConfig.inactivitySeconds * 1000,
    });
    return { authenticated: true };
  }

  @Get("session")
  @ApiOperation({ summary: "Read the current server-side session" })
  @ApiOkResponse({ description: "Current authenticated user" })
  @ApiUnauthorizedResponse({ description: "Session missing or invalid" })
  async session(@Headers("cookie") cookieHeader?: string) {
    const sessionId = cookieHeader
      ?.split(";")
      .map((cookie) => cookie.trim().split("="))
      .find(([name]) => name === "fumep_session")?.[1];
    const session = await this.authService.getSession(sessionId);

    return {
      authenticated: true,
      user: {
        id: session.userId,
        role: session.role,
        institutionIds: session.institutionIds,
      },
    };
  }
}
