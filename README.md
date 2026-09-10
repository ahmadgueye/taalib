# طالب (Taalib) — DeenShare

Plateforme d'apprentissage islamique : un site public (cours, hadiths, ressources,
séances, lecteur du Coran) et un tableau de bord d'administration pour créer et
organiser ce contenu.

Stack : **Next.js 16** (App Router) · **Supabase** (Auth + Postgres) · **Drizzle
ORM** · **Tailwind CSS v4** · déployé sur **Vercel**.

## Documentation

Toute la doc de fond vit dans [`docs/`](./docs) :

| Fichier | Contenu |
|---|---|
| [`docs/architecture.md`](./docs/architecture.md) | Structure du projet, route groups, pattern Server Components/Actions |
| [`docs/database.md`](./docs/database.md) | Schéma Drizzle, relations, migrations |
| [`docs/domain.md`](./docs/domain.md) | Modèle métier : cours → thématiques → ressources/hadiths, séances, progression, Coran |
| [`docs/auth.md`](./docs/auth.md) | Authentification Supabase, rôles, RLS |
| [`docs/how-to.md`](./docs/how-to.md) | Recettes : ajouter une entité CRUD, une migration, un champ de formulaire |
| [`docs/deployment.md`](./docs/deployment.md) | Vercel, variables d'environnement, cron |

Lis `AGENTS.md` avant de toucher au code : ce dépôt tourne sur une version de
Next.js volontairement en avance sur ce qu'un LLM connaît par cœur (ex :
`src/proxy.ts` remplace `middleware.ts`). La doc de Next.js correspondante est
vendue dans `node_modules/next/dist/docs/`.

## Démarrer en local

1. **Dépendances**
   ```bash
   npm install
   ```

2. **Variables d'environnement** — copier `.env.example` vers `.env.local` et
   remplir chaque valeur (voir les commentaires dans le fichier, et
   [`docs/deployment.md`](./docs/deployment.md) pour le détail de chaque
   variable).
   ```bash
   cp .env.example .env.local
   ```

3. **Base de données** — appliquer les migrations puis, en option, seed :
   ```bash
   npm run db:migrate
   npm run db:seed   # optionnel : jeu de données de démo
   ```

4. **Lancer le serveur de dev**
   ```bash
   npm run dev
   ```
   Ouvrir [http://localhost:3000](http://localhost:3000).

## Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run start` | Sert le build de production |
| `npm run lint` | ESLint |
| `npm run db:generate` | Génère une migration Drizzle à partir de `src/lib/db/schema.ts` |
| `npm run db:migrate` | Applique les migrations à la base pointée par `DATABASE_URL` |
| `npm run db:studio` | Ouvre Drizzle Studio (explorateur de la base) |
| `npm run db:seed` | Insère un jeu de données de démo |

## Avertissement important

`.env.local` de ce projet pointe vers un **projet Supabase en production**
utilisé par de vrais utilisateurs — il n'y a pas de base locale/dev séparée.
Ne pas lancer `db:seed` ou des migrations destructrices sans avoir vérifié
quelle base est ciblée.
