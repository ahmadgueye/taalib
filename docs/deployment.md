# Déploiement & infrastructure

## Hébergement

- **App** : Vercel, build Next.js standard (`npm run build`).
- **Base de données + Auth** : Supabase (Postgres managé + Auth OAuth).
- **CI** : GitHub Actions (`.github/workflows/ci.yml`) sur chaque push/PR vers
  `main` : `lint` (0 warning toléré), `typecheck`, `test`, `build`.
- **API externe** : Quran Foundation (`api.quran.foundation`) pour le lecteur
  Coran — pas d'infra à gérer, juste des credentials.

## Environnements

| Environnement | Base | Fichier d'env | Usage |
|---|---|---|---|
| **Développement local** | Supabase local (Docker) | `.env.development.local` | Tout le développement et les tests manuels |
| **Production** | Projet Supabase hébergé (vrais utilisateurs) | `.env.local` + variables Vercel | Le site en ligne |

Le développement se fait sur une **base locale** (voir
[`development.md`](./development.md)). Next.js charge
`.env.development.local` avant `.env.local` en `next dev`, donc `npm run dev`
pointe vers le local sans rien faire. En `build`/`start`, ce fichier n'est
jamais chargé.

Il n'existe **pas encore de projet Supabase de dev/staging distant** :

- `.env.local` pointe toujours vers la **production**. Les commandes sans
  suffixe `:local` (`db:migrate`, `db:studio`) l'utilisent donc.
- `npm run db:seed` refuse de tourner contre une base non locale (garde-fou
  dans `src/lib/db/seed.ts`, contournable avec `ALLOW_REMOTE_DB=1`, à éviter).
- **Les déploiements preview Vercel** utilisent les variables d'environnement
  « Preview » de Vercel. Tant qu'elles reprennent celles de la production, un
  preview lit et écrit dans la base de production : s'en servir pour vérifier
  que le build passe, sans créer ni modifier de contenu.

### Migrer la production

1. Écrire et tester la migration **en local** (`db:migrate:local`).
2. Faire un backup de la base de production (Supabase → Database → Backups,
   ou `pg_dump`).
3. Vérifier qu'elle est rétro-compatible avec la version actuellement
   déployée (le déploiement Vercel et la migration de base ne sont pas
   atomiques).
4. Appliquer avec `npm run db:migrate` (cible la production via `.env.local`),
   puis déployer.

La suite logique de l'infra est un second projet Supabase hébergé pour le
dev/staging, branché sur les previews Vercel.

## Variables d'environnement

Toutes documentées avec leur provenance exacte dans `.env.example`. Résumé :

| Variable | Où la trouver | Usage |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | Client Supabase (browser + serveur) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | idem — clé publique, soumise à RLS |
| `DATABASE_URL` | Supabase → Project Settings → Database → **Connection string → Transaction pooler** | Connexion Drizzle directe (obligatoire en pooled pour tourner sur Vercel serverless) |
| `NEXT_PUBLIC_SITE_URL` | à définir soi-même (URL de production, ex. `https://taalib.vercel.app`) | URL absolue des Open Graph images, liens canoniques, `sitemap.xml` et `robots.txt`. Absente → `localhost`. |
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
2. Remplir `.env.local` (voir tableau ci-dessus) pour la prod, et
   `.env.development.local` pour le local (voir
   [`development.md`](./development.md)).
3. `npm run db:migrate` pour créer tout le schéma + RLS + triggers.
   Dans Supabase, ajouter l'URL du site (et `/**`) aux *Redirect URLs*
   d'Authentication → URL Configuration.
4. Se connecter une première fois via l'app pour créer son propre `profiles`,
   puis le promouvoir `admin` à la main (Drizzle Studio ou table editor
   Supabase) — voir [`auth.md`](./auth.md#flux-de-connexion).
5. Déployer sur Vercel, copier toutes les env vars de `.env.local` +
   régénérer `CRON_SECRET` pour la prod (ne pas réutiliser celui du dev local).
6. Vérifier que `vercel.json` (cron) est bien pris en compte — visible dans
   Vercel → Project → Cron Jobs après le premier déploiement.
