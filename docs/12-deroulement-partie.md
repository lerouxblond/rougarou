# 12 — Déroulé d'une partie, minuteurs, sons et décisions à valider

Ce document décrit **ce que vivent le meneur et chaque joueur, moment par moment**. Il complète `docs/01` (les règles) et `docs/03` (les écrans). Les écrans cités (`J..`, `M..`) sont ceux du canevas de maquettes.

> **Statut** : les valeurs marquées 🟡 sont des **propositions à valider** (registre §7). Une fois validées, elles passent en ✅ et deviennent la spécification.

---

## 1. Qui pilote le cycle jour/nuit ?

Le **meneur** pilote toujours. L'app ne fait jamais avancer la partie dans son dos, sauf si le meneur l'a demandé.

- **Un bouton principal unique** en bas du tableau de bord du meneur, dont le libellé change selon le contexte (« Lancer la nuit », « Étape suivante : Sorcière », « Lever le jour », « Ouvrir le vote », « Clore le vote »…). Juste au-dessus, une ligne indique **ce qui bloque** (« En attente : la Sorcière »).
- **Deux niveaux de pilotage** (option `pilotMode`, D-01 ✅). Le défaut est le même en présentiel et à distance, puisqu'on joue toujours **en vocal** avec un meneur qui raconte :

| Pilotage | Comportement | Par défaut |
|---|---|---|
| `assisted` | Les étapes de nuit s'enchaînent seules dès que le joueur concerné a validé (ou que son minuteur expire). Le texte suivant s'affiche, et le meneur n'a qu'à le lire. Le meneur garde la main sur l'aube, l'ouverture et la clôture du vote, et l'exécution. | ✅ **Oui** |
| `manual` | Le meneur clique pour chaque étape, pour maîtriser son rythme de narration. | Option |

- Le meneur dispose toujours de : **Pause** (gèle les minuteurs), **+30 s**, **Forcer** (passe l'étape avec l'action par défaut, `R-10`), **Annuler la dernière action** (`R-11`) et **Mode correction** (US-80).

## 2. Déroulé pas à pas

Légende des sons : 🔊 M = son sur l'appareil du meneur · 🔊 J = son sur les appareils des joueurs · 📳 = vibration du joueur concerné. Le détail par contexte est au §5.

| # | Moment | Meneur (ce qu'il voit / fait) | Joueur (ce qu'il voit / fait) | Minuteur | Son / vibration |
|---|---|---|---|---|---|
| 1 | **Salon** | M05 : code, QR, liste, places à réordonner, expulser. Bouton « Configurer » | J02 : code, liste, mode et modificateurs annoncés | — | 🔊 M discret à chaque arrivée |
| 2 | **Configuration** | M01 → M06 : mode, modificateurs, composition, options | J02 : « Le meneur prépare la partie… » | — | — |
| 3 | **Distribution** | M07 : clique « Distribuer ». Il voit qui a confirmé avoir vu son rôle | J03 : la carte arrive **face cachée** pour tous **en même temps**. Le joueur maintient pour la retourner, puis appuie sur « J'ai vu mon rôle » | Aucun (le meneur peut forcer) | 📳 courte à l'arrivée de la carte |
| 3b | *Role play* : **fiche** | M07 : avancement des fiches, refus possible | J11 : remplit sa fiche juste après avoir vu son rôle | Aucun | — |
| 4 | *Role play* : **présentations** (jour 1) | M08 : qui a la parole, « Suivant », « Passer » | J12 : fiche de l'orateur en grand ; « À toi » quand c'est son tour | aucun | 📳 « À toi » · 🔊 M cloche douce entre deux joueurs |
| 5 | **La nuit tombe** | Bouton « Lancer la nuit ». Le texte à lire s'affiche (« Le village s'endort… ») | **Tous** les écrans passent en J04 (nuit uniforme) avec un fondu de 1,2 s | — | 🔊 M « tombée de la nuit » (hurlement lointain) |
| 6 | **Étape de nuit d'un rôle** (Voyante, Salvateur…) | M02 : étape en cours, texte à lire (« La Voyante se réveille… »), cible saisie en direct | **Le joueur concerné** voit son écran d'action (J05, J13…). Les autres restent sur J04 | 45 s, visible **seulement** par le joueur concerné et le meneur | Présentiel : rien côté joueur (le meneur l'appelle à voix haute). Distanciel : 📳 + 🔊 J sur **son** appareil |
| 7 | **Étape des loups** | Votes des loups en direct, unanimité ou majorité | J14 : les loups voient la meute, votent, peuvent changer d'avis. La Petite fille espionne (anonymisé) | 90 s | idem #6 |
| 8 | **Sorcière** | Voit la victime et les potions restantes | J15 : « Cette nuit, X a été attaqué ». Potion de vie, potion de mort, ou rien | 45 s | idem #6 |
| 9 | **Aube** | M09 : morts calculées, texte à lire ; bouton « Lever le jour » | Tous : fondu vers le **thème jour**, puis J06 (annonce des morts, rôles révélés selon l'option) | — | 🔊 public « lever du jour » ; s'il y a des morts : 🔊 public **glas** ; 📳 longue pour le **joueur mort** |
| 10 | **Effets à la mort** | File « en attente : Chasseur », « Successeur du Maire » | J16 Chasseur : choisir sa cible · J17 Maire mourant : choisir son successeur. Le mort passe en J18 (vue cimetière) | 30 s chacun | 📳 pour le joueur qui doit agir |
| 11 | **Élection du Maire** (premier jour qui suit une nuit, ou réélection) | M10 : candidatures, puis vote | J07 : se porter candidat, puis voter | 60 s candidatures + 90 s vote | 🔊 M **fanfare courte** à l'investiture |
| 12 | **Débat** | M03 : bouton « Ouvrir le vote » | Écran « Débattez ! » avec la liste des joueurs (J29), en présentiel comme en vocal. Chat écrit en option (J09) | aucun | 🔊 M + J tic-tac sur les 10 dernières secondes, s'il y a un minuteur |
| 13 | **Vote** | M03 : décompte pondéré en direct, « Clore le vote » | J08 : choisir, confirmer, changer d'avis | 60 s | 📳 à l'ouverture · tic-tac sur les 10 dernières s · 🔊 M **gong** à la clôture |
| 14 | **Égalité** | Interface du Maire, revote ou Bouc émissaire selon les règles | J19 : le Maire tranche ; les autres attendent | 30 s | — |
| 15 | **Exécution** | M11 : annonce, effets à la mort, vérification de victoire | J20 : « Le village a exécuté X », rôle révélé ; Idiot ou Servante si besoin | — | 🔊 M **glas** · 📳 longue pour l'exécuté |
| 16 | **Victoire ?** | Pas de vainqueur : retour en #5. Sinon : #17 | — | — | — |
| 17 | **Fin** | M12 : vainqueurs, rôles, chronologie, « Rejouer » | J10 (Nuit blanche : J21 révélation du mode) | — | 🔊 M + J thème de victoire du camp · 📳 longue |

## 3. Révéler son rôle : quand et comment

- **Quand** : à la distribution (#3). Deux façons, au choix du meneur (option `dealMode`, D-23 ✅) :
  - `simultaneous` (proposé par défaut) : **tous les joueurs en même temps**, dès que le meneur clique « Distribuer ». C'est rapide (moins de 30 s pour la table) et ça marche aussi bien à distance.
  - `ceremony` : **un par un, dans l'ordre des places**. Le joueur dont c'est le tour voit sa carte se lever. Les autres voient « Isaure découvre son rôle… » avec une silhouette neutre, la même pour tous les rôles. Le meneur passe au suivant (ou automatiquement après 8 s). C'est plus lent (environ 1 min 30 à 10 joueurs), mais très immersif en présentiel et en role play. Ça ne révèle rien de plus, puisque l'écran de chacun reste privé.
  - En role play, la fiche de personnage suit juste après la carte.
- **Comment** : la carte arrive face cachée. Le joueur **maintient appuyé** pour la retourner (sur desktop : maintenir Espace, ou « Révéler 5 s »), et elle se recache dès qu'il relâche. Un conseil s'affiche : « Incline ton écran vers toi ».
- **Ensuite** : on peut la revoir à tout moment avec le bouton « Ma carte » (même geste). Les informations obtenues (Voyante, Renard, amoureux, conversion…) sont rangées dans « Mes infos » (J22).
- **Changement de rôle en cours de partie** (infection, Enfant sauvage, Chien-loup, Voleur, Servante, conversion vampire) : une **nouvelle carte** arrive face cachée avec un bandeau « Ton rôle a changé », et une 📳 longue en distanciel. En présentiel, elle arrive **à l'aube**, en même temps que les annonces de tout le monde, pour ne pas trahir le moment.
- **À la mort** : rôle révélé à tous si `revealRoleOnDeath` est actif. Sinon, seul le meneur le voit.
- **À la fin** : tous les rôles sont révélés (J10).

## 4. Minuteurs

Tous les minuteurs se règlent dans la configuration (M06). `null` signifie « pas de minuteur », et c'est alors le meneur qui avance.

| Minuteur | Défaut (D-02 ✅) | À l'expiration |
|---|---|---|
| Voir son rôle | aucun | — (le meneur force) |
| Fiche de personnage (RP) | aucun | — (le meneur force ; « Inspire-moi » proposé) |
| Présentation (RP), par joueur | aucun | Le meneur passe au suivant |
| Action de nuit d'un rôle | 45 s | Action par défaut (en général « ne rien faire ») |
| Vote des loups | 90 s | Pas de victime (`R-34`) |
| Chasseur, successeur du Maire | 30 s | Chasseur : pas de tir · Maire : successeur tiré au sort |
| Candidatures au poste de Maire | 60 s | Tous les vivants deviennent éligibles |
| Vote du Maire | 90 s | Clôture et décompte |
| Débat | aucun | — (le meneur ouvre le vote quand il le décide) |
| Vote du village | 60 s | Clôture : les non-votants ne comptent pas |

Toutes les valeurs restent réglables par partie (M06), et chaque minuteur peut y être désactivé.

- Les minuteurs **de nuit** ne sont visibles que par le joueur qui agit et par le meneur. Les autres écrans restent identiques (J04).
- Le meneur peut faire **Pause** ou **+30 s** à tout moment (`R-16`), et chaque minuteur expiré est noté dans le journal.

## 5. Sons et vibrations

**Règle d'or (D-03 ✅)** : un son ou une vibration ne doit **jamais** donner d'information de jeu.

- **Sons publics** : joués **au même instant sur tous les appareils** (tombée de la nuit, aube, glas, investiture, vote ouvert/clos, ambiance de nuit en boucle). Comme tout le monde les entend en même temps, ils ne révèlent rien. Ils sont autorisés sur les téléphones des joueurs, y compris en présentiel.
- **Sons privés** (« c'est ton tour », résultat de la Voyante, conversion…) : autorisés **seulement** en distanciel, ou en présentiel si le joueur a choisi le profil **Écouteurs**.
- **Vibrations** : jamais la nuit en présentiel, même avec écouteurs, car une vibration s'entend sur une table. De jour, seulement pour soi (sa mort, vote ouvert).
- **Aucun son déclenché par une action** : valider une cible, boire une potion ou voter ne joue jamais de son, sinon la durée ou le moment trahirait le joueur.
- **Profil audio** choisi par chaque joueur (J23) : *Sans son* · *Avec son* (sons publics) · *Écouteurs* (sons publics + privés). Le meneur règle en plus l'ambiance et la synthèse vocale.

| Événement | Type | Meneur | Joueur présentiel | Joueur présentiel (écouteurs) | Joueur distanciel |
|---|---|---|---|---|---|
| Arrivée dans le salon | public | 🔊 | — | — | — |
| Carte distribuée | — | — | 📳 courte | 📳 courte | 📳 + 🔊 |
| La nuit tombe | public | 🔊 + ambiance | 🔊 + ambiance | 🔊 + ambiance | 🔊 + ambiance |
| C'est ton tour (nuit) | **privé** | — | **rien** | 🔊 clochette (pas de vibration) | 📳 + 🔊 |
| Résultat privé (Voyante, Renard…) | **privé** | — | rien | 🔊 discret | 🔊 discret |
| Lever du jour | public | 🔊 | 🔊 | 🔊 | 🔊 |
| **Mort annoncée** | public | 🔊 glas | 🔊 glas · 📳 longue pour le mort | idem | idem |
| Investiture du Maire | public | 🔊 fanfare | 🔊 | 🔊 | 🔊 |
| **Vote ouvert** | public | 🔊 cloche | 🔊 · 📳 courte | idem | idem |
| 10 dernières secondes | public | 🔊 tic-tac | 🔊 tic-tac | 🔊 tic-tac | 🔊 tic-tac |
| **Vote clos** | public | 🔊 gong | 🔊 gong | 🔊 gong | 🔊 gong |
| Exécution | public | 🔊 glas | 🔊 · 📳 pour l'exécuté | idem | idem |
| Fin de partie | public | 🔊 thème du vainqueur | 🔊 · 📳 | idem | idem |

- Les sons publics sont **synchronisés par le serveur** (horodatage dans l'événement), pour qu'ils partent ensemble sur tous les appareils.
- Fichiers et formats : `docs/07-assets.md` §Sons.

## 6. Ce que voient les morts et les spectateurs

- Un joueur mort passe en **vue cimetière** (J18) : la partie se poursuit en lecture seule (phase, morts, votes publics), avec le chat du cimetière. Si `deadSeeRoles` est actif, il voit aussi tous les rôles.
- En présentiel, les morts restent en silence ; l'app leur rappelle avec un bandeau « Tu es mort : ne parle plus ».
- Spectateurs (personnes qui ne jouent pas) : voir D-05.

## 7. Registre des décisions à valider

Chaque ligne doit passer en ✅ (ou être modifiée) avant le jalon indiqué. Claude Code ne doit pas commencer un jalon dont une décision bloquante est encore 🟡.

| ID | Décision | Proposition 🟡 | Bloque |
|---|---|---|---|
| D-01 ✅ | Pilotage par défaut | **Validé** : `assisted` par défaut partout, `manual` en option (§1) | M2 |
| D-02 ✅ | Minuteurs par défaut | **Validé** : minuteurs actifs **seulement sur les actions** (nuit, vote, Chasseur, successeur du Maire, candidatures et vote du Maire), avec les durées du §4. Débat et présentations sans minuteur | M1 |
| D-03 ✅ | Sons et vibrations | **Validé avec ajout** : ambiance et bruitages aussi sur les téléphones des joueurs, avec réglage « sans son / avec son / écouteurs ». Règle d'or : **aucun son ni aucune vibration ne doit trahir le jeu** (§5) | M4 |
| D-04 ✅ | Rejoindre sans compte | **Validé** : compte **invité** (pseudo seul, session locale) pour les amis de passage ; **compte** complet pour suivre ses parties (historique, statistiques, presets). Un invité peut convertir sa session en compte à la fin d'une partie | **M2** |
| D-05 | Spectateurs (non-joueurs) | Pas en V1 | M5 |
| D-06 ✅ | Le meneur peut-il jouer aussi ? | **Validé** : non, le meneur ne reçoit jamais de rôle. Un **mode autonome sans meneur** est prévu après la V1 (le moteur doit pouvoir enchaîner les phases seul, ce qui est déjà le cas avec le pilotage assisté) | M1 |
| D-07 ✅ | Nombre de joueurs | **Validé** : 5 à 24 en Classique ; minimum de 6 pour Nuit blanche et Vampire | M1 |
| D-08 ✅ | Abstention, épargne et vote contre soi-même | **Validé avec changement** : le village peut décider **de n'exécuter personne** (choix « Épargner » dans le vote, `R-36`), activé par défaut. Abstention individuelle en option. Pas de vote contre soi-même | M1 |
| D-09 | Écran de table (TV ou ordinateur partagé) qui montre la phase, le minuteur, les morts et les votes publics | Hors V1, prévu en V1.1 : simple vue spectateur sans aucun secret | M9 |
| D-10 | Changement de rôle en présentiel annoncé à l'aube seulement | Oui (§3) | M6 |
| D-11 | Petite fille : chat des loups anonymisé (adaptation numérique) | Oui, avec un risque d'être repérée réglable, à 0 % par défaut | M3 |
| D-12 | Vampire : convertir un vampire existant lui révèle cette personne | Oui (`V-12`) | M7 |
| D-13 | Vampire : l'héritier ne connaît pas les convertis de son prédécesseur | Oui (`V-21`) | M7 |
| D-14 | Nuit blanche : défaite à 2 vivants ; rôles « qui dépendent d'un loup » interdits | Oui (`W-21`, `W-03`) | M7 |
| D-15 | Role play : la conversion vampire reste possible la nuit 1 | Oui (`RP-11`) | M5 |
| D-16 ✅ | Langue de la V1 | **Validé** : français seul à la sortie, i18n prêt dès M0, traduction anglaise en M9 | M0 |
| D-17 | Nom de domaine | `rougarou.<compte>.workers.dev` au départ ; domaine personnalisé plus tard | M8 |
| D-18 ✅ | Fournisseur d'e-mails (vérification, mot de passe oublié) | **Validé** : Resend (formule gratuite), derrière une interface. Tant qu'aucun domaine n'est vérifié (D-17), la vérification d'e-mail et la réinitialisation par e-mail restent désactivées (ADR 0009) | M2 |
| D-19 | Compte Apple Developer (iOS natif, signature macOS) | Pas en V1 : iPhone via la PWA | M8 |
| D-20 ✅ | Visuels des rôles | **Validé** : pixel art animé (D-24). Sprites de travail de `design/sprites/` pendant le développement, sprites dessinés à la main en M9 | M9 |
| D-21 ✅ | Données personnelles | **Validé** : pseudo, e-mail, historique. Suppression du compte en libre-service : le compte disparaît et ses lignes de parties sont anonymisées. Aucun traqueur | M2 |
| D-23 ✅ | Distribution des rôles | **Validé** : `simultaneous` par défaut, `ceremony` (un par un) en option (§3) | M4 |
| D-24 ✅ | Direction visuelle | **Validé** : Lanterne (nocturne cinématique, sobre) + pixel art animé 32×32 pour les personnages | M4 |
| D-22 | Synthèse vocale du texte à lire | Optionnelle, voix du navigateur (gratuite) | M4 |
