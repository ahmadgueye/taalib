CREATE TABLE "hadith_narrators" (
	"hadith_id" uuid NOT NULL,
	"narrator_id" uuid NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "hadith_narrators_hadith_id_narrator_id_pk" PRIMARY KEY("hadith_id","narrator_id")
);
--> statement-breakpoint
CREATE TABLE "narrators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hadith_narrators" ADD CONSTRAINT "hadith_narrators_hadith_id_hadiths_id_fk" FOREIGN KEY ("hadith_id") REFERENCES "public"."hadiths"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hadith_narrators" ADD CONSTRAINT "hadith_narrators_narrator_id_narrators_id_fk" FOREIGN KEY ("narrator_id") REFERENCES "public"."narrators"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "narrators" ADD CONSTRAINT "narrators_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "narrators_name_lower_idx" ON "narrators" USING btree (lower("name"));--> statement-breakpoint
-- Reprise de l'ancien champ texte libre : on découpe sur " et ", " & " et
-- ",", puis on crée un rapporteur par nom distinct (insensible à la casse) en
-- gardant l'ordre de saisie. Les variantes d'orthographe ("Boukhary",
-- "Al-Bukhârî"...) deviennent des rapporteurs distincts, à fusionner ensuite
-- à la main depuis /dashboard/rapporteurs.
-- Les annotations entre crochets ("[7280]", "[Authentique]") ne sont pas
-- des noms : on les ajoute à la suite de la source du hadith pour ne rien
-- perdre, puis on les retire du texte (avec le tiret qui les suivait) avant
-- le découpage.
UPDATE hadiths SET source = concat_ws(' ', nullif(trim(source), ''), (
  SELECT string_agg(t.m[1], ' ')
  FROM regexp_matches(narrator, '(\[[^]]*\])', 'g') AS t(m)
))
WHERE narrator ~ '\[[^]]*\]';--> statement-breakpoint
CREATE TEMP TABLE "_hadith_narrator_parts" AS
SELECT h.id AS hadith_id, trim(p.name) AS name, p.ord
FROM hadiths h,
LATERAL regexp_split_to_table(
  regexp_replace(
    regexp_replace(h.narrator, '\[[^]]*\]', '', 'g'),
    '^\s*-\s*|\s*-\s*$', '', 'g'
  ),
  '\s+(et|&)\s+|\s*,\s*', 'i'
) WITH ORDINALITY AS p(name, ord)
WHERE trim(p.name) <> '';--> statement-breakpoint
INSERT INTO "narrators" ("name")
SELECT DISTINCT ON (lower(name)) name
FROM "_hadith_narrator_parts"
ORDER BY lower(name), name;--> statement-breakpoint
INSERT INTO "hadith_narrators" ("hadith_id", "narrator_id", "order_index")
SELECT p.hadith_id, n.id, min(p.ord) - 1
FROM "_hadith_narrator_parts" p
JOIN "narrators" n ON lower(n.name) = lower(p.name)
GROUP BY p.hadith_id, n.id;--> statement-breakpoint
DROP TABLE "_hadith_narrator_parts";--> statement-breakpoint
-- RLS : même forme que hadiths depuis 0027_private_content_rls.sql —
-- lecture et écriture réservées aux contributeurs via l'API Supabase (l'app
-- lit via Drizzle et filtre elle-même l'accès des étudiants).
ALTER TABLE "narrators" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "contributors read narrators" ON "narrators" FOR SELECT USING (public.is_contributor());--> statement-breakpoint
CREATE POLICY "contributors write narrators" ON "narrators" FOR INSERT WITH CHECK (public.is_contributor());--> statement-breakpoint
CREATE POLICY "contributors update narrators" ON "narrators" FOR UPDATE USING (public.is_contributor());--> statement-breakpoint
CREATE POLICY "contributors delete narrators" ON "narrators" FOR DELETE USING (public.is_contributor());--> statement-breakpoint
ALTER TABLE "hadith_narrators" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "contributors read hadith_narrators" ON "hadith_narrators" FOR SELECT USING (public.is_contributor());--> statement-breakpoint
CREATE POLICY "contributors write hadith_narrators" ON "hadith_narrators" FOR INSERT WITH CHECK (public.is_contributor());--> statement-breakpoint
CREATE POLICY "contributors update hadith_narrators" ON "hadith_narrators" FOR UPDATE USING (public.is_contributor());--> statement-breakpoint
CREATE POLICY "contributors delete hadith_narrators" ON "hadith_narrators" FOR DELETE USING (public.is_contributor());--> statement-breakpoint
ALTER TABLE "hadiths" DROP COLUMN "narrator";