# Développement local

Le développement tourne sur une **base Supabase locale** dans Docker, isolée
de la production. Rien de ce qu'on fait en local n'atteint la production.

## Prérequis

- Node 20+ (la CI utilise Node 22) et Docker Desktop lancé.
- La CLI Supabase est une dépendance du projet (`devDependencies`) : pas
  d'installation globale, tout passe par `npm run` / `npx supabase`.

## Première mise en route

```bash
npm install
npm run db:local:start      # Postgres, Auth, Storage, Studio dans Docker
```

La commande affiche l'URL de l'API, la clé anon et la `DATABASE_URL` locales.
Créer `.env.development.local` avec ces valeurs (modèle dans `.env.example`,
section « Local ») et y copier `CRON_SECRET`, `QURAN_CLIENT_ID` et
`QURAN_CLIENT_SECRET` depuis `.env.local`. Ce fichier est ignoré par git.

```bash
npm run db:migrate:local    # applique les migrations Drizzle
npm run db:seed:local       # données de démo (optionnel)
npm run dev                 # http://localhost:3000
```

`.env.development.local` est chargé avant `.env.local` par `next dev` : en
local, l'app lit la base locale sans configuration supplémentaire. En
`build` / `start` (donc en production), il n'est jamais chargé.

| Service local | URL |
|---|---|
| Application | http://localhost:3000 |
| API Supabase | http://127.0.0.1:54321 |
| Studio (éditeur de tables) | http://127.0.0.1:54323 |
| Mailpit (e-mails interceptés) | http://127.0.0.1:54324 |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

Si le port 3000 est occupé, Next.js bascule sur 3001 : la connexion par lien
magique, elle, est autorisée pour le port 3000 (voir
[`auth.md`](./auth.md#en-local)). Libérer le port 3000.

## Commandes utiles

| Commande | Effet |
|---|---|
| `npm run db:local:start` / `db:local:stop` | Démarre / arrête la stack (les données sont conservées) |
| `npm run db:local:reset` | Repart d'une base locale vide, puis réapplique les migrations |
| `npm run db:migrate:local` | Migrations vers la base locale |
| `npm run db:seed:local` | Données de démo vers la base locale |
| `npm run db:studio:local` | Drizzle Studio sur la base locale |
| `npm run db:migrate` | ⚠️ Migrations vers la **production** (`.env.local`) |
| `npm run db:studio` | ⚠️ Drizzle Studio sur la **production** |
| `npm run db:seed` | Refuse de tourner hors base locale |
| `npm test` / `npm run test:watch` | Tests Vitest |
| `npm run lint` | ESLint, **0 warning toléré** |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |

La config de la stack locale est dans `supabase/config.toml` (ports, URL de
redirection d'authentification). Le schéma, lui, vient de `drizzle/migrations`
et **non** de `supabase/migrations` : on n'utilise pas les migrations de la CLI
Supabase.

## Avoir du vrai contenu en local

Voir [`how-to.md`](./how-to.md#copier-le-contenu-de-la-production-en-local).
Les utilisateurs et leur progression ne sont jamais copiés.

## Tests

`npm test` (Vitest, environnement node, `src/**/*.test.ts`). Les tests ne
nécessitent ni Docker ni réseau : `@/lib/db`, Supabase et `next/cache` sont
simulés.

| Fichier | Ce qu'il garantit |
|---|---|
| `lib/actions/quiz-tentatives.test.ts` | Score calculé depuis la base (jamais depuis le client), choix multiples exacts, choix falsifiés ignorés, tentative enregistrée pour l'utilisateur connecté, quiz brouillon refusé |
| `lib/auth/get-session.test.ts` | `requireContributor` / `requireAdmin` selon viewer, contributor, admin, anonyme |
| `lib/actions/authorization.test.ts` | **Chaque** Server Action du dashboard refuse un utilisateur non autorisé avant de toucher la base |
| `lib/actions/users.test.ts` | Rôle invalide refusé, impossible de retirer le dernier admin |
| `lib/actions/progress.test.ts` | Seule une ressource publiée est complétable, pour l'utilisateur connecté |
| `lib/actions/memorization.test.ts` | Bornes des sourates/versets, plage `1..N`, retour en arrière |
| `lib/actions/quiz-questions.schema.test.ts` | Validation du formulaire de questions |
| `lib/db/queries/parcours.test.ts` | États `locked` / `active` / `completed` d'un parcours |

Non couvert : les politiques RLS en base (elles demandent la base locale), les
composants et pages, et tout test de bout en bout dans un navigateur.

Règle d'équipe : toute correction de bug ou nouvelle Server Action arrive avec
son test. Pour en écrire un, voir
[`how-to.md`](./how-to.md#écrire-un-test-pour-une-server-action).

## Validation manuelle

[`validation-checklist.md`](./validation-checklist.md) liste les parcours à
dérouler à la main avant une mise en production importante.

## Flux de travail Git

- On développe sur la branche **`dev`**, jamais directement sur `main`
  (`main` = ce qui est en production).
- Une tranche prête est poussée sur `dev` : Vercel crée un déploiement
  *preview* pour vérifier que le build passe (attention : un preview utilise la
  base de production tant que les variables Preview de Vercel n'ont pas été
  séparées, voir [`deployment.md`](./deployment.md#environnements)).
- On fusionne dans `main` par pull request, la CI (lint, typecheck, test,
  build) doit être verte.
- **La doc suit le code** : tout changement de comportement, de schéma, de
  script, de variable d'environnement, de rôle ou de workflow met à jour la
  doc concernée (`docs/`, `README.md`, checklist) dans le même commit ou
  juste après.
- Un changement de schéma suit
  [`deployment.md`](./deployment.md#migrer-la-production) : test en local,
  backup, migration, puis déploiement.
