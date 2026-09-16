CREATE TABLE "media_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution_id" uuid,
	"name" varchar(120) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "media_categories" ADD CONSTRAINT "media_categories_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_categories" ADD CONSTRAINT "media_categories_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "media_categories_institution_slug_unique" ON "media_categories" USING btree ("institution_id","slug");--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_category_id_media_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."media_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_category_index" ON "media" USING btree ("category_id");