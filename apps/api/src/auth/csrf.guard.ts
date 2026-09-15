import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";

import { SESSION_CONFIG, type SessionConfig } from "./auth.contracts.js";
import { CsrfService } from "./csrf.service.js";
import type { AuthenticatedRequest } from "./session.guard.js";

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly csrf: CsrfService,
    @Inject(SESSION_CONFIG) private readonly config: SessionConfig,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) return true;
    if (!request.auth) throw new UnauthorizedException("Authentication required");
    this.csrf.validate(request, request.auth, this.config.appOrigin);
    return true;
  }
}
