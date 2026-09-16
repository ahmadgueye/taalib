CREATE TYPE "public"."memorization_status" AS ENUM('en_cours', 'a_renforcer', 'maitrise');--> statement-breakpoint
CREATE TABLE "quran_memorization" (
	"user_id" uuid NOT NULL,
	"chapter_id" integer NOT NULL,
	"verse_number" integer NOT NULL,
	"verse_key" text NOT NULL,
	"status" "memorization_status" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quran_memorization_user_id_verse_key_pk" PRIMARY KEY("user_id","verse_key")
);
--> statement-breakpoint
ALTER TABLE "quran_memorization" ADD CONSTRAINT "quran_memorization_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quran_memorization_user_chapter_idx" ON "quran_memorization" USING btree ("user_id","chapter_id");