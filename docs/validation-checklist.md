# Checklist de validation manuelle

Modèle réutilisable : à dérouler sur l'app locale (voir
[`development.md`](./development.md)) avant une mise en production
importante. Pour chaque ligne, noter OK / Bug / Bizarre (+ une phrase).
Tester d'abord sur **desktop**, puis une passe rapide en fenêtre étroite
(≈ 400 px) pour anticiper le mobile. Copier ce fichier (ou cocher une copie)
plutôt que d'y écrire les résultats : il doit rester vierge.

Boîte mail de test (liens magiques) : http://127.0.0.1:54324
Studio (changer un rôle dans `public.profiles`) : http://127.0.0.1:54323

## 0. Préparation
- [ ] Docker lancé, `npm run db:local:start` OK
- [ ] http://localhost:3000 s'affiche avec le contenu attendu (copie de la prod
      ou seed)

## 1. Visiteur non connecté
- [ ] Accueil : vitrine avec « Se connecter », « Rejoindre une classe »,
      « Lire le Coran » ; aucun cours, parcours ni thématique affiché
- [ ] `/cours`, `/thematiques/...`, `/ressources/...`, `/quiz/...`,
      `/hadiths`, `/seances`, `/recherche` redirigent vers
      `/login?next=...`, et on revient sur la page après connexion
- [ ] `/coran` : liste des sourates, lecture, audio (bandeau en bas), mode
      Zen, changement de récitateur
- [ ] Sourates à cheval sur deux pages : **94** (Ash-Sharh, 8 versets) s'affiche
      en entier ; 114 (une page) et 2 (nombreuses pages) se chargent bien
- [ ] `/compte`, `/memorisation`, `/dashboard` redirigent vers `/login`
- [ ] Thème clair/sombre, navigation, pied de page, page 404
- [ ] `/sitemap.xml` (accueil et `/coran` seulement) et `/robots.txt`
      répondent

## 2. Connexion
- [ ] `/login` : saisir un e-mail → message « Un lien de connexion… »
- [ ] Lien reçu dans Mailpit → arrivée sur `/compte` (nouveau compte) pour
      renseigner le nom
- [ ] Après le nom : retour vers la page demandée (ex. partir de
      `/memorisation`)
- [ ] Déconnexion puis reconnexion avec le même e-mail
- [ ] Un compte neuf est `viewer` : il n'a aucun message d'attente ni
      indication de dashboard ; `/dashboard` le renvoie vers l'accueil avec le
      toast « Bienvenue sur Taalib ! »

## 3. Apprenant connecté (rôle viewer)
Inscrire le compte dans une classe qui suit au moins un cours, et débloquer
quelques ressources et un quiz depuis `/dashboard/classes`.
- [ ] Sans classe : l'accueil propose de rejoindre une classe, `/cours` est vide
- [ ] Dans une classe qui ne suit aucun cours : « Ta classe n'a pas encore de
      cours », sans bouton « Rejoindre »
- [ ] Accueil : feuille de route du parcours avec les étapes des cours de la
      classe ; une étape pas encore débloquée est « À venir » (sablier, pas de
      lien) ; aucune étape d'un autre cours
- [ ] Avec classe : `/cours` ne montre que les cours de la classe ; un cours
      sans rien de débloqué affiche « sera débloqué au fil des séances »
- [ ] Une thématique n'apparaît que si un de ses éléments est débloqué, avec
      uniquement les ressources/quiz débloqués et ses hadiths
- [ ] Ouvrir l'URL d'une ressource, d'un quiz ou d'un cours non débloqué →
      « Page introuvable », titre d'onglet générique
- [ ] Sur la dernière ressource débloquée : pas de « chapitre suivant » vers
      une ressource verrouillée
- [ ] Recherche, ⌘K et `/recherche` : uniquement du contenu débloqué ; mot
      français avec accent, mot arabe, filtre par type (la recherche est
      sensible aux accents, c'est une limite connue)
- [ ] `/hadiths`, `/seances` : uniquement ce qui touche au
      contenu débloqué
- [ ] Débloquer une ressource côté enseignant → elle apparaît pour l'étudiant
      au rechargement ; la reverrouiller → elle disparaît
- [ ] Une ressource de chaque type (vidéo, PDF, lien, texte) s'affiche
- [ ] Terminer une ressource : on la marque comme terminée **en cliquant sur le
      bouton « suivant » en bas de la page** (pas de décochage)
- [ ] Progression d'un cours / d'une thématique (anneau, compteur) mise à jour
- [ ] `/compte` : progression globale cohérente
- [ ] Quiz : répondre faux → score et corrections (bonnes réponses révélées
      seulement après envoi)
- [ ] Quiz : répondre juste ≥ seuil → badge de réussite
- [ ] Quiz : question à choix multiples (partiellement juste = faux)
- [ ] Rejouer un quiz : le meilleur score est conservé
- [ ] `/compte` : section Quiz listant les quiz tentés (meilleur score,
      nombre de tentatives) ; cliquer ouvre `/quiz/[id]/historique`
- [ ] `/quiz/[id]/historique` : liste chronologique des tentatives (date,
      score) ; cliquer une tentative ouvre son détail avec la correction
      complète
- [ ] Parcours : réussir le quiz de l'étape 1 débloque l'étape 2 ; une étape
      sans quiz se débloque automatiquement
- [ ] Mémorisation : toucher un verset → statut (en cours / à renforcer /
      maîtrisé) et retour à « aucun »
- [ ] `/memorisation` : tableau de bord et progression par sourate ; définir
      « N versets mémorisés » sur une sourate, puis réduire le nombre
- [ ] Marquer un verset « maîtrisé » → bandeau « à réviser » sur
      `/memorisation` et cloche du header (badge + aperçu) s'allument
- [ ] `/memorisation/revision` : le verset apparaît, « Relire ce verset »
      ramène au bon endroit dans `/coran` ; dans les deux sections (« à
      renforcer » et « échéance de révision »), « Je me souviens » passe/
      repasse le verset en maîtrisé et le retire de la liste, « J'ai
      oublié » le (re)passe en « à renforcer »
- [ ] Rafraîchir la page : tout est conservé

## 4. Contributeur / administrateur
Passer le compte en `contributor` puis `admin` dans Studio
(`public.profiles` → `role`).
- [ ] `/dashboard` : accessible, statistiques cohérentes
- [ ] Cours : créer, modifier, supprimer ; statut `coming_soon` ↔ `published`
- [ ] Thématiques : créer, glisser-déposer pour réordonner, supprimer
- [ ] Ressources : créer chaque type (vidéo, PDF upload, lien, texte
      markdown), brouillon invisible côté public, réordonner
- [ ] Hadiths : créer avec arabe + FR obligatoire, wolof optionnel
- [ ] Quiz : créer, ajouter questions QCM et vrai/faux, plusieurs bonnes
      réponses, brouillon invisible et non soumissible côté public
- [ ] Séances : créer avec thématiques et ressources rattachées
- [ ] Parcours : créer, ajouter/retirer/réordonner des étapes
- [ ] Utilisateurs (admin) : changer un rôle ; impossible de retirer le
      dernier admin
- [ ] Quiz → icône « Soumissions » : stats (tentatives, étudiants, score
      moyen, taux de réussite), réussite par question, une ligne par étudiant
      (meilleur score, dernière tentative) ; cliquer une ligne ouvre un modal
      avec toutes ses tentatives
- [ ] Classes (admin) : créer une classe → un code d'invitation est généré ;
      « Copier le lien », « Nouveau code » (l'ancien lien affiche « Code
      invalide »), fermer/rouvrir les inscriptions
- [ ] Classes : ajouter un cours ; dans une thématique, « Débloquer la
      suivante » ouvre les ressources dans l'ordre (badge « Depuis le … ») ;
      cadenas pour ouvrir/refermer une ressource ou un quiz ; « Tout
      débloquer » ; retirer le cours puis le remettre → tout est de nouveau
      « À venir »
- [ ] Classes : ajouter un étudiant par e-mail (compte existant) ; e-mail
      inconnu → message d'erreur ; ajouter deux fois → « déjà membre » ;
      retirer un étudiant
- [ ] `/rejoindre/[code]` déconnecté → « Se connecter », puis retour sur la
      page après connexion ; « Rejoindre la classe » → « Tu fais partie de
      cette classe » ; code saisi en minuscules ou avec tiret accepté sur
      `/rejoindre`
- [ ] Un contributeur ne voit pas / ne peut pas ouvrir `/dashboard/utilisateurs`
      ni `/dashboard/classes`
- [ ] Un viewer qui tape l'URL `/dashboard/...` est renvoyé vers l'accueil

## 5. Qualité transversale
- [ ] Aucune erreur rouge dans la console du navigateur sur les pages visitées
- [ ] Temps de chargement acceptable (rien > 2–3 s en local)
- [ ] Texte arabe correct partout (hadiths, Coran, recherche, titres)
- [ ] Partage : coller un lien dans WhatsApp affiche le bon titre et la bonne
      image (nécessite `NEXT_PUBLIC_SITE_URL` en production)
- [ ] Textes en français sans faute, messages d'erreur compréhensibles
- [ ] Navigation clavier de base (Tab, Entrée, Échap dans les dialogues)
- [ ] Passe étroite ≈ 400 px : menu, tab bar, lecteur Coran, quiz utilisables

## 6. Ce qu'il manque / ce qui frustre (libre)
Noter tout ce qu'on cherche sans le trouver, tout ce qui demande trop de
clics, et ce que les élèves demanderaient en premier.
