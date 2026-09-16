import { RedisLoginAttemptStore, type AuthAttemptPolicy } from "./redis-login-attempt.store.js";

export const FORGOT_PASSWORD_POLICY: AuthAttemptPolicy = {
  namespace: "forgot-password-attempt",
  limit: 5,
  windowSeconds: 3600,
};

export class RedisForgotPasswordAttemptStore extends RedisLoginAttemptStore {
  constructor() {
    super(FORGOT_PASSWORD_POLICY);
  }
}
