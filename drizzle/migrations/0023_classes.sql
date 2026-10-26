CREATE TABLE "class_members" (
	"class_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "class_members_class_id_user_id_pk" PRIMARY KEY("class_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"invite_code" text NOT NULL,
	"invite_enabled" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "classes_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
ALTER TABLE "class_members" ADD CONSTRAINT "class_members_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_members" ADD CONSTRAINT "class_members_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "class_members_user_idx" ON "class_members" USING btree ("user_id");--> statement-breakpoint
-- Classes : gérées par les admins uniquement. Contrairement au contenu, pas
-- de lecture publique : invite_code donnerait accès à la classe à quiconque
-- interroge l'API REST avec la clé anon. Un étudiant lit ses classes via ses
-- propres lignes class_members ; l'inscription par code passe par une Server
-- Action (connexion Drizzle directe, hors RLS).
ALTER TABLE "classes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "admins manage classes" ON "classes" FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());--> statement-breakpoint
ALTER TABLE "class_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "admins manage class_members" ON "class_members" FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());--> statement-breakpoint
CREATE POLICY "users read own class_members" ON "class_members" FOR SELECT
  USING (auth.uid() = user_id);
