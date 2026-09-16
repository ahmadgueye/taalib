-- Donnée strictement privée à l'utilisateur (pas de policy contributeur,
-- contrairement à ressource_progress). Contrairement à ressource_progress
-- (insert/delete seulement), le statut de mémorisation a un état
-- intermédiaire modifiable (cycle en_cours -> a_renforcer -> maitrise), donc
-- une policy UPDATE est nécessaire pour que onConflictDoUpdate fonctionne
-- sous RLS.
ALTER TABLE "quran_memorization" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own memorization" ON "quran_memorization" FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "users insert own memorization" ON "quran_memorization" FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own memorization" ON "quran_memorization" FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own memorization" ON "quran_memorization" FOR DELETE
  USING (auth.uid() = user_id);
