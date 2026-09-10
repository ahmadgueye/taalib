-- Custom SQL migration file, put your code below! --

-- Backfill: pick each étape's cours's first thématique (lowest order_index, then created_at) as the target.
UPDATE parcours_etapes pe
SET thematique_id = (
  SELECT t.id FROM thematiques t
  WHERE t.cours_id = pe.cours_id
  ORDER BY t.order_index ASC, t.created_at ASC
  LIMIT 1
)
WHERE pe.thematique_id IS NULL;

-- Orphans: étapes whose cours had zero thématiques cannot be backfilled and are dropped.
DELETE FROM parcours_etapes WHERE thematique_id IS NULL;