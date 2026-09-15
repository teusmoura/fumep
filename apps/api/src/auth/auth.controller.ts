import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
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

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 60 * 1000,
    });
    return { authenticated: true };
  }
}
