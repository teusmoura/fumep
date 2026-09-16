import { z } from "zod";

export const healthResponseSchema = z
  .object({
    status: z.literal("ok"),
  })
  .strict();

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const loginRequestSchema = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email()),
    password: z.string().min(1),
  })
  .strict();

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const forgotPasswordRequestSchema = z
  .object({ email: z.string().trim().toLowerCase().pipe(z.email()) })
  .strict();

export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;

export const sessionDataSchema = z
  .object({
    userId: z.uuid(),
    role: z.enum(["ADMIN", "EDITOR"]),
    institutionIds: z.array(z.uuid()),
    csrfToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
    createdAt: z.iso.datetime(),
    lastActivityAt: z.iso.datetime(),
    absoluteExpiresAt: z.iso.datetime(),
  })
  .strict();

export type SessionData = z.infer<typeof sessionDataSchema>;
