import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import type { Request } from "express";

import type { SessionData } from "./auth.contracts.js";
import { AuthService } from "./auth.service.js";
import { readSessionId } from "./session-cookie.js";

export interface AuthenticatedRequest extends Request {
  auth: SessionData;
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    request.auth = await this.authService.getSession(readSessionId(request.headers.cookie));
    return true;
  }
}
