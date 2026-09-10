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
   npm run db:migrate
   ```
   Si l'entité doit être publiquement lisible mais éditable seulement par les
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

7. **Page(s) publique(s)**, si l'entité doit être visible côté site vitrine —
   suivre le pattern de `src/app/(public)/cours/page.tsx` et
   `src/app/(public)/cours/[slug]/page.tsx` (+ `opengraph-image.tsx` si
   l'entité a une page de détail dédiée, voir
   `src/app/(public)/cours/[slug]/opengraph-image.tsx`).

## Ajouter un champ à un formulaire existant

1. `schema.ts` → `db:generate` → `db:migrate`.
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
3. `npm run db:migrate`.

## Réinitialiser / peupler la base avec des données de démo

```bash
npm run db:seed
```

Voir `src/lib/db/seed.ts`. ⚠️ Cible la base pointée par `DATABASE_URL` dans
`.env.local` — sur ce projet, c'est la base de **production** (voir
[`deployment.md`](./deployment.md)). Ne pas lancer sans avoir vérifié la
cible.

## Explorer la base sans écrire de SQL

```bash
npm run db:studio
```

Ouvre Drizzle Studio dans le navigateur — permet de lire/éditer les lignes
directement, utile pour promouvoir manuellement le premier compte `admin`
(voir [`auth.md`](./auth.md#flux-de-connexion)).

## Ajouter une route API (hors CRUD dashboard)

Utile seulement pour du contenu consommé côté client (fetch) ou par un
service externe (cron, webhook) — pas pour des mutations liées à un
formulaire (ça, c'est une Server Action). Exemple de référence :
`src/app/api/quran/recitations/route.ts` (proxy simple vers une API
externe) ou `src/app/api/cron/keep-alive/route.ts` (protégé par un secret
dans le header `Authorization`, voir [`deployment.md`](./deployment.md#cron)).
