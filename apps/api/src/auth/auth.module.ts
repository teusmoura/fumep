import { Module } from "@nestjs/common";

import { AUTH_USER_REPOSITORY, SESSION_CONFIG, SESSION_STORE } from "./auth.contracts.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { CsrfGuard } from "./csrf.guard.js";
import { CsrfService } from "./csrf.service.js";
import { InstitutionGuard } from "./institution.guard.js";
import { LazyAuthUserRepository } from "./lazy-auth-user.repository.js";
import { PasswordHasherService } from "./password-hasher.service.js";
import { RedisSessionStore } from "./redis-session.store.js";
import { RoleGuard } from "./role.guard.js";
import { loadSessionConfig } from "./session.config.js";
import { SessionGuard } from "./session.guard.js";

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    CsrfService,
    CsrfGuard,
    SessionGuard,
    RoleGuard,
    InstitutionGuard,
    PasswordHasherService,
    { provide: SESSION_CONFIG, useFactory: loadSessionConfig },
    { provide: AUTH_USER_REPOSITORY, useClass: LazyAuthUserRepository },
    { provide: SESSION_STORE, useClass: RedisSessionStore },
  ],
  exports: [SessionGuard, RoleGuard, InstitutionGuard, CsrfGuard],
})
export class AuthModule {}
