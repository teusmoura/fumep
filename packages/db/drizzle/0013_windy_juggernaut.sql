CREATE TYPE "public"."media_processing_status" AS ENUM('PENDING', 'PROCESSING', 'READY', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('IMAGE', 'DOCUMENT', 'VIDEO', 'OTHER');--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "media_type" NOT NULL,
	"original_filename" varchar(255) NOT NULL,
	"stored_filename" varchar(255) NOT NULL,
	"mime_type" varchar(150) NOT NULL,
	"size_bytes" bigint NOT NULL,
	"storage_key" text NOT NULL,
	"checksum_sha256" varchar(64) NOT NULL,
	"width" integer,
	"height" integer,
	"alt_text" text,
	"caption" text,
	"is_decorative" boolean DEFAULT false NOT NULL,
	"processing_status" "media_processing_status" DEFAULT 'PENDING' NOT NULL,
	"processing_error" text,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_size_bytes_check" CHECK ("media"."size_bytes" >= 0),
	CONSTRAINT "media_checksum_sha256_check" CHECK ("media"."checksum_sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "media_width_check" CHECK ("media"."width" IS NULL OR "media"."width" > 0),
	CONSTRAINT "media_height_check" CHECK ("media"."height" IS NULL OR "media"."height" > 0)
);
--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_type_index" ON "media" USING btree ("type");--> statement-breakpoint
CREATE INDEX "media_uploaded_by_index" ON "media" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "media_created_at_index" ON "media" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "media_checksum_sha256_index" ON "media" USING btree ("checksum_sha256");