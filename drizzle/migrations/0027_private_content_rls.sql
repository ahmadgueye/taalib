-- Le catalogue n'est plus public : il est réservé aux étudiants de
-- l'institut, selon ce qui est débloqué pour leurs classes. L'app lit le
-- contenu via Drizzle (connexion directe, hors RLS) et filtre elle-même
-- (lib/auth/content-access.ts) ; aucune page ne lit le contenu via l'API
-- REST Supabase. On ferme donc l'API au public : seuls les contributeurs et
-- admins lisent le contenu par cette voie. Cela ferme aussi une fuite
-- existante : quiz_choix.is_correct (les bonnes réponses) était lisible par
-- n'importe qui avec la clé anon.
DROP POLICY "public read cours" ON "cours";--> statement-breakpoint
DROP POLICY "public read thematiques" ON "thematiques";--> statement-breakpoint
DROP POLICY "public read ressources" ON "ressources";--> statement-breakpoint
DROP POLICY "public read seances" ON "seances";--> statement-breakpoint
DROP POLICY "public read seance_thematiques" ON "seance_thematiques";--> statement-breakpoint
DROP POLICY "public read seance_ressources" ON "seance_ressources";--> statement-breakpoint
DROP POLICY "public read hadiths" ON "hadiths";--> statement-breakpoint
DROP POLICY "public read quiz" ON "quiz";--> statement-breakpoint
DROP POLICY "public read quiz_questions" ON "quiz_questions";--> statement-breakpoint
DROP POLICY "public read quiz_choix" ON "quiz_choix";--> statement-breakpoint
DROP POLICY "public read parcours" ON "parcours";--> statement-breakpoint
DROP POLICY "public read parcours_etapes" ON "parcours_etapes";--> statement-breakpoint
CREATE POLICY "contributors read cours" ON "cours" FOR SELECT USING (public.is_contributor());--> statement-breakpoint
CREATE POLICY "contributors read thematiques" ON "thematiques" FOR SELECT USING (public.is_contributor());--> statement-breakpoint
CREATE POLICY "contributors read ressources" ON "ressources" FOR SELECT USING (public.is_contributor());--> statement-breakpoint
CREATE POLICY "contributors read seances" ON "seances" FOR SELECT USING (public.is_contributor());--> statement-breakpoint
CREATE POLICY "contributors read seance_thematiques" ON "seance_thematiques" FOR SELECT USING (public.is_contributor());--> statement-breakpoint
CREATE POLICY "contributors read seance_ressources" ON "seance_ressources" FOR SELECT USING (public.is_contributor());--> statement-breakpoint
CREATE POLICY "contributors read hadiths" ON "hadiths" FOR SELECT USING (public.is_contributor());--> statement-breakpoint
CREATE POLICY "contributors read quiz" ON "quiz" FOR SELECT USING (public.is_contributor());--> statement-breakpoint
CREATE POLICY "contributors read quiz_questions" ON "quiz_questions" FOR SELECT USING (public.is_contributor());--> statement-breakpoint
CREATE POLICY "contributors read quiz_choix" ON "quiz_choix" FOR SELECT USING (public.is_contributor());--> statement-breakpoint
CREATE POLICY "contributors read parcours" ON "parcours" FOR SELECT USING (public.is_contributor());--> statement-breakpoint
CREATE POLICY "contributors read parcours_etapes" ON "parcours_etapes" FOR SELECT USING (public.is_contributor());--> statement-breakpoint
-- Les profils contiennent les e-mails : un étudiant ne lit plus que le sien
-- (avant : tout utilisateur connecté lisait tous les profils).
DROP POLICY "authenticated read profiles" ON "profiles";--> statement-breakpoint
CREATE POLICY "users read own profile" ON "profiles" FOR SELECT
  USING (auth.uid() = id OR public.is_contributor());
