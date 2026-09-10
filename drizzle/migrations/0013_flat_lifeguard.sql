CREATE TYPE "public"."question_type" AS ENUM('qcm', 'vrai_faux');--> statement-breakpoint
CREATE TABLE "quiz" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thematique_id" uuid NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "ressource_status" DEFAULT 'published' NOT NULL,
	"added_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_choix" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"label" text NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"prompt" text NOT NULL,
	"type" "question_type" NOT NULL,
	"explanation" text
);
--> statement-breakpoint
CREATE TABLE "quiz_reponses" (
	"tentative_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"choix_id" uuid NOT NULL,
	CONSTRAINT "quiz_reponses_tentative_id_choix_id_pk" PRIMARY KEY("tentative_id","choix_id")
);
--> statement-breakpoint
CREATE TABLE "quiz_tentatives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"total_questions" integer NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quiz" ADD CONSTRAINT "quiz_thematique_id_thematiques_id_fk" FOREIGN KEY ("thematique_id") REFERENCES "public"."thematiques"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz" ADD CONSTRAINT "quiz_added_by_profiles_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_choix" ADD CONSTRAINT "quiz_choix_question_id_quiz_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quiz_id_quiz_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quiz"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_reponses" ADD CONSTRAINT "quiz_reponses_tentative_id_quiz_tentatives_id_fk" FOREIGN KEY ("tentative_id") REFERENCES "public"."quiz_tentatives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_reponses" ADD CONSTRAINT "quiz_reponses_question_id_quiz_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_reponses" ADD CONSTRAINT "quiz_reponses_choix_id_quiz_choix_id_fk" FOREIGN KEY ("choix_id") REFERENCES "public"."quiz_choix"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_tentatives" ADD CONSTRAINT "quiz_tentatives_quiz_id_quiz_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quiz"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_tentatives" ADD CONSTRAINT "quiz_tentatives_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- quiz / quiz_questions / quiz_choix: contenu pédagogique, même forme que
-- cours/thematiques/ressources (voir 0001_rls_and_profile_trigger.sql) —
-- lecture publique, écriture réservée aux contributeurs. Note: la RLS ne
-- protège pas la confidentialité de "is_correct" (lecture publique comme le
-- reste) — c'est la couche applicative (queries/quiz.ts) qui ne doit jamais
-- exposer ce champ à la page "passer le quiz" avant soumission.
ALTER TABLE "quiz" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "public read quiz" ON "quiz" FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY "contributors write quiz" ON "quiz" FOR INSERT WITH CHECK (public.is_contributor());--> statement-breakpoint
CREATE POLICY "contributors update quiz" ON "quiz" FOR UPDATE USING (public.is_contributor());--> statement-breakpoint
CREATE POLICY "contributors delete quiz" ON "quiz" FOR DELETE USING (public.is_contributor());--> statement-breakpoint

ALTER TABLE "quiz_questions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "public read quiz_questions" ON "quiz_questions" FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY "contributors write quiz_questions" ON "quiz_questions" FOR INSERT WITH CHECK (public.is_contributor());--> statement-breakpoint
CREATE POLICY "contributors update quiz_questions" ON "quiz_questions" FOR UPDATE USING (public.is_contributor());--> statement-breakpoint
CREATE POLICY "contributors delete quiz_questions" ON "quiz_questions" FOR DELETE USING (public.is_contributor());--> statement-breakpoint

ALTER TABLE "quiz_choix" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "public read quiz_choix" ON "quiz_choix" FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY "contributors write quiz_choix" ON "quiz_choix" FOR INSERT WITH CHECK (public.is_contributor());--> statement-breakpoint
CREATE POLICY "contributors update quiz_choix" ON "quiz_choix" FOR UPDATE USING (public.is_contributor());--> statement-breakpoint
CREATE POLICY "contributors delete quiz_choix" ON "quiz_choix" FOR DELETE USING (public.is_contributor());--> statement-breakpoint

-- quiz_tentatives / quiz_reponses: historique privé par utilisateur,
-- immuable une fois soumis (pas de policy UPDATE), même esprit que
-- ressource_progress (0012_cool_hex.sql).
ALTER TABLE "quiz_tentatives" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "users read own tentatives" ON "quiz_tentatives" FOR SELECT
  USING (auth.uid() = user_id OR public.is_contributor());--> statement-breakpoint
CREATE POLICY "users insert own tentatives" ON "quiz_tentatives" FOR INSERT
  WITH CHECK (auth.uid() = user_id);--> statement-breakpoint

ALTER TABLE "quiz_reponses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "users read own reponses" ON "quiz_reponses" FOR SELECT
  USING (
    public.is_contributor()
    OR EXISTS (
      SELECT 1 FROM quiz_tentatives t
      WHERE t.id = tentative_id AND t.user_id = auth.uid()
    )
  );--> statement-breakpoint
CREATE POLICY "users insert own reponses" ON "quiz_reponses" FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quiz_tentatives t
      WHERE t.id = tentative_id AND t.user_id = auth.uid()
    )
  );