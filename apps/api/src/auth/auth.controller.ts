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
  ApiBody,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiTooManyRequestsResponse,
} from "@nestjs/swagger";
import type { Request, Response } from "express";

import {
  forgotPasswordRequestSchema,
  loginRequestSchema,
  resetPasswordRequestSchema,
} from "@fumep/validation";
import { PasswordResetService } from "./password-reset.service.js";

import { AuthService } from "./auth.service.js";
import { CsrfService } from "./csrf.service.js";
import {
  LOGIN_ATTEMPT_STORE,
  FORGOT_PASSWORD_ATTEMPT_STORE,
  SESSION_CONFIG,
  type LoginAttemptStore,
  type AuthAttemptStore,
  type SessionConfig,
} from "./auth.contracts.js";
import { readSessionId, SESSION_COOKIE_NAME, sessionCookieOptions } from "./session-cookie.js";
import { type AuthenticatedRequest, SessionGuard } from "./session.guard.js";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordReset: PasswordResetService,
    @Inject(SESSION_CONFIG) private readonly sessionConfig: SessionConfig,
    private readonly csrf: CsrfService,
    @Inject(LOGIN_ATTEMPT_STORE) private readonly attempts: LoginAttemptStore,
    @Inject(FORGOT_PASSWORD_ATTEMPT_STORE) private readonly recoveryAttempts: AuthAttemptStore,
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

  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Request password recovery without exposing account existence" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["email"],
      additionalProperties: false,
      properties: { email: { type: "string", format: "email" } },
    },
  })
  @ApiOkResponse({ description: "Neutral password recovery response" })
  @ApiBadRequestResponse({ description: "Invalid recovery request" })
  @ApiTooManyRequestsResponse({ description: "Too many requests; retry after one hour" })
  async forgotPassword(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const parsed = forgotPasswordRequestSchema.safeParse(body);
    if (
      !(await this.recoveryAttempts.consume(
        request.ip ?? request.socket.remoteAddress ?? "unknown",
        parsed.success ? parsed.data.email : undefined,
      ))
    ) {
      response.setHeader("Retry-After", "3600");
      throw new HttpException("Too many recovery requests", HttpStatus.TOO_MANY_REQUESTS);
    }
    if (!parsed.success) throw new BadRequestException("Invalid recovery request");
    return this.authService.requestPasswordRecovery();
  }

  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reset password with a single-use token and revoke all sessions" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["token", "password"],
      additionalProperties: false,
      properties: {
        token: { type: "string", pattern: "^[A-Za-z0-9_-]{43}$" },
        password: { type: "string", minLength: 10, writeOnly: true },
      },
    },
  })
  @ApiOkResponse({ description: "Password reset; a new login is required" })
  @ApiBadRequestResponse({ description: "Invalid request or invalid, expired or consumed token" })
  async resetPassword(@Body() body: unknown) {
    const parsed = resetPasswordRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid reset request");
    return this.passwordReset.reset(parsed.data);
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
