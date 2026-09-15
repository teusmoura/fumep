CREATE TYPE "public"."block_owner_type" AS ENUM('PAGE', 'ARTICLE');--> statement-breakpoint
CREATE TABLE "content_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_type" "block_owner_type" NOT NULL,
	"owner_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"position" integer NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"background" varchar(50) DEFAULT 'DEFAULT' NOT NULL,
	"background_media_id" uuid,
	"anchor" varchar(100),
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "content_blocks_owner_position_index" ON "content_blocks" USING btree ("owner_type","owner_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "content_blocks_owner_anchor_unique" ON "content_blocks" USING btree ("owner_type","owner_id","anchor");