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

export const resetPasswordRequestSchema = z
  .object({
    token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
    password: z.string().min(10),
  })
  .strict();
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;

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

export const institutionIdSchema = z.uuid();
export const createInstitutionRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(150),
    slug: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    isActive: z.boolean().optional(),
  })
  .strict();
export const updateInstitutionRequestSchema = createInstitutionRequestSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0);
export type CreateInstitutionRequest = z.infer<typeof createInstitutionRequestSchema>;
export type UpdateInstitutionRequest = z.infer<typeof updateInstitutionRequestSchema>;
