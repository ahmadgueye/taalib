# طالب (Taalib) — DeenShare

Plateforme de cours du programme **Bayān** ([bayanun.com](https://bayanun.com)) : un espace étudiants
(feuille de route, cours, quiz, hadiths, ressources, séances), où chaque classe
n'accède qu'aux ressources que l'enseignant a débloquées ; un lecteur du Coran
ouvert à tous, avec suivi de mémorisation pour les connectés ; et un tableau de
bord d'administration pour créer le contenu, gérer les classes et débloquer
les ressources au fil des semaines.

Stack : **Next.js 16** (App Router) · **Supabase** (Auth + Postgres) · **Drizzle
ORM** · **Tailwind CSS v4** · **Vitest** · déployé sur **Vercel** (CI GitHub
Actions : lint, typecheck, test, build).

## Documentation

Toute la doc de fond vit dans [`docs/`](./docs) :

| Fichier | Contenu |
|---|---|
| [`docs/architecture.md`](./docs/architecture.md) | Structure du projet, route groups, pattern Server Components/Actions |
| [`docs/database.md`](./docs/database.md) | Schéma Drizzle, relations, migrations |
| [`docs/domain.md`](./docs/domain.md) | Modèle métier : cours → thématiques → ressources/hadiths, séances, progression, Coran |
| [`docs/auth.md`](./docs/auth.md) | Authentification Supabase, rôles, RLS |
| [`docs/development.md`](./docs/development.md) | Environnement local (Supabase Docker), commandes, tests, flux Git |
| [`docs/how-to.md`](./docs/how-to.md) | Recettes : ajouter une entité CRUD, une migration, un champ de formulaire, un test |
| [`docs/validation-checklist.md`](./docs/validation-checklist.md) | Checklist de validation manuelle avant mise en production |
| [`docs/deployment.md`](./docs/deployment.md) | Vercel, variables d'environnement, cron |

Lis `AGENTS.md` avant de toucher au code : ce dépôt tourne sur une version de
Next.js volontairement en avance sur ce qu'un LLM connaît par cœur (ex :
`src/proxy.ts` remplace `middleware.ts`). La doc de Next.js correspondante est
vendue dans `node_modules/next/dist/docs/`.

## Démarrer en local

Le développement tourne sur une **base Supabase locale** (Docker), isolée de
la production. Détail, commandes et tests : [`docs/development.md`](./docs/development.md).

1. **Prérequis** : Node, Docker Desktop lancé.

2. **Dépendances**
   ```bash
   npm install
   ```

3. **Lancer Supabase en local** (Postgres, Auth, Storage, Studio)
   ```bash
   npm run db:local:start
   ```
   La commande affiche les URL et clés locales. Studio : http://127.0.0.1:54323,
   boîte mail de test (magic links) : http://127.0.0.1:54324.

4. **Variables d'environnement** — créer `.env.development.local` (voir
   `.env.example`, section "Local") avec les valeurs affichées à l'étape
   précédente. Next.js le charge en priorité sur `.env.local` en dev, donc
   `npm run dev` pointe vers le local.

5. **Base de données**
   ```bash
   npm run db:migrate:local
   npm run db:seed:local   # jeu de données de démo
   ```

6. **Serveur de dev**
   ```bash
   npm run dev
   ```
   Ouvrir [http://localhost:3000](http://localhost:3000). Arrêter la stack
   locale avec `npm run db:local:stop`.

## Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run start` | Sert le build de production |
| `npm run lint` | ESLint (0 warning toléré) |
| `npm run typecheck` | Génération des types de routes + `tsc --noEmit` |
| `npm test` | Tests Vitest |
| `npm run db:studio:local` | Drizzle Studio sur la base locale |
| `npm run db:generate` | Génère une migration Drizzle à partir de `src/lib/db/schema.ts` |
| `npm run db:migrate:local` | Applique les migrations à la base locale |
| `npm run db:migrate` | Applique les migrations à la base de `.env.local` (**production**) |
| `npm run db:studio` | Drizzle Studio sur la base de `.env.local` (**production**) |
| `npm run db:seed:local` | Insère un jeu de données de démo en local |
| `npm run db:seed` | Refuse de tourner hors base locale (sauf `ALLOW_REMOTE_DB=1`) |
| `npm run db:local:start` / `db:local:stop` / `db:local:reset` | Gère la stack Supabase locale |

## Avertissement important

`.env.local` de ce projet pointe vers le projet Supabase de **production**,
utilisé par de vrais utilisateurs. `npm run db:migrate` (sans `:local`) cible
cette base : ne l'utiliser que pour déployer une migration déjà testée en
local, après un backup.
