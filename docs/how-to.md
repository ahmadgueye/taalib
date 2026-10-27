# Recettes

Ce fichier existe pour éviter de redemander à une IA "comment on fait ça
déjà" — chaque recette pointe vers un exemple réel du repo à copier.

## Ajouter une nouvelle entité CRUD

Exemple de référence : **`cours`** (la plus simple — pas de champs custom
comme le markdown de `ressources` ou le drag & drop de `thematiques`).
Fichiers à créer/modifier, dans l'ordre :

1. **Schéma** — `src/lib/db/schema.ts` : ajouter la table (+ `relations()` si
   elle référence/est référencée par une autre table). Générer et appliquer :
   ```bash
   npm run db:generate
   npm run db:migrate:local   # teste d'abord sur la base locale
   ```
   La production ne reçoit la migration qu'après test et backup, voir
   [`deployment.md`](./deployment.md#migrer-la-production). Si l'entité doit être publiquement lisible mais éditable seulement par les
   contributeurs (le cas standard), ajouter les policies RLS à la main dans
   le fichier de migration généré — copier le bloc `cours` de
   `drizzle/migrations/0001_rls_and_profile_trigger.sql` (voir
   [`database.md`](./database.md#row-level-security-rls)).

2. **Requêtes de lecture** — `src/lib/db/queries/foo.ts` : `getAllFoo()`,
   `getFooById(id)`, `getFooBySlug(slug)` si l'entité a une page de détail
   publique. Copier `src/lib/db/queries/cours.ts`.

3. **Server Actions** — `src/lib/actions/foo.ts` (`"use server"` en première
   ligne) : `createFoo`, `updateFoo`, `deleteFoo`. Copier
   `src/lib/actions/cours.ts` tel quel et adapter le schéma zod + les champs.
   Ne pas oublier :
   - `requireContributor()` en première ligne de chaque action d'écriture ;
   - `revalidatePath()` sur la route liste du dashboard, la route publique
     équivalente, et `/` si l'entité apparaît sur l'accueil ;
   - `redirect()` après create/update, pas après delete (delete reste sur la
     page liste).

4. **Formulaire** — `src/components/dashboard/foo-form.tsx` (Client
   Component) : copier `cours-form.tsx`. Le pattern est toujours le même —
   `useActionState` branché sur `createFoo`/`updateFoo.bind(null, id)`,
   affichage de `state?.error` via `FieldError`.

5. **Table liste** — `src/components/dashboard/foo-table.tsx` : copier
   `cours-table.tsx` (tri par colonne via `sortable-table-head.tsx`, bouton
   suppression via `delete-button.tsx`).

6. **Pages dashboard** :
   - `src/app/(dashboard)/dashboard/foo/page.tsx` — liste, appelle
     `getAllFoo()`, rend `<FooTable>`.
   - `src/app/(dashboard)/dashboard/foo/new/page.tsx` — rend `<FooForm />`
     sans props.
   - `src/app/(dashboard)/dashboard/foo/[id]/edit/page.tsx` — `await params`,
     `getFooById(id)`, `notFound()` si absent, rend `<FooForm foo={f} />`.
   - Ajouter l'entrée dans `navItems` de
     `src/components/dashboard/dashboard-sidebar.tsx`.
   - Si l'entité a des sous-éléments imbriqués (ex : les questions d'un quiz),
     ajouter une page dédiée `dashboard/foo/[id]/sous-element/page.tsx` plutôt
     que de tout gérer dans le formulaire d'édition — voir
     `dashboard/quiz/[id]/questions/page.tsx` comme référence.

7. **Tests** — ajouter l'entité à la liste de `modules` de
   `src/lib/actions/authorization.test.ts` : le test vérifie que chaque action
   refuse un utilisateur non autorisé avant de toucher la base.

8. **Page(s) publique(s)**, si l'entité doit être visible côté site vitrine —
   suivre le pattern de `src/app/(public)/cours/page.tsx` et
   `src/app/(public)/cours/[slug]/page.tsx`. Pas d'`opengraph-image.tsx` par
   page : une page réservée n'est jamais vue par un réseau social (voir
   « Metadata / SEO » dans `architecture.md`).

## Ajouter un champ à un formulaire existant

1. `schema.ts` → `db:generate` → `db:migrate:local`.
2. Ajouter le champ au schéma zod dans `lib/actions/<entité>.ts` (create et
   update).
3. Lire le champ dans `formData.get("champ")` et l'inclure dans
   `db.insert()`/`db.update()`.
4. Ajouter le `<Field>` correspondant dans le composant `*-form.tsx`
   (`defaultValue={entité?.champ}` pour le pré-remplir en édition).
5. Si le champ doit s'afficher dans la table liste ou côté public, mettre à
   jour `*-table.tsx` et/ou la page publique concernée.

## Ajouter une migration qui touche RLS ou un trigger

Drizzle Kit ne sait générer que du DDL "standard" (créer/modifier des
tables/colonnes). Les policies RLS, triggers et fonctions SQL
(`is_contributor()`, `handle_new_user()`, etc.) sont écrits à la main dans les
fichiers de migration. Workflow :

1. `npm run db:generate` pour le DDL de base (colonnes/tables).
2. Ouvrir le fichier généré dans `drizzle/migrations/` et ajouter le SQL brut
   nécessaire (policies, triggers) à la suite — regarder
   `drizzle/migrations/0006_hadiths_rls.sql` comme exemple d'une migration
   RLS ajoutée après coup sur une table existante.
3. `npm run db:migrate:local`, puis en production seulement après test et
   backup (voir [`deployment.md`](./deployment.md#migrer-la-production)).

## Réinitialiser / peupler la base locale avec des données de démo

```bash
npm run db:local:reset   # repart d'une base locale vide + migrations
npm run db:seed:local    # données de démo (src/lib/db/seed.ts)
```

`npm run db:seed` (sans `:local`) refuse de tourner contre une base distante.

## Copier le contenu de la production en local

Pour développer avec du vrai contenu (cours, hadiths, quiz...) sans copier
d'utilisateurs ni de progression : un `pg_dump --data-only` des tables de
contenu (`cours`, `thematiques`, `ressources`, `hadiths`, `quiz`,
`quiz_questions`, `quiz_choix`, `seances`, `seance_thematiques`,
`seance_ressources`), chargé dans la base
locale après un `TRUNCATE ... CASCADE`. Points d'attention rencontrés :

- ne pas utiliser `--disable-triggers` (demande un super-utilisateur, absent
  du Supabase local) ;
- préfixer les tables par `public.` (`-t public.cours`) ;
- les colonnes `created_by` / `added_by` référencent des profils qui
  n'existent pas en local : retirer temporairement ces contraintes de clé
  étrangère, mettre les colonnes à `NULL`, puis les recréer, dans une seule
  transaction ;
- le dump vide le `search_path` : préfixer les tables par `public.` dans le
  SQL de chargement.

C'est une **lecture** de la production : ne jamais écrire dans la base
distante.

## Explorer la base sans écrire de SQL

```bash
npm run db:studio:local   # base locale
npm run db:studio         # ⚠️ base de .env.local = production
```

Ouvre Drizzle Studio dans le navigateur. Pour promouvoir un compte `admin`
en local, voir [`auth.md`](./auth.md#en-local).

## Écrire un test pour une Server Action

Copier le pattern de `src/lib/actions/progress.test.ts` : `vi.hoisted` pour
déclarer les mocks, `vi.mock("@/lib/auth/get-session")` pour choisir le
profil, `vi.mock("@/lib/db")` avec une chaîne minimale
(`insert().values().onConflictDoNothing()`...) et `vi.mock("next/cache")`.
Tester au minimum : visiteur anonyme refusé, payload invalide refusé, cas
nominal (en vérifiant l'`userId` écrit), cas limites métier. Voir
[`development.md`](./development.md#tests).

## Ajouter une route API (hors CRUD dashboard)

Utile seulement pour du contenu consommé côté client (fetch) ou par un
service externe (cron, webhook) — pas pour des mutations liées à un
formulaire (ça, c'est une Server Action). Exemple de référence :
`src/app/api/quran/recitations/route.ts` (proxy simple vers une API
externe) ou `src/app/api/cron/keep-alive/route.ts` (protégé par un secret
dans le header `Authorization`, voir [`deployment.md`](./deployment.md#cron)).
