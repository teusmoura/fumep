import { Module } from "@nestjs/common";

import { AUTH_USER_REPOSITORY, SESSION_CONFIG, SESSION_STORE } from "./auth.contracts.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { LazyAuthUserRepository } from "./lazy-auth-user.repository.js";
import { PasswordHasherService } from "./password-hasher.service.js";
import { RedisSessionStore } from "./redis-session.store.js";
import { loadSessionConfig } from "./session.config.js";

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordHasherService,
    { provide: SESSION_CONFIG, useFactory: loadSessionConfig },
    { provide: AUTH_USER_REPOSITORY, useClass: LazyAuthUserRepository },
    { provide: SESSION_STORE, useClass: RedisSessionStore },
  ],
})
export class AuthModule {}
