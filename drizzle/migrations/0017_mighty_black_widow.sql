ALTER TABLE "parcours_etapes" DROP CONSTRAINT "parcours_etapes_parcours_id_cours_id_unique";--> statement-breakpoint
ALTER TABLE "parcours_etapes" DROP CONSTRAINT "parcours_etapes_cours_id_cours_id_fk";
--> statement-breakpoint
ALTER TABLE "parcours_etapes" ALTER COLUMN "thematique_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "parcours_etapes" DROP COLUMN "cours_id";--> statement-breakpoint
ALTER TABLE "parcours_etapes" ADD CONSTRAINT "parcours_etapes_parcours_id_thematique_id_unique" UNIQUE("parcours_id","thematique_id");