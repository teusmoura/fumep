ALTER TABLE "institutions" ADD COLUMN "logo_light_id" uuid;--> statement-breakpoint
ALTER TABLE "institutions" ADD COLUMN "logo_dark_id" uuid;--> statement-breakpoint
ALTER TABLE "institutions" ADD CONSTRAINT "institutions_logo_light_id_media_id_fk" FOREIGN KEY ("logo_light_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institutions" ADD CONSTRAINT "institutions_logo_dark_id_media_id_fk" FOREIGN KEY ("logo_dark_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;