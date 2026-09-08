ALTER TABLE "pages" ADD COLUMN "institution_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pages_institution_slug_unique" ON "pages" USING btree ("institution_id","slug");--> statement-breakpoint
CREATE INDEX "pages_institution_index" ON "pages" USING btree ("institution_id");