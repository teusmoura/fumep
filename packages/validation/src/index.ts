import { z } from "zod";

export const processMediaPayloadSchema = z.object({ mediaId: z.uuid() }).strict();
export type ProcessMediaPayload = z.infer<typeof processMediaPayloadSchema>;
export const mediaProcessingResponseSchema = z
  .object({
    id: z.uuid(),
    processingStatus: z.enum(["PENDING", "PROCESSING", "READY", "FAILED"]),
    width: z.number().int().positive().nullable(),
    height: z.number().int().positive().nullable(),
    error: z.literal("Falha no processamento da imagem").nullable(),
  })
  .strict();
export const IMAGE_MAX_BYTES = 15 * 1024 * 1024;
export const PDF_MAX_BYTES = 30 * 1024 * 1024;
export const mediaUploadFieldsSchema = z
  .object({
    categoryId: z.uuid().optional(),
    uploadAnyway: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
  })
  .strict();
export const createMediaCategorySchema = z
  .object({
    institutionId: z.uuid().nullable(),
    name: z.string().trim().min(1).max(120),
    slug: z
      .string()
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  })
  .strict();
export type CreateMediaCategory = z.infer<typeof createMediaCategorySchema>;
export const updateMediaCategorySchema = createMediaCategorySchema.omit({ institutionId: true });
export type UpdateMediaCategory = z.infer<typeof updateMediaCategorySchema>;
export const mediaCategoryOptionSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    institutionId: z.uuid().nullable(),
  })
  .strict();
export const mediaUploadResponseSchema = z
  .object({
    id: z.uuid(),
    originalFilename: z.string(),
    mimeType: z.string(),
    sizeBytes: z.number().int().positive().max(IMAGE_MAX_BYTES),
    categoryId: z.uuid().nullable(),
    processingStatus: z.literal("PENDING"),
  })
  .strict();
export type MediaCategoryOption = z.infer<typeof mediaCategoryOptionSchema>;
export const mediaCategoryResponseSchema = mediaCategoryOptionSchema.extend({ slug: z.string() });
export const mediaCategoryContextSchema = z
  .object({
    categories: mediaCategoryResponseSchema.array(),
    institutions: z.object({ id: z.uuid(), name: z.string() }).strict().array(),
  })
  .strict();
export type MediaCategoryContext = z.infer<typeof mediaCategoryContextSchema>;
export const pdfUploadResponseSchema = mediaUploadResponseSchema.extend({
  mimeType: z.literal("application/pdf"),
  sizeBytes: z.number().int().positive().max(PDF_MAX_BYTES),
  processingStatus: z.literal("READY"),
});
export const mediaSelectionResponseSchema = mediaUploadResponseSchema.extend({
  sizeBytes: z.number().int().positive().max(PDF_MAX_BYTES),
  processingStatus: z.enum(["PENDING", "PROCESSING", "READY", "FAILED"]),
});
export const mediaDuplicateResponseSchema = z
  .object({ duplicate: z.literal(true), existing: mediaSelectionResponseSchema })
  .strict();
export const mediaSelectionRequestSchema = z.object({ id: z.uuid() }).strict();
export type MediaSelection = z.infer<typeof mediaSelectionResponseSchema>;
export const mediaLibraryQuerySchema = z
  .object({
    q: z.string().trim().max(200).optional(),
    categoryId: z.preprocess((value) => (value === "" ? undefined : value), z.uuid().optional()),
    page: z
      .string()
      .regex(/^[1-9]\d*$/)
      .default("1")
      .transform(Number)
      .pipe(z.number().int().max(10000)),
    limit: z
      .string()
      .regex(/^[1-9]\d*$/)
      .default("20")
      .transform(Number)
      .pipe(z.number().int().max(100)),
  })
  .strict();
export type MediaLibraryQuery = z.infer<typeof mediaLibraryQuerySchema>;
export const mediaLibraryResponseSchema = z
  .object({
    items: mediaSelectionResponseSchema
      .extend({
        type: z.enum(["IMAGE", "DOCUMENT"]),
        categoryName: z.string().nullable(),
        altText: z.string().nullable(),
        caption: z.string().nullable(),
        width: z.number().int().positive().nullable(),
        height: z.number().int().positive().nullable(),
        createdAt: z.iso.datetime(),
      })
      .array(),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive().max(100),
  })
  .strict();
export type MediaLibraryResponse = z.infer<typeof mediaLibraryResponseSchema>;

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
export function contrastRatio(background: string, foreground: string): number {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5]
      .map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
      .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const values = [luminance(background), luminance(foreground)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
const themeColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/)
  .transform((value) => value.toLowerCase());
export const institutionThemeSchema = z
  .object({
    primary: themeColorSchema,
    primaryForeground: themeColorSchema,
    accent: themeColorSchema,
    accentForeground: themeColorSchema,
  })
  .strict()
  .refine(
    (value) =>
      contrastRatio(value.primary, value.primaryForeground) >= 4.5 &&
      contrastRatio(value.accent, value.accentForeground) >= 4.5,
    "Theme contrast must be at least 4.5:1",
  );
export type InstitutionTheme = z.infer<typeof institutionThemeSchema>;

// Configuration contract only: resolving or persisting Media references belongs to phase 4.
export const institutionLogoConfigurationSchema = z
  .object({
    logoLightId: z.uuid().nullable().optional(),
    logoDarkId: z.uuid().nullable().optional(),
  })
  .strict();
export type InstitutionLogoConfiguration = z.infer<typeof institutionLogoConfigurationSchema>;
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

export const institutionalLinkSchema = z
  .object({
    label: z.string().trim().min(1).max(100),
    url: z
      .url({ protocol: /^https?$/ })
      .max(2048)
      .refine((value) => {
        try {
          const url = new URL(value);
          return !url.username && !url.password;
        } catch {
          return false;
        }
      }),
  })
  .strict();
export const appearanceDefaultSchema = z.enum(["SYSTEM", "LIGHT", "DARK"]);
export type AppearanceDefault = z.infer<typeof appearanceDefaultSchema>;
export const institutionSlugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const publicInstitutionThemeSchema = institutionThemeSchema.safeExtend({
  id: z.uuid(),
  slug: institutionSlugSchema,
  appearanceDefault: appearanceDefaultSchema,
});
export type PublicInstitutionTheme = z.infer<typeof publicInstitutionThemeSchema>;
export const updateInstitutionSettingRequestSchema = z
  .object({
    email: z.email().max(255).nullable().optional(),
    phone: z.string().trim().max(50).nullable().optional(),
    address: z.string().trim().max(5000).nullable().optional(),
    socialLinks: z.array(institutionalLinkSchema).max(20).nullable().optional(),
    footerLinks: z.array(institutionalLinkSchema).max(20).nullable().optional(),
    appearanceDefault: appearanceDefaultSchema.optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0);
export type UpdateInstitutionSettingRequest = z.infer<typeof updateInstitutionSettingRequestSchema>;
export const deleteMediaPayloadSchema = z.object({ mediaId: z.uuid() }).strict();
export const mediaDeletionResponseSchema = z
  .object({ mediaId: z.uuid(), status: z.literal("REQUESTED") })
  .strict();
