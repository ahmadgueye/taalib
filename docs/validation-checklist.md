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
      « Lire le Qur'an », lien vers bayanun.com ; aucun cours ni thématique
      affiché ; l'en-tête n'a que Quran et Connexion (pas de Cours, Hadith ni
      recherche), la barre mobile que Accueil et Quran
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
- [ ] Accueil « Ma feuille de route » : les cours de la classe dans l'ordre
      choisi sur la page de la classe, chacun avec ses thématiques ; une
      thématique sans rien de débloqué est « À venir » (sablier, pas de
      lien) ; « x/y leçons » compte toutes les leçons ; une étape tout lue,
      tout débloquée et quiz réussi passe « Terminé » ; sous chaque cours,
      barre « x/y leçons · a/b étapes terminées », et « Cours terminé » quand
      toutes les étapes le sont
- [ ] Avec classe : `/cours` (« Tes cours ») ne montre que les cours de la
      classe, dans l'ordre du programme ; chaque carte a son bandeau (nom
      arabe en ruq'a, ou première lettre), statut et nouveautés, contenu
      (thématiques, leçons, quiz), progression identique à l'accueil et
      bouton « Commencer » / « Reprendre » ; un cours sans leçon affiche « Le
      contenu s'ouvrira au fil des séances »
- [ ] Page d'un cours : toutes ses thématiques, celles sans rien de débloqué
      en « À venir » (pointillés, sablier, pas de lien) ; pourcentages sur
      toutes les leçons
- [ ] Page d'une thématique : toutes ses leçons et quiz publiés, les
      verrouillés en « À venir » sans lien (vérifier dans le code de la page
      que leur contenu n'y est pas) ; « x % » sur toutes les leçons, comme la
      feuille de route ; aucune carte de leçon n'affiche d'aperçu du texte
- [ ] Ancien élève (inscription terminée dans le dashboard) : plus aucun
      « À venir » sur les pages cours et thématique, seulement ce qui lui
      avait été ouvert, pourcentages compris
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
- [ ] `/compte` : progression globale cohérente ; onglets « Progression » et
      « Paramètres » (l'URL suit, `?onglet=parametres` rouvre le bon onglet) ;
      carte Coran au même pourcentage que `/memorisation` ; nom modifiable,
      puis retour sur
      « Paramètres »
- [ ] Quiz : répondre faux → score et corrections (bonnes réponses révélées
      seulement après envoi)
- [ ] Quiz : compteur « n/N répondues » et barre ; « Valider » avec une
      question sans réponse → elle est surlignée, scroll dessus, rien n'est
      envoyé ; vrai/faux = un seul choix (boutons), QCM = cases à cocher
- [ ] `/cours/[slug]` : progression globale, bouton « Commencer »/« Reprendre »
      vers la prochaine leçon ou le prochain quiz ; « Tu es à jour » si tout
      est fait
- [ ] Quiz : répondre juste ≥ seuil → badge de réussite
- [ ] Quiz : question à choix multiples (partiellement juste = faux)
- [ ] Rejouer un quiz : le meilleur score est conservé
- [ ] `/compte` : section Quiz listant les quiz tentés (meilleur score,
      nombre de tentatives) ; cliquer ouvre `/quiz/[id]/historique`
- [ ] `/quiz/[id]/historique` : liste chronologique des tentatives (date,
      score) ; cliquer une tentative ouvre son détail avec la correction
      complète
- [ ] Mémorisation : toucher un verset → statut (en cours / à renforcer /
      maîtrisé) et retour à « aucun »
- [ ] `/memorisation` : tableau de bord et progression par sourate ; définir
      « N versets mémorisés » sur une sourate, puis réduire le nombre
- [ ] Marquer un verset « à renforcer » → sa sourate apparaît dans la liste
      « À renforcer » de `/memorisation` ; plus de cloche dans le header ni de
      page `/memorisation/revision` (404)
- [ ] Rafraîchir la page : tout est conservé

## 4. Contributeur / administrateur
Passer le compte en `contributor` puis `admin` dans Studio
(`public.profiles` → `role`).
- [ ] `/dashboard` : accessible, statistiques cohérentes
- [ ] Bascule « Aperçu | Dashboard » : dans le header du site (icônes seules
      sur mobile) et en haut de la barre latérale du dashboard, pour admin et
      contributeur ; absente pour un étudiant
- [ ] Cours : créer, modifier, supprimer ; statut `coming_soon` ↔ `published` ;
      champ « Nom en arabe » (facultatif) affiché en ruq'a sur `/cours`
- [ ] Thématiques : créer, glisser-déposer pour réordonner, supprimer
- [ ] Ressources : créer chaque type (vidéo, PDF upload, lien, texte
      markdown), brouillon invisible côté public, réordonner
- [ ] Hadiths : créer avec arabe + FR obligatoire, wolof optionnel
- [ ] Rapporteurs : choisir plusieurs rapporteurs existants dans le
      formulaire d'un hadith, en créer un nouveau en tapant son nom ;
      `/dashboard/rapporteurs` : renommer, fusionner deux orthographes (les
      hadiths suivent), suppression refusée tant qu'il est cité
- [ ] Quiz : onglets « Questions » (par défaut) et « Réglages », l'URL suit
      (`?onglet=reglages`) ; un nouveau quiz s'ouvre sur « Réglages » ;
      modifier un réglage puis enregistrer depuis l'onglet Questions le garde
- [ ] Quiz : créer (réglages et questions sur la même page), ajouter questions
      QCM et vrai/faux, plusieurs bonnes réponses, brouillon invisible et non
      soumissible côté public
- [ ] Quiz : après « Enregistrer », on reste sur la page avec un toast ;
      quitter avec des modifications non enregistrées demande confirmation ;
      réordonner, dupliquer, replier une question ; supprimer puis
      « Annuler » dans le toast ; « Aperçu élève » permet de répondre et de
      voir la correction sans rien enregistrer
- [ ] Quiz → « Importer » : « Copier le prompt NotebookLM » copie le prompt ;
      coller une réponse au format `Q:` / `- [x]` affiche le nombre de
      questions reconnues et les blocs ignorés ; « Ajouter » les place
      repliées dans l'éditeur, sans enregistrer ; un nouveau quiz passe en
      Brouillon
- [ ] Quiz → « Générer avec l'IA » (visible seulement avec
      `ANTHROPIC_API_KEY`) : liste les leçons écrites de la thématique ;
      sans thématique ou sans leçon écrite, un message l'explique ; le coût
      estimé suit les leçons cochées et le nombre de questions ; « Voir mon
      crédit » ouvre la facturation Anthropic ; « Générer » renvoie des
      questions fidèles aux leçons, avec leur coût réel ; « Ajouter » les
      place repliées dans l'éditeur, sans enregistrer
- [ ] Quiz déjà tenté par un élève : corriger une faute dans un énoncé puis
      enregistrer → la correction détaillée de sa tentative
      (`/quiz/[id]/historique/...`) est toujours complète
- [ ] Séances : créer avec thématiques et ressources rattachées
- [ ] Classes : avec deux cours, glisser-déposer « Ordre de la feuille de
      route » → l'ordre change sur l'accueil des étudiants
- [ ] Page d'une classe : s'ouvre sur l'onglet « Suivi » ; changer d'onglet
      met à jour l'URL (`?onglet=cours`…) et un rechargement le conserve ;
      ajouter un étudiant ou enregistrer les réglages garde l'onglet ouvert
- [ ] Utilisateurs (admin) : section « Équipe » ; ajouter par e-mail un
      compte existant (Éditeur ou Admin) → il passe dans l'équipe ; un
      e-mail inconnu ou déjà dans l'équipe donne un message clair ; changer
      un rôle ; impossible de retirer le dernier admin ; « Retirer l'accès »
      absent sur sa propre ligne, et sur une autre le compte repasse dans
      « Comptes »
- [ ] Utilisateurs : « Qui peut faire quoi ? » ouvre le tableau des droits
      (Compte, Éditeur, Admin)
- [ ] Utilisateurs : section « Comptes » en lecture seule, recherche par nom
      ou e-mail, liens vers la fiche de l'élève dans chacune de ses classes
- [ ] Accueil du dashboard : plus de ligne « en attente d'autorisation »
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
      retirer un étudiant → il ne voit plus rien de la classe ; « Terminer »
      → il passe dans « Anciens élèves », garde les ressources déjà
      débloquées mais pas celles débloquées ensuite ; « Réintégrer » → il
      voit de nouveau tout
- [ ] Classes : « Suivi des étudiants » → leçons lues sur les ressources
      débloquées de la classe, quiz réussis sur les quiz débloqués (avec la
      moyenne), pourcentage du Coran identique à celui de l'étudiant sur
      `/memorisation` ; « Jamais » ou plus de 7 jours sans activité → en
      orange avec ⚠ ; tri par colonne ; anciens élèves repliés, affichables
- [ ] Cliquer un nom → détail de l'étudiant : mêmes chiffres, leçons lues
      (avec la date) ou « à lire », quiz avec meilleur score ou « pas
      tenté », mémorisation (tableau de bord et barre par sourate) ; lien
      retour vers la classe ; un étudiant d'une autre classe → 404
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
- [ ] `/coran` sur mobile : la barre du haut tient sur une ligne ; le bouton
      Réglages ouvre un tiroir (affichage, taille, tajwid et sa légende,
      progression et « Gérer mon parcours » si connecté, mode Zen)
- [ ] `/coran` : le bouton « sourate · verset » ouvre le tiroir de
      navigation (à gauche sur desktop, en bas sur mobile) ; recherche par
      nom, numéro ou en arabe ; choisir un verset y mène et ferme le tiroir ;
      couleurs de mémorisation sur les versets si connecté
- [ ] `/coran` : ouvrir une sourate jamais lue s'affiche en moins d'une
      seconde ; en mode Lecture la page suivante est déjà prête au
      défilement ; `/coran?sourate=5&verset=90` arrive bien sur le verset 90
- [ ] `/coran` en mode avion le temps d'ouvrir une sourate sur plusieurs
      pages : message « La page n'a pas pu être chargée », puis la suite
      s'affiche seule une fois le réseau revenu (y compris en PWA)

## 6. Ce qu'il manque / ce qui frustre (libre)
Noter tout ce qu'on cherche sans le trouver, tout ce qui demande trop de
clics, et ce que les élèves demanderaient en premier.
