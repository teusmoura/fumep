import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
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
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Institution = typeof institutions.$inferSelect;
export type NewInstitution = typeof institutions.$inferInsert;

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
