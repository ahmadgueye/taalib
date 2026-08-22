CREATE TABLE "ressource_progress" (
	"user_id" uuid NOT NULL,
	"ressource_id" uuid NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ressource_progress_user_id_ressource_id_pk" PRIMARY KEY("user_id","ressource_id")
);
--> statement-breakpoint
ALTER TABLE "ressource_progress" ADD CONSTRAINT "ressource_progress_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ressource_progress" ADD CONSTRAINT "ressource_progress_ressource_id_ressources_id_fk" FOREIGN KEY ("ressource_id") REFERENCES "public"."ressources"("id") ON DELETE cascade ON UPDATE no action;

-- Progress is private to each user; contributors/admins can also read it
-- (e.g. for future completion-rate reporting). No UPDATE policy: toggling
-- completion is an insert/delete, there's no intermediate state to flip.
ALTER TABLE "ressource_progress" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own progress" ON "ressource_progress" FOR SELECT
  USING (auth.uid() = user_id OR public.is_contributor());
CREATE POLICY "users insert own progress" ON "ressource_progress" FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own progress" ON "ressource_progress" FOR DELETE
  USING (auth.uid() = user_id);