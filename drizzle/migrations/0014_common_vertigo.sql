CREATE TABLE "parcours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parcours_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "parcours_etapes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parcours_id" uuid NOT NULL,
	"cours_id" uuid NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parcours_etapes_parcours_id_cours_id_unique" UNIQUE("parcours_id","cours_id")
);
--> statement-breakpoint
ALTER TABLE "quiz" ADD COLUMN "passing_score" integer DEFAULT 80 NOT NULL;--> statement-breakpoint
ALTER TABLE "parcours" ADD CONSTRAINT "parcours_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcours_etapes" ADD CONSTRAINT "parcours_etapes_parcours_id_parcours_id_fk" FOREIGN KEY ("parcours_id") REFERENCES "public"."parcours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcours_etapes" ADD CONSTRAINT "parcours_etapes_cours_id_cours_id_fk" FOREIGN KEY ("cours_id") REFERENCES "public"."cours"("id") ON DELETE cascade ON UPDATE no action;