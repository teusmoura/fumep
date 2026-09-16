ALTER TABLE "institutions" ADD COLUMN "primary" varchar(7) DEFAULT '#000000' NOT NULL;--> statement-breakpoint
ALTER TABLE "institutions" ADD COLUMN "primary_foreground" varchar(7) DEFAULT '#ffffff' NOT NULL;--> statement-breakpoint
ALTER TABLE "institutions" ADD COLUMN "accent" varchar(7) DEFAULT '#000000' NOT NULL;--> statement-breakpoint
ALTER TABLE "institutions" ADD COLUMN "accent_foreground" varchar(7) DEFAULT '#ffffff' NOT NULL;