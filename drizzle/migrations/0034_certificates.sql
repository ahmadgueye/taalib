CREATE TABLE "certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"user_id" uuid NOT NULL,
	"thematique_id" uuid,
	"thematique_title" text NOT NULL,
	"cours_title" text NOT NULL,
	"lesson_titles" text[] NOT NULL,
	"quiz_titles" text[] NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "certificates_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_thematique_id_thematiques_id_fk" FOREIGN KEY ("thematique_id") REFERENCES "public"."thematiques"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "certificates_user_thematique_idx" ON "certificates" USING btree ("user_id","thematique_id");--> statement-breakpoint
-- RLS : les certificats ne s'écrivent que côté serveur (Drizzle), quand une
-- thématique est validée ; la page publique les lit aussi via Drizzle. Via
-- l'API Supabase, seuls les contributeurs peuvent les lire.
ALTER TABLE "certificates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "contributors read certificates" ON "certificates" FOR SELECT USING (public.is_contributor());
