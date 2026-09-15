CREATE TABLE "redirects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_path" text NOT NULL,
	"target_path" text NOT NULL,
	"status_code" smallint DEFAULT 301 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "redirects_source_path_unique" UNIQUE("source_path"),
	CONSTRAINT "redirects_status_code_check" CHECK ("redirects"."status_code" in (301, 302, 307, 308))
);
