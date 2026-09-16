import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpException,
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
  ApiTooManyRequestsResponse,
} from "@nestjs/swagger";
import type { Request, Response } from "express";

import { loginRequestSchema } from "@fumep/validation";

import { AuthService } from "./auth.service.js";
import { CsrfService } from "./csrf.service.js";
import {
  LOGIN_ATTEMPT_STORE,
  SESSION_CONFIG,
  type LoginAttemptStore,
  type SessionConfig,
} from "./auth.contracts.js";
import { readSessionId, SESSION_COOKIE_NAME, sessionCookieOptions } from "./session-cookie.js";
import { type AuthenticatedRequest, SessionGuard } from "./session.guard.js";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject(SESSION_CONFIG) private readonly sessionConfig: SessionConfig,
    private readonly csrf: CsrfService,
    @Inject(LOGIN_ATTEMPT_STORE) private readonly attempts: LoginAttemptStore,
  ) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Authenticate an active administrative user" })
  @ApiOkResponse({ description: "Session created" })
  @ApiBadRequestResponse({ description: "Invalid request" })
  @ApiUnauthorizedResponse({ description: "Invalid credentials" })
  @ApiTooManyRequestsResponse({ description: "Too many login attempts; retry after 60 seconds" })
  async login(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const parsed = loginRequestSchema.safeParse(body);
    if (
      !(await this.attempts.consume(
        request.ip ?? request.socket.remoteAddress ?? "unknown",
        parsed.success ? parsed.data.email : undefined,
      ))
    ) {
      response.setHeader("Retry-After", "60");
      throw new HttpException("Too many login attempts", HttpStatus.TOO_MANY_REQUESTS);
    }
    if (!parsed.success) throw new BadRequestException("Invalid login request");

    const { sessionId, csrfToken } = await this.authService.login(parsed.data);
    response.cookie(SESSION_COOKIE_NAME, sessionId, {
      ...sessionCookieOptions(this.sessionConfig),
      maxAge: this.sessionConfig.inactivitySeconds * 1000,
    });
    return { authenticated: true, csrfToken };
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
      csrfToken: request.auth.csrfToken,
    };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "End the current server-side session" })
  @ApiOkResponse({ description: "Session ended and cookie invalidated" })
  async logout(
    @Headers("cookie") cookieHeader: string | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const sessionId = readSessionId(cookieHeader);
    const session = await this.authService.findSession(sessionId);
    if (session) this.csrf.validate(request, session, this.sessionConfig.appOrigin);
    await this.authService.logout(sessionId);
    response.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions(this.sessionConfig));
    return { authenticated: false };
  }
}
