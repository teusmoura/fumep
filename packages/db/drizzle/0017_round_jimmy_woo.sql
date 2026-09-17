CREATE TABLE "media_usages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"media_id" uuid NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"field_name" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_usages_entity_type_check" CHECK (length(trim("media_usages"."entity_type")) > 0),
	CONSTRAINT "media_usages_field_name_check" CHECK (length(trim("media_usages"."field_name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "media_usages" ADD CONSTRAINT "media_usages_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_usages_media_index" ON "media_usages" USING btree ("media_id");--> statement-breakpoint
CREATE INDEX "media_usages_entity_index" ON "media_usages" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "media_usages_reference_unique" ON "media_usages" USING btree ("media_id","entity_type","entity_id","field_name");