# Base de données

Postgres géré par **Supabase**, schéma défini en code avec **Drizzle ORM**
(`src/lib/db/schema.ts`), migrations SQL générées dans `drizzle/migrations/`.

⚠️ **`.env.local` pointe vers le projet Supabase de production.** Le
développement se fait sur une base Supabase **locale** (Docker, voir
[`development.md`](./development.md)) via `.env.development.local`. Les
scripts sans suffixe `:local` (`db:migrate`, `db:studio`) ciblent la
production : voir [`deployment.md`](./deployment.md).

## Schéma (ERD)

```mermaid
erDiagram
    profiles ||--o{ cours : creates
    profiles ||--o{ thematiques : creates
    profiles ||--o{ ressources : adds
    profiles ||--o{ hadiths : adds
    profiles ||--o{ seances : creates
    profiles ||--o{ quiz : adds
    profiles ||--o{ ressource_progress : tracks
    profiles ||--o{ quiz_tentatives : attempts
    profiles ||--o{ quran_memorization : tracks
    profiles ||--o{ class_members : "member of"
    classes ||--o{ class_members : groups
    classes ||--o{ class_cours : follows
    cours ||--o{ class_cours : "followed via"
    classes ||--o{ class_ressource_unlocks : unlocks
    ressources ||--o{ class_ressource_unlocks : "unlocked via"
    classes ||--o{ class_quiz_unlocks : unlocks
    quiz ||--o{ class_quiz_unlocks : "unlocked via"

    cours ||--o{ thematiques : contains
    thematiques ||--o{ ressources : contains
    thematiques ||--o{ hadiths : contains
    thematiques ||--o{ quiz : contains
    thematiques ||--o{ seance_thematiques : "linked via"
    ressources ||--o{ seance_ressources : "linked via"
    ressources ||--o{ ressource_progress : "completed by"
    seances ||--o{ seance_thematiques : covers
    seances ||--o{ seance_ressources : covers
    quiz ||--o{ quiz_questions : contains
    quiz_questions ||--o{ quiz_choix : contains
    quiz ||--o{ quiz_tentatives : "attempted via"
    quiz_tentatives ||--o{ quiz_reponses : records
    quiz_questions ||--o{ quiz_reponses : "answered via"
    quiz_choix ||--o{ quiz_reponses : "selected via"

    profiles {
        uuid id PK "= auth.users.id"
        text email
        text full_name
        role role "admin | contributor | viewer"
    }
    cours {
        uuid id PK
        text slug UK
        text title
        cours_status status "published | coming_soon"
        uuid created_by FK
    }
    thematiques {
        uuid id PK
        uuid cours_id FK
        text slug UK
        text title
        int order_index
    }
    ressources {
        uuid id PK
        uuid thematique_id FK
        int order_index
        ressource_type type "video | pdf | lien | texte"
        ressource_status status "draft | published"
        text url
        text content
    }
    hadiths {
        uuid id PK
        uuid thematique_id FK
        text slug UK
        text arabic_text
        text translation_fr
        text translation_wolof
        text narrator
        text source
    }
    seances {
        uuid id PK
        text slug UK
        text title
        date session_date
        text summary
    }
    seance_thematiques {
        uuid seance_id FK
        uuid thematique_id FK
    }
    seance_ressources {
        uuid seance_id FK
        uuid ressource_id FK
    }
    ressource_progress {
        uuid user_id FK
        uuid ressource_id FK
        timestamp completed_at
    }
    quiz {
        uuid id PK
        uuid thematique_id FK
        int order_index
        ressource_status status "draft | published"
        int passing_score "0-100, défaut 80"
    }
    quiz_questions {
        uuid id PK
        uuid quiz_id FK
        int order_index
        text prompt
        question_type type "qcm | vrai_faux"
        text explanation
    }
    quiz_choix {
        uuid id PK
        uuid question_id FK
        int order_index
        text label
        boolean is_correct
    }
    quiz_tentatives {
        uuid id PK
        uuid quiz_id FK
        uuid user_id FK
        int score
        int total_questions
        timestamp completed_at
    }
    quiz_reponses {
        uuid tentative_id FK
        uuid question_id FK
        uuid choix_id FK
    }
    quran_memorization {
        uuid user_id FK
        int chapter_id
        int verse_number
        text verse_key UK "denormalisé, ex: 2:255"
        memorization_status status "en_cours | a_renforcer | maitrise"
        int review_box "boîte Leitner, 1..5 ; null si pas maitrise"
        timestamptz next_review_at "échéance de révision ; null si pas maitrise"
    }
    classes {
        uuid id PK
        text name
        text description
        text invite_code UK "8 caractères, régénérable"
        boolean invite_enabled
        uuid created_by FK
    }
    class_members {
        uuid class_id FK
        uuid user_id FK
        timestamptz joined_at
    }
    class_cours {
        uuid class_id FK
        uuid cours_id FK
        int order_index "ordre dans la feuille de route"
        timestamptz added_at
    }
    class_ressource_unlocks {
        uuid class_id FK
        uuid ressource_id FK
        timestamptz unlocked_at "pas de ligne = verrouillée"
    }
    class_quiz_unlocks {
        uuid class_id FK
        uuid quiz_id FK
        timestamptz unlocked_at "pas de ligne = verrouillé"
    }
```

Points notables :

- `profiles` **ne s'insère jamais depuis l'app** : un trigger Postgres
  (`handle_new_user`, dans `drizzle/migrations/0001_rls_and_profile_trigger.sql`)
  crée automatiquement une ligne à chaque `INSERT` dans `auth.users` (donc à
  chaque première connexion), avec `role` par défaut `viewer` (défaut de
  colonne, `drizzle/migrations/0003_default_viewer_role.sql`). Voir
  [`auth.md`](./auth.md).
- `seance_thematiques` et `seance_ressources` sont des tables de jointure pure
  (clé primaire composite, pas d'`id` propre) : une séance regroupe des
  thématiques et/ou des ressources ponctuelles déjà existantes, elle ne les
  possède pas (`onDelete: "cascade"` va dans le sens table de jointure →
  séance/ressource supprimée, pas l'inverse).
- `ressource_progress` a une clé primaire composite `(user_id, ressource_id)` :
  un utilisateur ne peut "compléter" une ressource qu'une fois.
- `quran_memorization` a une clé primaire composite `(user_id, verse_key)` —
  `verse_key` (`"chapitre:verset"`) est dénormalisé pour permettre un lookup
  direct côté client sans reconstruire la clé à partir de `chapter_id` +
  `verse_number`. Un index `(user_id, chapter_id)` accélère le chargement
  d'une sourate entière dans le lecteur. `review_box`/`next_review_at`
  pilotent la révision espacée (voir [`domain.md`](./domain.md#révision-espacée)) ;
  une migration de backfill (`0022_backfill_quran_memorization_review.sql`)
  initialise ces colonnes pour les versets `maitrise` déjà en base avant
  l'ajout de cette fonctionnalité.
- `class_members` a une clé primaire composite `(class_id, user_id)` (un
  étudiant n'est qu'une fois dans une classe, mais peut être dans plusieurs)
  et un index sur `user_id` pour retrouver les classes d'un étudiant.
  Supprimer une classe ou un profil supprime ses lignes en cascade, sans
  toucher à la progression de l'étudiant. `class_cours`, `class_ressource_unlocks`
  et `class_quiz_unlocks` suivent le même modèle (clé composite, cascade
  depuis la classe, le cours, la ressource ou le quiz). La table
  `class_unlocks` (déblocage par thématique) créée par `0024` a été remplacée
  par ces deux tables et supprimée par `0026`. Voir [`domain.md`](./domain.md#classes).
- `quiz_tentatives` conserve chaque tentative (pas seulement la meilleure) :
  `score`/`total_questions` sont dénormalisés au moment de la soumission,
  `quiz_reponses` détaille les choix cochés par question pour permettre
  d'afficher la correction après coup.
- Toutes les FK vers `cours`/`thematiques`/`quiz` sont en
  `onDelete: "cascade"` : supprimer un cours supprime en cascade ses
  thématiques, ressources, hadiths et quiz. Pas de confirmation
  supplémentaire côté DB — c'est `components/dashboard/delete-button.tsx` qui
  doit prévenir l'utilisateur.

## Row Level Security (RLS)

RLS est la **vraie** barrière de sécurité, pas les vérifications
`requireContributor()`/`requireAdmin()` côté app (celles-ci ne sont qu'une
défense en profondeur qui donne des messages d'erreur propres). Résumé (détail
dans `drizzle/migrations/0001_rls_and_profile_trigger.sql`,
`0006_hadiths_rls.sql`, `0013_flat_lifeguard.sql`,
`0019_quran_memorization_rls.sql`, `0023_classes.sql`, `0024_class_cours_unlocks.sql`,
`0025_class_item_unlocks.sql`, `0027_private_content_rls.sql`) :

| Table | Lecture | Écriture |
|---|---|---|
| `cours`, `thematiques`, `ressources`, `hadiths`, `seances`, `seance_*`, `quiz`, `quiz_questions`, `quiz_choix` | `admin` ou `contributor` uniquement (plus de lecture publique depuis `0027` : le contenu est réservé aux étudiants, et les étudiants le lisent via l'app, voir [`auth.md`](./auth.md#les-trois-couches-de-vérification)) | `admin` ou `contributor` (fonction SQL `is_contributor()`) |
| `profiles` | son propre profil ; tous pour `admin`/`contributor` (depuis `0027`) | `admin` uniquement (`is_admin()`), et seulement en `UPDATE` |
| `ressource_progress`, `quran_memorization` | l'utilisateur lui-même (`auth.uid() = user_id`) | l'utilisateur lui-même, sur ses propres lignes uniquement |
| `quiz_tentatives`, `quiz_reponses` | l'utilisateur lui-même (ses propres tentatives) | l'utilisateur lui-même, en `INSERT` seulement (pas d'édition d'une tentative passée) |
| `classes` | `admin` uniquement (**pas** de lecture publique : `invite_code` ouvrirait la classe à quiconque interroge l'API REST) | `admin` uniquement |
| `class_members` | `admin`, et l'étudiant pour ses propres lignes | `admin` uniquement (l'inscription par code passe par une Server Action, hors RLS) |
| `class_cours`, `class_ressource_unlocks`, `class_quiz_unlocks` | `admin`, et les membres de la classe concernée | `admin` uniquement |

`is_contributor()` et `is_admin()` sont des fonctions SQL `SECURITY DEFINER`
qui lisent `profiles.role` pour `auth.uid()`. Elles doivent rester en phase
avec `lib/auth/get-session.ts` (`requireContributor`/`requireAdmin`) — si tu
ajoutes un rôle ou changes la logique d'un côté, réplique de l'autre.

## Workflow de migration

1. Modifier `src/lib/db/schema.ts`.
2. Générer la migration SQL :
   ```bash
   npm run db:generate
   ```
   Drizzle Kit diff le schéma TypeScript contre l'état connu des migrations et
   écrit un nouveau fichier dans `drizzle/migrations/`.
3. **Relire le SQL généré.** Drizzle Kit ne sait pas générer du RLS, des
   triggers ou des fonctions SQL personnalisées — ces migrations-là
   (`0001`, `0003`, `0004`, `0006`...) ont été écrites/complétées à la main.
   Si ta modification touche une table déjà sous RLS, il faut ajouter les
   policies manquantes toi-même dans le fichier généré.
4. Appliquer **d'abord en local** :
   ```bash
   npm run db:migrate:local
   ```
   puis en production seulement après test et backup (voir
   [`deployment.md`](./deployment.md#migrer-la-production)) avec
   `npm run db:migrate`.
5. Committer le fichier de migration généré (et son entrée dans
   `drizzle/migrations/meta/`) avec le changement de schéma — les deux vont
   toujours ensemble dans le même commit.

Pour explorer la base sans SQL brut : `npm run db:studio:local` (Drizzle
Studio sur la base locale).

## Requêtes vs actions

- `src/lib/db/queries/*.ts` — lecture seule, utilisée par les Server
  Components (pages). Utilise `db.query.<table>.findMany/findFirst` (l'API
  relationnelle de Drizzle) plutôt que des `select().from().leftJoin()` manuels
  quand une relation déclarée dans `schema.ts` suffit.
- `src/lib/actions/*.ts` — écriture (`"use server"`), utilisée par les
  formulaires du dashboard. Toujours : auth check → validation zod → mutation
  Drizzle → `revalidatePath` → `redirect`. Voir
  [`how-to.md`](./how-to.md#ajouter-une-nouvelle-entité-crud) pour le pattern
  complet à copier.
