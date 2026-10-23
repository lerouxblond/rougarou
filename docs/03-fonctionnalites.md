# 03 — Fonctionnalités, écrans et critères d'acceptation

Format : **US-xx** (user story) suivie de ses critères d'acceptation (CA). Les tests e2e Playwright portent l'identifiant US dans leur nom.

## Plan des écrans

```
/                       Accueil (créer / rejoindre / reprendre la partie en cours)
/auth/login, /auth/signup, /auth/reset
/profile                Pseudo, avatar, préférences (langue, sons, vibrations)
/history                Historique des parties
/history/:gameId        Détail : composition, journal complet, vainqueurs
/presets                Compositions sauvegardées
/join/:code             Rejoindre (aussi la cible du QR)
/game/:gameId           Écran de partie : un seul composant routeur selon (phase × rôle du viewer)
  ├─ vue Meneur         Tableau de bord
  └─ vue Joueur         Carte, actions, votes, chat
```

## Comptes et profil

**US-01 — Créer un compte**
- CA : inscription par e-mail et mot de passe (12 caractères minimum), vérification de l'e-mail, et connexion Google en option.
- CA : à la première connexion, l'utilisateur choisit un pseudo (unique dans une partie, pas forcément au niveau global) et un avatar dans la galerie.

**US-02 — Rester connecté sur tous les supports**
- CA : la session persiste dans la PWA et dans les apps Tauri (jeton porteur stocké de façon sûre, voir `docs/04` §Auth).

## Créer et rejoindre

**US-10 — Créer une partie (meneur)**
- CA : un bouton « Créer une partie » génère une partie en `LOBBY` avec un code à 6 caractères (sans les caractères ambigus 0/O/1/I) et un QR.
- CA : le meneur choisit le mode (présentiel ou distanciel) dès la création. Il pourra le modifier jusqu'à la distribution.

**US-11 — Rejoindre une partie (joueur)**
- CA : on peut rejoindre par code, par QR ou par lien `/join/:code`. Si l'utilisateur n'est pas connecté, il passe par la connexion puis revient automatiquement sur le salon.
- CA : le joueur apparaît chez le meneur en moins d'une seconde.
- CA : une fois la partie distribuée, rejoindre devient impossible (sauf remplacement, `R-62`).

**US-12 — Salon d'attente**
- CA : le meneur voit la liste des joueurs, leur état de connexion et l'ordre des places. Il réordonne par glisser-déposer, ce qui est important pour le Renard, le Montreur d'ours et le Chevalier.
- CA : le meneur peut expulser un joueur.
- CA : les joueurs voient la liste et le nombre attendu.

## Configuration

**US-19 — Choisir le mode de jeu**
- CA : la première étape de la configuration est le choix du mode : Classique, Nuit blanche ou Vampire (`docs/11`). Chaque mode s'affiche sous forme de carte avec une description courte et le nombre de joueurs conseillé.
- CA : le mode choisi filtre les rôles proposés et les options, et recalcule la composition suggérée.
- CA : les joueurs voient le mode dans le salon, **sauf** en Nuit blanche, où ils voient « Classique » et la composition leurre (`W-30`).
- CA : en Nuit blanche, l'écran de composition s'intitule « Composition leurre », avec un rappel des rôles interdits (`W-03`).

**US-19b — Activer le role play**
- CA : un interrupteur « Role play » est disponible dans la configuration, quel que soit le mode, avec une aide courte (« Présentations au jour 1, première nuit sans mort »).
- CA : les joueurs voient dans le salon que le role play est actif.

**US-20 — Composer la partie**
- CA : la composition est suggérée automatiquement selon le nombre de joueurs (`docs/02` §Compositions), puis ajustée avec des compteurs + et − par rôle.
- CA : une validation bloquante s'applique : le nombre de rôles doit correspondre aux joueurs (+2 avec le Voleur), il faut au moins un loup, les contraintes `unique`, `minPlayers` et sœurs/frères sont respectées.
- CA : l'indicateur d'équilibre est mis à jour en direct.
- CA : le meneur peut sauvegarder la composition en preset (lié au mode en cours) ou en charger un. La liste des presets est filtrée par mode.

**US-21 — Régler les options**
- CA : toutes les options de `docs/01` §8 apparaissent, groupées (Votes, Nuit, Révélations, Minuteurs), avec une aide contextuelle courte pour chacune.

## Distribution

**US-30 — Découvrir son rôle en secret**
- CA : la carte est face cachée par défaut. Le joueur **maintient appuyé** pour la retourner, et elle se recache dès qu'il relâche. Sur desktop, il maintient la barre d'espace ou clique sur « Révéler 5 s ».
- CA : la carte montre l'illustration, le nom, le camp, une description courte et un lien « Règles du rôle ».
- CA : le joueur appuie sur « J'ai vu mon rôle » pour confirmer. Le meneur voit le compteur de confirmations.
- CA : en distribution « cérémonie », la main passe d'un joueur à l'autre dans l'ordre des places (`R-17`) ; les autres voient seulement « X découvre son rôle… ».
- CA : le rôle reste consultable à tout moment par le même geste (bouton flottant « Ma carte »).

**US-31 — Fiche de personnage (role play)**
- CA : après avoir vu son rôle, le joueur remplit sa fiche (`RP-01`) : nom, métier (liste et saisie libre), trait, portrait, avec un bouton « Inspire-moi ».
- CA : le meneur voit l'avancement des fiches et peut en refuser une (`RP-03`). On ne passe aux présentations que quand toutes les fiches sont validées (ou si le meneur force).

**US-32 — Présentations (role play, jour 1)**
- CA : l'ordre de passage suit les places. Le joueur qui a la parole voit « À toi » et un minuteur. Les autres voient sa fiche en grand et la liste de ceux qui sont déjà passés.
- CA : le meneur a les boutons « Suivant » et « Passer », et lance la nuit 1 à la fin.

## Nuit

**US-40 — Nuit, côté joueur**
- CA : tout le monde voit un écran de nuit uniforme, pour qu'on ne puisse pas deviner qui agit en regardant les écrans des autres. Ceux qui n'ont pas d'action voient le même fond avec un petit élément décoratif animé.
- CA : quand c'est son tour, le joueur reçoit une vibration (si l'option est active), et l'interface d'action apparaît avec les cibles autorisées, un minuteur et une confirmation.
- CA : le résultat d'une action immédiate (Voyante, Renard) s'affiche en privé et reste consultable dans « Mes informations ».

**US-41 — Nuit, côté meneur**
- CA : le meneur voit la liste ordonnée des sous-étapes, l'étape en cours et le **texte à lire** (« La Voyante se réveille… ») en grand caractère. Il le lit lui-même : pas de synthèse vocale en V1 (D-22).
- CA : le meneur voit en direct les intentions déjà saisies, ainsi que les boutons « Étape suivante », « Forcer » et « Annuler ».
- CA : en mode présentiel, si `fakeWakeForDeadRoles` est actif, l'app fait quand même appeler un rôle mort, avec une durée aléatoire.

**US-42 — Vote des loups**
- CA : chaque loup voit les votes des autres loups en direct et peut changer le sien. Le résultat est validé à l'unanimité ou à la majorité selon l'option.

**US-43 — Actions de nuit propres au mode (meneur)**
- CA : en Nuit blanche, l'étape des loups affiche chez le meneur « Victime tirée au sort : X », un bouton « Retirer au sort » (une fois) et un bouton « Valider ». Les joueurs voient la même chose qu'en mode Classique.
- CA : en Vampire, l'étape Vampire montre au meneur la cible choisie et la liste à jour des vampires, avec leur ordre de conversion et le vampire actif mis en évidence.

## Jour

**US-49 — Élection du Maire**
- CA : au jour 1 (et après la mort du Maire si `mayorSuccession = 'reelect'`), chaque vivant peut se déclarer candidat dans le délai imparti, puis tous les vivants votent pour un candidat.
- CA : une animation d'investiture s'affiche, et le badge « Maire » apparaît sur le joueur dans toutes les vues.
- CA : avec `designate`, à la mort du Maire, une interface de désignation de successeur s'ouvre chez lui (30 s).

**US-50 — Aube**
- CA : l'annonce des morts se fait avec une animation (désactivée si `prefers-reduced-motion`). Les rôles sont révélés selon l'option. Les effets à la mort sont déclenchés : le Chasseur reçoit son interface de tir, le Maire son interface de succession.

**US-51 — Débat**
- CA : un minuteur optionnel est affiché. En distanciel, le chat du village est ouvert pour les vivants. Les morts n'ont accès qu'au chat du cimetière.

**US-52 — Vote du village**
- CA : chaque joueur vivant sélectionne un joueur puis confirme, et peut modifier son vote jusqu'à la clôture.
- CA : en vote public, chaque vote apparaît sous la forme d'une flèche ou d'un badge sur le joueur visé. En vote secret, seul le compteur « X/Y ont voté » s'affiche.
- CA : les poids de vote sont appliqués (voix double du Maire, +2 du Corbeau). Le décompte final s'affiche à la clôture.
- CA : les égalités se résolvent selon `R-33`, avec une interface dédiée pour le Maire.

## Fin de partie

**US-60 — Écran de fin**
- CA : le camp vainqueur est annoncé, tous les rôles sont révélés, et une **chronologie** nuit par nuit montre qui a fait quoi : c'est le journal (`R-19`), que les joueurs ne reçoivent qu'à ce moment.
- CA (**M5**) : un bouton « Rejouer avec les mêmes joueurs » ramène tout le monde au salon avec la même composition. En M4, un bouton « Nouvelle partie » ramène à l'accueil.
- CA : la partie est enregistrée dans l'historique de chaque compte participant.

## Chat (mode distanciel)

**US-70 — Canaux**
- CA : les canaux sont le village (vivants, de jour), les loups (loups vivants, de nuit), le cimetière (morts), le canal privé joueur ↔ meneur, les sœurs/frères et les amoureux (option `loversChat`).
- CA : l'accès est calculé **côté serveur** à chaque message. Un message n'est jamais diffusé à un client qui n'y a pas accès.
- CA : messages de 500 caractères maximum, avec une limite de débit de 1 message par seconde par joueur. Le meneur peut couper la parole à un joueur.

## Meneur — outils transverses

**US-79 — Déclaration « Il n'y a pas de loup »**
- CA : le bouton est toujours disponible chez le meneur pendant le jour, **quel que soit le mode** (`W-20`).
- CA : en Nuit blanche, il déclenche la victoire du village. Dans les autres modes, il journalise la déclaration et affiche au meneur « Déclaration fausse : annoncez-le » (ou entraîne la défaite si `falseDeclarationPenalty` est active).

**US-80 — Journal et correction**
- CA : le journal horodaté de la partie est visible par le meneur (`R-19`).
- CA : le bouton « Annuler la dernière action » respecte `R-11`.
- CA : le meneur peut tuer ou ressusciter manuellement un joueur et modifier son rôle (mode « correction », `R-18`, avec un badge visible dans le journal de fin).

**US-81 — Transfert de meneur**
- CA : si le meneur se déconnecte plus de 2 minutes, la partie se met en pause. Il peut transférer son rôle à un autre utilisateur non joueur.

## Hors-ligne et reconnexion

**US-90 — Reconnexion**
- CA : quand on recharge la page ou qu'on ferme puis rouvre l'app, on revient sur la partie dans l'état exact, et la vue projetée est renvoyée par le serveur.
- CA : un indicateur de connexion s'affiche en cas de perte réseau, avec une reconnexion automatique à délai croissant.
