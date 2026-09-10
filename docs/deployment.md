# Déploiement & infrastructure

## Hébergement

- **App** : Vercel, build Next.js standard (`npm run build`).
- **Base de données + Auth** : Supabase (Postgres managé + Auth OAuth).
- **API externe** : Quran Foundation (`api.quran.foundation`) pour le lecteur
  Coran — pas d'infra à gérer, juste des credentials.

## ⚠️ Il n'y a qu'un seul environnement Supabase

`.env.local` de ce dépôt pointe vers le **projet Supabase de production**,
avec de vraies données utilisateurs. Il n'existe pas de base de
dev/staging séparée. Conséquences concrètes :

- `npm run db:seed` insère des données de démo **en production**.
- Toute migration (`db:migrate`) s'applique directement à la base réelle.
- Avant une migration qui modifie ou supprime des colonnes existantes,
  vérifier qu'elle est rétro-compatible avec la version actuellement déployée
  (le déploiement Vercel et la migration de base ne sont pas atomiques).

Si le projet grossit, la première amélioration d'infra à envisager est un
second projet Supabase pour le développement.

## Variables d'environnement

Toutes documentées avec leur provenance exacte dans `.env.example`. Résumé :

| Variable | Où la trouver | Usage |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | Client Supabase (browser + serveur) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | idem — clé publique, soumise à RLS |
| `DATABASE_URL` | Supabase → Project Settings → Database → **Connection string → Transaction pooler** | Connexion Drizzle directe (obligatoire en pooled pour tourner sur Vercel serverless) |
| `NEXT_PUBLIC_SITE_URL` | à définir soi-même | URL absolue utilisée pour les Open Graph images et liens canoniques |
| `CRON_SECRET` | à générer (`openssl rand -hex 32`) | Authentifie les appels de Vercel Cron vers `/api/cron/keep-alive` |
| `QURAN_CLIENT_ID` / `QURAN_CLIENT_SECRET` | Console développeur Quran Foundation | OAuth2 client-credentials pour l'API Coran (server-only) |

Le Client ID/Secret Google OAuth **ne sont pas** des variables d'env de
l'app — ils se configurent directement dans Supabase (Authentication →
Providers → Google). Next.js ne les voit jamais.

À chaque variable ajoutée : mettre à jour `.env.example` (avec commentaire
expliquant où la trouver) **et** les ajouter dans Vercel → Project Settings →
Environment Variables — les deux dérivent, rien n'est synchronisé
automatiquement.

## Cron

`vercel.json` déclare un unique cron :

```json
{ "path": "/api/cron/keep-alive", "schedule": "0 0 * * *" }
```

Appelle chaque jour `src/app/api/cron/keep-alive/route.ts`, qui fait une
requête `SELECT count(*)` triviale sur `cours`. Seul but : empêcher le projet
Supabase (plan gratuit) de se mettre en pause automatique après 7 jours
d'inactivité. La route vérifie le header `Authorization: Bearer
$CRON_SECRET` — Vercel l'envoie automatiquement pour les cron déclarés dans
`vercel.json`, mais **seulement si `CRON_SECRET` est défini dans les env vars
Vercel du projet** (sinon la route renvoie systématiquement 401, y compris
pour Vercel lui-même).

## Checklist de mise en production après clone/fork

1. Créer un projet Supabase, activer le provider Google dans
   Authentication → Providers.
2. Remplir `.env.local` (voir tableau ci-dessus).
3. `npm run db:migrate` pour créer tout le schéma + RLS + triggers.
4. Se connecter une première fois via l'app pour créer son propre `profiles`,
   puis le promouvoir `admin` à la main (Drizzle Studio ou table editor
   Supabase) — voir [`auth.md`](./auth.md#flux-de-connexion).
5. Déployer sur Vercel, copier toutes les env vars de `.env.local` +
   régénérer `CRON_SECRET` pour la prod (ne pas réutiliser celui du dev local).
6. Vérifier que `vercel.json` (cron) est bien pris en compte — visible dans
   Vercel → Project → Cron Jobs après le premier déploiement.
