import { SetMetadata } from "@nestjs/common";

import type { SessionData } from "./auth.contracts.js";

export const ROLES_KEY = "auth:roles";
export type UserRole = SessionData["role"];

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
