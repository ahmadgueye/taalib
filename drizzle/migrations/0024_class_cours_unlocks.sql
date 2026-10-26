CREATE TABLE "class_cours" (
	"class_id" uuid NOT NULL,
	"cours_id" uuid NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "class_cours_class_id_cours_id_pk" PRIMARY KEY("class_id","cours_id")
);
--> statement-breakpoint
CREATE TABLE "class_unlocks" (
	"class_id" uuid NOT NULL,
	"thematique_id" uuid NOT NULL,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "class_unlocks_class_id_thematique_id_pk" PRIMARY KEY("class_id","thematique_id")
);
--> statement-breakpoint
ALTER TABLE "class_cours" ADD CONSTRAINT "class_cours_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_cours" ADD CONSTRAINT "class_cours_cours_id_cours_id_fk" FOREIGN KEY ("cours_id") REFERENCES "public"."cours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_unlocks" ADD CONSTRAINT "class_unlocks_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_unlocks" ADD CONSTRAINT "class_unlocks_thematique_id_thematiques_id_fk" FOREIGN KEY ("thematique_id") REFERENCES "public"."thematiques"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Même logique que classes/class_members (0023_classes.sql) : écriture admin
-- uniquement ; un étudiant lit seulement ce qui concerne ses propres classes.
ALTER TABLE "class_cours" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "admins manage class_cours" ON "class_cours" FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());--> statement-breakpoint
CREATE POLICY "members read class_cours" ON "class_cours" FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.class_members m
    WHERE m.class_id = class_cours.class_id AND m.user_id = auth.uid()
  ));--> statement-breakpoint
ALTER TABLE "class_unlocks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "admins manage class_unlocks" ON "class_unlocks" FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());--> statement-breakpoint
CREATE POLICY "members read class_unlocks" ON "class_unlocks" FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.class_members m
    WHERE m.class_id = class_unlocks.class_id AND m.user_id = auth.uid()
  ));
