# Checklist de validation manuelle

À dérouler sur l'app locale (`npm run db:local:start` puis `npm run dev`,
http://localhost:3000) avec le contenu copié de la prod. Pour chaque ligne,
noter : OK / Bug / Bizarre (+ une phrase). Tester d'abord sur **desktop**, puis
une passe rapide en fenêtre étroite (≈ 400 px) pour anticiper le mobile.

Boîte mail de test (liens magiques) : http://127.0.0.1:54324
Studio (changer un rôle dans `public.profiles`) : http://127.0.0.1:54323

## 0. Préparation
- [ ] Docker lancé, `npm run db:local:start` OK
- [ ] http://localhost:3000 s'affiche avec le vrai contenu (7 cours, etc.) OK

## 1. Visiteur non connecté
- [ ] Accueil : parcours mis en avant, thématiques hors parcours, rien de cassé OK
- [ ] `/cours` : liste, cours « bientôt disponible » visibles mais sans contenu OK
- [ ] Page d'un cours → page d'une thématique → ouverture d'une ressource de
      chaque type (vidéo, PDF, lien, texte) OK
- [ ] `/hadiths` : arabe lisible (police, RTL), traduction FR, wolof si présent OK
- [ ] Page d'un hadith OK
- [ ] `/seances` et une séance : thématiques/ressources rattachées cliquables
- [ ] `/parcours` et un parcours : étapes verrouillées pour un visiteur OK
- [ ] Recherche (⌘K et `/recherche`) : mot français, mot avec accent, mot
      arabe, filtre par type, aucun résultat . /recherche est OK par contre ⌘K n'affiche pas de reponse soit rien soit le message "aucun resultat"
- [ ] `/coran` : liste des sourates, ouverture d'une sourate, lecture,
      audio (bandeau en bas), mode Zen, changement de récitateur. BUG sur la sourate 94 qui affiche une seule ligne de la sourate, j'ai l'impression que c'est à cause du fait que la premiere ligne de la sourate est en fin de ligne est la cause sinon tout le reste fonctionne
- [ ] Marquer une ressource « terminée » sans être connecté → message clair OK
- [ ] `/compte`, `/memorisation`, `/dashboard` redirigent vers `/login` OK
- [ ] Thème clair/sombre, navigation, pied de page, page 404 (`/nimporte-quoi`) OK

## 2. Connexion
- [ ] `/login` : saisir un e-mail → message « Un lien de connexion… » OK
- [ ] Lien reçu dans Mailpit → arrivée sur `/compte` (nouveau compte) pour
      renseigner le nom OK
- [ ] Après le nom : retour vers la page demandée Bug redirige toujours vers la page d'accueil mais si l'URL demandée etait /memorisation
- [ ] Déconnexion puis reconnexion avec le même e-mail OK
- [ ] Un compte tout neuf est `viewer` : le message d'accueil « en attente »
      s'affiche et `/dashboard` n'est pas accessible. OK mais tu te trompes sur un point, on n'affiche plus le message "en attente", le viewer ne sait pas qu'il un dashboard donc apres inscription on le redirige simplement vers la page d'accueil ou autre page demandée

## 3. Apprenant connecté (rôle viewer)
- [ ] Marquer une ressource comme terminée, puis la décocher. Le système a changé, une ressource est marquée comme terminé apres avoir cliquer sur le bouton suivant en fin de la page de la resource
- [ ] Progression d'un cours / d'une thématique (anneau, compteur) mise à jour OK
- [ ] `/compte` : progression globale cohérente OK
- [ ] Quiz : répondre faux → score et corrections (bonnes réponses révélées
      seulement après envoi) OK
- [ ] Quiz : répondre juste ≥ seuil → badge de réussite OK
- [ ] Quiz : question à choix multiples (partiellement juste = faux) OK
- [ ] Rejouer un quiz : le meilleur score est conservé.Bizarre On a pas encore de systeme pour visualiser les quiz fait etc...
- [ ] Parcours : réussir le quiz de l'étape 1 débloque l'étape 2 ; étape sans
      quiz se débloque automatiquement OK
- [ ] Mémorisation : toucher un verset → statut (en cours / à renforcer /
      maîtrisé) et retour à « aucun » OK
- [ ] `/memorisation` : tableau de bord et progression par sourate ; définir
      « N versets mémorisés » sur une sourate, puis réduire le nombre OK
- [ ] Rafraîchir la page : tout est conservé OK

## 4. Contributeur / administrateur
Passer le compte en `contributor` puis `admin` dans Studio
(`public.profiles` → `role`).
- [ ] `/dashboard` : accessible, statistiques cohérentes OK
- [ ] Cours : créer, modifier, supprimer ; statut `coming_soon` ↔ `published` OK
- [ ] Thématiques : créer, glisser-déposer pour réordonner, supprimer OK
- [ ] Ressources : créer chaque type (vidéo, PDF upload, lien, texte
      markdown), brouillon invisible côté public, réordonner OK
- [ ] Hadiths : créer avec arabe + FR obligatoire, wolof optionnel OK
- [ ] Quiz : créer, ajouter questions QCM et vrai/faux, plusieurs bonnes
      réponses, brouillon invisible côté public OK
- [ ] Séances : créer avec thématiques et ressources rattachées OK
- [ ] Parcours : créer, ajouter/retirer/réordonner des étapes OK
- [ ] Utilisateurs (admin) : changer un rôle ; impossible de retirer le
      dernier admin OK
- [ ] Un contributeur ne voit pas / ne peut pas ouvrir `/dashboard/utilisateurs` OK
- [ ] Un viewer qui tape l'URL `/dashboard/...` est refusé OK

## 5. Qualité transversale
- [ ] Aucune erreur rouge dans la console du navigateur sur les pages visitées OK
- [ ] Temps de chargement acceptable (rien > 2–3 s en local) OK
- [ ] Texte arabe correct partout (hadiths, Coran, recherche, titres) OK
- [ ] Partage : le titre et l'image s'affichent bien (aperçu WhatsApp/lien) Bizarre, tu parles de quoi là ?
- [ ] Textes en français sans faute, messages d'erreur compréhensibles OK
- [ ] Navigation clavier de base (Tab, Entrée, Échap dans les dialogues) OK
- [ ] Passe étroite ≈ 400 px : menu, tab bar, lecteur Coran, quiz utilisables OK

## 6. Ce qu'il manque / ce qui frustre (libre)
Noter ici tout ce qu'on cherche sans le trouver, tout ce qui demande trop de
clics, et ce que vos élèves demanderaient en premier.
-
-
-
