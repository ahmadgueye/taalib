-- parcours / parcours_etapes: contenu pédagogique, même forme que
-- cours/thematiques/ressources (voir 0001_rls_and_profile_trigger.sql) —
-- lecture publique, écriture réservée aux contributeurs.
ALTER TABLE "parcours" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read parcours" ON "parcours" FOR SELECT USING (true);
CREATE POLICY "contributors write parcours" ON "parcours" FOR INSERT WITH CHECK (public.is_contributor());
CREATE POLICY "contributors update parcours" ON "parcours" FOR UPDATE USING (public.is_contributor());
CREATE POLICY "contributors delete parcours" ON "parcours" FOR DELETE USING (public.is_contributor());

ALTER TABLE "parcours_etapes" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read parcours_etapes" ON "parcours_etapes" FOR SELECT USING (true);
CREATE POLICY "contributors write parcours_etapes" ON "parcours_etapes" FOR INSERT WITH CHECK (public.is_contributor());
CREATE POLICY "contributors update parcours_etapes" ON "parcours_etapes" FOR UPDATE USING (public.is_contributor());
CREATE POLICY "contributors delete parcours_etapes" ON "parcours_etapes" FOR DELETE USING (public.is_contributor());
