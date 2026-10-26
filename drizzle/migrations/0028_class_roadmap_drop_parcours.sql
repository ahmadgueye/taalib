-- La feuille de route de l'accueil est désormais générée par classe, à partir
-- des cours qu'elle suit (dans l'ordre choisi sur la page de la classe) et de
-- l'ordre des thématiques de chaque cours. Les parcours, saisis à la main, ne
-- servent plus : leurs tables sont supprimées (avec leurs policies RLS).
DROP TABLE "parcours" CASCADE;--> statement-breakpoint
DROP TABLE "parcours_etapes" CASCADE;--> statement-breakpoint
ALTER TABLE "class_cours" ADD COLUMN "order_index" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Les cours déjà rattachés gardent leur ordre d'ajout.
UPDATE "class_cours" cc SET "order_index" = ranked.rn
FROM (
  SELECT class_id, cours_id,
    row_number() OVER (PARTITION BY class_id ORDER BY added_at) - 1 AS rn
  FROM "class_cours"
) ranked
WHERE cc.class_id = ranked.class_id AND cc.cours_id = ranked.cours_id;
