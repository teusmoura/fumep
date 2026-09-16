import { sql } from "drizzle-orm";
import {
  boolean,
  bigint,
  check,
  index,
  inet,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const institutions = pgTable("institutions", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  primary: varchar("primary", { length: 7 }).notNull().default("#000000"),
  primaryForeground: varchar("primary_foreground", { length: 7 }).notNull().default("#ffffff"),
  accent: varchar("accent", { length: 7 }).notNull().default("#000000"),
  accentForeground: varchar("accent_foreground", { length: 7 }).notNull().default("#ffffff"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Institution = typeof institutions.$inferSelect;
export type NewInstitution = typeof institutions.$inferInsert;

export const appearanceDefault = pgEnum("appearance_default", ["SYSTEM", "LIGHT", "DARK"]);
export const institutionSettings = pgTable("institution_settings", {
  institutionId: uuid("institution_id")
    .primaryKey()
    .references(() => institutions.id, { onDelete: "cascade" }),
  contactEmail: varchar("contact_email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  socialLinks: jsonb("social_links").$type<{ label: string; url: string }[]>(),
  footerLinks: jsonb("footer_links").$type<{ label: string; url: string }[]>(),
  appearanceDefault: appearanceDefault("appearance_default").notNull().default("SYSTEM"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export type InstitutionSetting = typeof institutionSettings.$inferSelect;

export const userRole = pgEnum("user_role", ["ADMIN", "EDITOR"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 150 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRole("role").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("users_email_lower_unique").on(sql`lower(${table.email})`),
    index("users_role_index").on(table.role),
    index("users_is_active_index").on(table.isActive),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const mediaCategories = pgTable(
  "media_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    institutionId: uuid("institution_id").references(() => institutions.id, {
      onDelete: "restrict",
    }),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("media_categories_institution_slug_unique").on(table.institutionId, table.slug),
  ],
);
export type MediaCategory = typeof mediaCategories.$inferSelect;
export type NewMediaCategory = typeof mediaCategories.$inferInsert;

export const mediaType = pgEnum("media_type", ["IMAGE", "DOCUMENT", "VIDEO", "OTHER"]);
export const mediaProcessingStatus = pgEnum("media_processing_status", [
  "PENDING",
  "PROCESSING",
  "READY",
  "FAILED",
]);
export const media = pgTable(
  "media",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: mediaType("type").notNull(),
    originalFilename: varchar("original_filename", { length: 255 }).notNull(),
    storedFilename: varchar("stored_filename", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 150 }).notNull(),
    sizeBytes: bigint("size_bytes", { mode: "bigint" }).notNull(),
    storageKey: text("storage_key").notNull(),
    checksumSha256: varchar("checksum_sha256", { length: 64 }).notNull(),
    width: integer("width"),
    height: integer("height"),
    altText: text("alt_text"),
    caption: text("caption"),
    isDecorative: boolean("is_decorative").notNull().default(false),
    processingStatus: mediaProcessingStatus("processing_status").notNull().default("PENDING"),
    processingError: text("processing_error"),
    categoryId: uuid("category_id").references(() => mediaCategories.id, { onDelete: "restrict" }),
    uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("media_type_index").on(table.type),
    index("media_category_index").on(table.categoryId),
    index("media_uploaded_by_index").on(table.uploadedBy),
    index("media_created_at_index").on(table.createdAt),
    index("media_checksum_sha256_index").on(table.checksumSha256),
    check("media_size_bytes_check", sql`${table.sizeBytes} >= 0`),
    check("media_checksum_sha256_check", sql`${table.checksumSha256} ~ '^[0-9a-f]{64}$'`),
    check("media_width_check", sql`${table.width} IS NULL OR ${table.width} > 0`),
    check("media_height_check", sql`${table.height} IS NULL OR ${table.height} > 0`),
  ],
);
export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;

export const userInstitutions = pgTable(
  "user_institutions",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    institutionId: uuid("institution_id")
      .notNull()
      .references(() => institutions.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.institutionId] })],
);

export type UserInstitution = typeof userInstitutions.$inferSelect;
export type NewUserInstitution = typeof userInstitutions.$inferInsert;

export const publicationStatus = pgEnum("publication_status", [
  "DRAFT",
  "SCHEDULED",
  "PUBLISHED",
  "EXPIRED",
]);

export const pages = pgTable(
  "pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    institutionId: uuid("institution_id")
      .notNull()
      .references(() => institutions.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull(),
    status: publicationStatus("status").notNull().default("DRAFT"),
    createdBy: uuid("created_by").references(() => users.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("pages_institution_slug_unique").on(table.institutionId, table.slug),
    index("pages_institution_index").on(table.institutionId),
    index("pages_status_index").on(table.status),
  ],
);

export type Page = typeof pages.$inferSelect;
export type NewPage = typeof pages.$inferInsert;

export const blockOwnerType = pgEnum("block_owner_type", ["PAGE", "ARTICLE"]);

export const contentBlocks = pgTable(
  "content_blocks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerType: blockOwnerType("owner_type").notNull(),
    ownerId: uuid("owner_id").notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    position: integer("position").notNull(),
    isVisible: boolean("is_visible").notNull().default(true),
    schemaVersion: integer("schema_version").notNull().default(1),
    background: varchar("background", { length: 50 }).notNull().default("DEFAULT"),
    backgroundMediaId: uuid("background_media_id"),
    anchor: varchar("anchor", { length: 100 }),
    data: jsonb("data").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("content_blocks_owner_position_index").on(table.ownerType, table.ownerId, table.position),
    uniqueIndex("content_blocks_owner_anchor_unique").on(
      table.ownerType,
      table.ownerId,
      table.anchor,
    ),
  ],
);

export type ContentBlock = typeof contentBlocks.$inferSelect;
export type NewContentBlock = typeof contentBlocks.$inferInsert;

export const pageVersions = pgTable(
  "page_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("page_versions_page_number_unique").on(table.pageId, table.versionNumber),
    index("page_versions_page_index").on(table.pageId),
  ],
);

export type PageVersion = typeof pageVersions.$inferSelect;
export type NewPageVersion = typeof pageVersions.$inferInsert;

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: uuid("entity_id"),
    metadata: jsonb("metadata"),
    ipAddress: inet("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_user_index").on(table.userId),
    index("audit_logs_entity_index").on(table.entityType, table.entityId),
    index("audit_logs_created_at_index").on(table.createdAt),
  ],
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

export const redirects = pgTable(
  "redirects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourcePath: text("source_path").notNull().unique(),
    targetPath: text("target_path").notNull(),
    statusCode: smallint("status_code").notNull().default(301),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("redirects_status_code_check", sql`${table.statusCode} in (301, 302, 307, 308)`),
  ],
);

export type Redirect = typeof redirects.$inferSelect;
export type NewRedirect = typeof redirects.$inferInsert;

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("password_reset_tokens_user_index").on(table.userId),
    index("password_reset_tokens_expires_at_index").on(table.expiresAt),
  ],
);

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
