CREATE TYPE "public"."appearance_default" AS ENUM('SYSTEM', 'LIGHT', 'DARK');--> statement-breakpoint
CREATE TABLE "institution_settings" (
	"institution_id" uuid PRIMARY KEY NOT NULL,
	"contact_email" varchar(255),
	"phone" varchar(50),
	"address" text,
	"social_links" jsonb,
	"footer_links" jsonb,
	"appearance_default" "appearance_default" DEFAULT 'SYSTEM' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "institution_settings" ADD CONSTRAINT "institution_settings_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;