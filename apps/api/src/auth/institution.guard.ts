import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { INSTITUTION_PARAM_KEY } from "./institution-param.decorator.js";
import type { AuthenticatedRequest } from "./session.guard.js";

@Injectable()
export class InstitutionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const parameterName = this.reflector.getAllAndOverride<string>(INSTITUTION_PARAM_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!parameterName) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.auth) throw new UnauthorizedException("Authentication required");
    if (request.auth.role === "ADMIN") return true;

    const institutionId = request.params[parameterName];
    return typeof institutionId === "string" && request.auth.institutionIds.includes(institutionId);
  }
}
