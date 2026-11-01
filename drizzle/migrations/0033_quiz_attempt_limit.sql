CREATE TABLE "quiz_extra_attempts" (
	"quiz_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"extra" integer DEFAULT 0 NOT NULL,
	"granted_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quiz_extra_attempts_quiz_id_user_id_pk" PRIMARY KEY("quiz_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "quiz" ADD COLUMN "max_attempts" integer;--> statement-breakpoint
ALTER TABLE "quiz" ADD COLUMN "hide_corrections" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz_extra_attempts" ADD CONSTRAINT "quiz_extra_attempts_quiz_id_quiz_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quiz"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_extra_attempts" ADD CONSTRAINT "quiz_extra_attempts_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_extra_attempts" ADD CONSTRAINT "quiz_extra_attempts_granted_by_profiles_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- RLS : comme les autres tables du dashboard, réservée aux contributeurs via
-- l'API Supabase (l'app lit et écrit via Drizzle).
ALTER TABLE "quiz_extra_attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "contributors read quiz_extra_attempts" ON "quiz_extra_attempts" FOR SELECT USING (public.is_contributor());--> statement-breakpoint
CREATE POLICY "contributors write quiz_extra_attempts" ON "quiz_extra_attempts" FOR INSERT WITH CHECK (public.is_contributor());--> statement-breakpoint
CREATE POLICY "contributors update quiz_extra_attempts" ON "quiz_extra_attempts" FOR UPDATE USING (public.is_contributor());--> statement-breakpoint
CREATE POLICY "contributors delete quiz_extra_attempts" ON "quiz_extra_attempts" FOR DELETE USING (public.is_contributor());--> statement-breakpoint
-- Les tentatives ne s'enregistrent que par submitQuizAttempt (Drizzle), qui
-- corrige côté serveur et applique la limite. Ces policies (0013) laissaient
-- un étudiant insérer via l'API Supabase une tentative au score choisi.
DROP POLICY "users insert own tentatives" ON "quiz_tentatives";--> statement-breakpoint
DROP POLICY "users insert own reponses" ON "quiz_reponses";
