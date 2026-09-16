CREATE TABLE "media_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"media_id" uuid NOT NULL,
	"format" varchar(20) NOT NULL,
	"width" integer,
	"height" integer,
	"size_bytes" bigint NOT NULL,
	"storage_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_variants_width_positive" CHECK ("media_variants"."width" IS NULL OR "media_variants"."width" > 0),
	CONSTRAINT "media_variants_height_positive" CHECK ("media_variants"."height" IS NULL OR "media_variants"."height" > 0),
	CONSTRAINT "media_variants_size_positive" CHECK ("media_variants"."size_bytes" > 0),
	CONSTRAINT "media_variants_format_allowed" CHECK ("media_variants"."format" IN ('WEBP', 'AVIF')),
	CONSTRAINT "media_variants_key_relative" CHECK ("media_variants"."storage_key" !~ '(^/|:|(^|/)..(/|$))' AND length("media_variants"."storage_key") > 0)
);
--> statement-breakpoint
ALTER TABLE "media_variants" ADD CONSTRAINT "media_variants_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "media_variants_media_format_width_unique" ON "media_variants" USING btree ("media_id","format","width");