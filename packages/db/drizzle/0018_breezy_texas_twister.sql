CREATE TYPE "public"."media_deletion_status" AS ENUM('NONE', 'REQUESTED', 'FAILED');--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "deletion_status" "media_deletion_status" DEFAULT 'NONE' NOT NULL;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "deletion_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "deletion_requested_by" uuid;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "deletion_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "deletion_last_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "deletion_error_code" varchar(40);--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_deletion_requested_by_users_id_fk" FOREIGN KEY ("deletion_requested_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_deletion_pending_index" ON "media" USING btree ("deletion_requested_at","id") WHERE "media"."deletion_status" = 'REQUESTED';--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_deletion_attempts_check" CHECK ("media"."deletion_attempts" BETWEEN 0 AND 3);--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_deletion_state_check" CHECK (("media"."deletion_status" = 'NONE' AND "media"."deletion_requested_at" IS NULL AND "media"."deletion_requested_by" IS NULL AND "media"."deletion_attempts" = 0 AND "media"."deletion_last_attempt_at" IS NULL AND "media"."deletion_error_code" IS NULL) OR ("media"."deletion_status" IN ('REQUESTED','FAILED') AND "media"."deletion_requested_at" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_deletion_attempt_time_check" CHECK (("media"."deletion_attempts" = 0) = ("media"."deletion_last_attempt_at" IS NULL));--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_deletion_error_check" CHECK (("media"."deletion_status" != 'FAILED' OR "media"."deletion_error_code" IS NOT NULL) AND ("media"."deletion_error_code" IS NULL OR "media"."deletion_error_code" IN ('STORAGE_UNAVAILABLE','USAGE_CONFLICT','PROCESSING_CONFLICT','RETRY_EXHAUSTED')));