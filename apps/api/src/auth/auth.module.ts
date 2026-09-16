import { Module } from "@nestjs/common";

import {
  AUTH_USER_REPOSITORY,
  FORGOT_PASSWORD_ATTEMPT_STORE,
  LOGIN_ATTEMPT_STORE,
  SESSION_CONFIG,
  SESSION_STORE,
} from "./auth.contracts.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { CsrfGuard } from "./csrf.guard.js";
import { CsrfService } from "./csrf.service.js";
import { InstitutionGuard } from "./institution.guard.js";
import { LazyAuthUserRepository } from "./lazy-auth-user.repository.js";
import { LazyPasswordResetTokenRepository } from "./lazy-password-reset-token.repository.js";
import {
  PASSWORD_RESET_TOKEN_REPOSITORY,
  PasswordResetTokenService,
} from "./password-reset-token.service.js";
import { PasswordHasherService } from "./password-hasher.service.js";
import { RedisSessionStore } from "./redis-session.store.js";
import { RedisLoginAttemptStore } from "./redis-login-attempt.store.js";
import { RedisForgotPasswordAttemptStore } from "./redis-forgot-password-attempt.store.js";
import { RoleGuard } from "./role.guard.js";
import { loadSessionConfig } from "./session.config.js";
import { SessionGuard } from "./session.guard.js";

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordResetTokenService,
    { provide: PASSWORD_RESET_TOKEN_REPOSITORY, useClass: LazyPasswordResetTokenRepository },
    CsrfService,
    CsrfGuard,
    SessionGuard,
    RoleGuard,
    InstitutionGuard,
    PasswordHasherService,
    { provide: SESSION_CONFIG, useFactory: loadSessionConfig },
    { provide: AUTH_USER_REPOSITORY, useClass: LazyAuthUserRepository },
    { provide: SESSION_STORE, useClass: RedisSessionStore },
    { provide: LOGIN_ATTEMPT_STORE, useClass: RedisLoginAttemptStore },
    { provide: FORGOT_PASSWORD_ATTEMPT_STORE, useClass: RedisForgotPasswordAttemptStore },
  ],
  exports: [SessionGuard, RoleGuard, InstitutionGuard, CsrfGuard],
})
export class AuthModule {}
