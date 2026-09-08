CREATE TABLE "user_institutions" (
	"user_id" uuid NOT NULL,
	"institution_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_institutions_user_id_institution_id_pk" PRIMARY KEY("user_id","institution_id")
);
--> statement-breakpoint
ALTER TABLE "user_institutions" ADD CONSTRAINT "user_institutions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_institutions" ADD CONSTRAINT "user_institutions_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE restrict ON UPDATE no action;