CREATE TABLE "class_quiz_unlocks" (
	"class_id" uuid NOT NULL,
	"quiz_id" uuid NOT NULL,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "class_quiz_unlocks_class_id_quiz_id_pk" PRIMARY KEY("class_id","quiz_id")
);
--> statement-breakpoint
CREATE TABLE "class_ressource_unlocks" (
	"class_id" uuid NOT NULL,
	"ressource_id" uuid NOT NULL,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "class_ressource_unlocks_class_id_ressource_id_pk" PRIMARY KEY("class_id","ressource_id")
);
--> statement-breakpoint
ALTER TABLE "class_quiz_unlocks" ADD CONSTRAINT "class_quiz_unlocks_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_quiz_unlocks" ADD CONSTRAINT "class_quiz_unlocks_quiz_id_quiz_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quiz"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_ressource_unlocks" ADD CONSTRAINT "class_ressource_unlocks_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_ressource_unlocks" ADD CONSTRAINT "class_ressource_unlocks_ressource_id_ressources_id_fk" FOREIGN KEY ("ressource_id") REFERENCES "public"."ressources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Même logique que class_cours (0024_class_cours_unlocks.sql) : écriture
-- admin uniquement ; un étudiant lit seulement les déblocages de ses classes.
ALTER TABLE "class_ressource_unlocks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "admins manage class_ressource_unlocks" ON "class_ressource_unlocks" FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());--> statement-breakpoint
CREATE POLICY "members read class_ressource_unlocks" ON "class_ressource_unlocks" FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.class_members m
    WHERE m.class_id = class_ressource_unlocks.class_id AND m.user_id = auth.uid()
  ));--> statement-breakpoint
ALTER TABLE "class_quiz_unlocks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "admins manage class_quiz_unlocks" ON "class_quiz_unlocks" FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());--> statement-breakpoint
CREATE POLICY "members read class_quiz_unlocks" ON "class_quiz_unlocks" FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.class_members m
    WHERE m.class_id = class_quiz_unlocks.class_id AND m.user_id = auth.uid()
  ));
