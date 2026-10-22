# 01 — Règles du jeu (spécification du moteur)

Ce document est la **spécification exécutable** du moteur. Chaque règle a un identifiant (`R-xx`) que les tests citent (`it('R-33 : égalité au vote → ...')`).

## 1. Camps et conditions de victoire

| Camp | Gagne quand… |
|---|---|
| **Village** | `R-01` Tous les joueurs du camp Loups sont morts, et aucune condition solo n'est remplie. |
| **Loups** | `R-02` Tous les joueurs qui ne sont pas loups sont morts. Avec l'option `wolvesWinOnParity`, il suffit que le nombre de loups vivants soit ≥ au nombre des autres vivants. |
| **Amoureux mixtes** | `R-03` Si l'un des amoureux est un loup et l'autre non, le couple ajoute le vainqueur `lovers`. Ce n'est pas un camp : chacun garde le sien pour le reste, et le loup amoureux vote toujours avec la meute. Le couple gagne quand les deux amoureux sont les deux seuls vivants. |
| **Solo** | `R-04` Chaque rôle solo définit sa propre condition (Loup blanc, Joueur de flûte, Ange : voir `docs/02`). |

- `R-05` On vérifie la victoire **après chaque résolution de morts** (aube, exécution, morts en chaîne), jamais en cours de résolution.
- `R-06` Si plusieurs conditions sont remplies au même moment, la priorité est : conditions solo > amoureux (`lovers`) > loups > village. Si tout le monde est mort, la partie est déclarée « Personne ne gagne ».
- `R-07` **Composition valide en Classique** : autant de rôles que de joueurs (plus les cartes en trop du Voleur), de 5 à 24 joueurs (D-07), au moins un loup, et strictement moins de loups que de non-loups. Chaque mode peut durcir ces règles (`validateComposition`, `docs/11`).

## 2. Machine d'états d'une partie

```
LOBBY → CONFIG → DEAL ─┐
                       ▼
        ┌──────────▶ NIGHT ──▶ DAWN ──▶ [MAYOR_ELECTION]* ──▶ DAY_DEBATE ──▶ DAY_VOTE ──▶ EXECUTION ─┐
        │                                                                                            │
        └───────────────────────────── vérification victoire (R-05) ◀───────────────────────────────┘
                                                      │ victoire
                                                      ▼
                                                    ENDED
```

\* `MAYOR_ELECTION` a lieu dans deux cas :
- au **premier jour qui suit une nuit** (jour 1 normalement, jour 2 en role play), si l'option `mayor` est active ;
- au début d'un jour où **il n'y a plus de Maire**, si `mayorSuccession = 'reelect'` (voir §6).

Le modificateur **Role play** (§9) insère une phase `PRESENTATIONS` (jour 1) entre `DEAL` et la première `NIGHT`, et rend la nuit 1 sans mort.

Le **mode de jeu** (`docs/11-modes-de-jeu.md`) peut ajouter des sous-étapes de nuit et des conditions de victoire. En revanche, il ne change jamais cette boucle.

| Phase | Ce qui se passe | Qui déclenche la sortie |
|---|---|---|
| `LOBBY` | Les joueurs rejoignent, le meneur ordonne les places | Le meneur (« Configurer ») |
| `CONFIG` | Composition des rôles et options. Le nombre de rôles doit être égal au nombre de joueurs (plus les cartes en trop si le Voleur est présent) | Le meneur (« Distribuer ») |
| `DEAL` | Distribution aléatoire avec graine. Chaque joueur révèle son rôle en privé et confirme « J'ai vu mon rôle » | Le meneur, une fois tous les joueurs confirmés (il peut forcer) |
| `PRESENTATIONS` | **Role play uniquement** (§9). Jour 1 : chaque joueur présente son personnage à tour de rôle | Le meneur, après le dernier joueur |
| `NIGHT` | Les sous-étapes de l'ordre de nuit s'enchaînent (voir §3). La nuit n°1 inclut les rôles qui n'agissent que la première nuit | Automatique quand toutes les sous-étapes sont résolues. Le meneur peut passer une étape (minuteur expiré) |
| `DAWN` | Les morts de la nuit sont résolues (§5), annoncées, puis les effets à la mort s'appliquent (`R-12`) | Le meneur |
| `MAYOR_ELECTION` | Candidatures (facultatives), puis vote de tous les vivants (`R-35`). Voir §6 | Le meneur, ou la fin du minuteur (`R-37`) |
| `DAY_DEBATE` | Débat libre (à voix haute ou par chat). Minuteur optionnel | Le meneur |
| `DAY_VOTE` | Vote du village (§4) | Le meneur, ou la fin du minuteur (`R-37`) |
| `EXECUTION` | Mort du joueur désigné, effets à la mort, vérification de victoire | Le meneur |
| `ENDED` | Révélation de tous les rôles, du journal complet et des statistiques | — |

- `R-10` Une phase ne peut se terminer que si ses actions obligatoires sont résolues. Le meneur peut toujours forcer la transition. Les actions manquantes reçoivent alors l'action par défaut du rôle (en général « ne rien faire »), et le forçage est journalisé.
- `R-11` Le meneur peut **annuler la dernière commande** tant que la phase suivante n'a pas révélé d'information aux joueurs. Le moteur conserve un historique des états (event sourcing, voir `docs/04`).
  - Une annulation retire le dernier **groupe d'événements**, c'est-à-dire tout ce qu'une commande a produit. On peut annuler plusieurs fois de suite.
  - Elle est refusée si ce groupe contient une **révélation** : la distribution des rôles, l'annonce des morts, la clôture d'un vote, l'élection du Maire ou la fin de partie.
- `R-12` **L'aube se joue en deux temps.** À l'entrée en `DAWN`, les morts sont calculées (§5), et seul le meneur les voit (il lit le texte). L'action « Lever le jour » les annonce aux joueurs, puis les effets à la mort s'enchaînent (§5). Une seconde action du meneur passe à la phase suivante, une fois la file d'effets vide.
- `R-13` **Valeurs par défaut d'un forçage** (`R-10`) : vote des loups → pas de victime ; vote du village ou du Maire → clôture avec les bulletins déjà déposés ; successeur du Maire → tirage au sort parmi les vivants ; égalité tranchée par le Maire → personne n'est exécuté ; « J'ai vu mon rôle » → ignoré. Chaque forçage produit un événement journalisé.
- `R-14` **Minuteurs.** Le moteur n'a pas d'horloge : il range une échéance (`deadline = now + durée`, `now` étant injecté) sur l'étape en cours, et accepte la commande système `Timeout` seulement si `now ≥ deadline`. L'expiration applique les mêmes valeurs par défaut qu'un forçage (`R-13`), mais ne fait jamais avancer une phase dont la sortie appartient au meneur : à l'aube et à l'exécution, elle résout l'effet en attente (successeur du Maire) et le meneur passe ensuite à la suite. En pilotage `manual`, une étape de nuit expirée attend aussi le meneur. Le Durable Object programme l'alarme à partir de cette échéance (`docs/04`).
- `R-15` Une option prévue par le schéma mais pas encore prise en charge par le moteur est **refusée** à la configuration, avec une erreur explicite, plutôt qu'ignorée.
- `R-16` **Pause et +30 s.** Le meneur peut mettre en pause le minuteur en cours, le reprendre, ou lui ajouter 30 secondes. En pause, le moteur range la durée restante (`remaining = deadline − now`) et retire l'échéance, donc `Timeout` est refusé. À la reprise, `deadline = now + remaining`. « +30 s » ajoute 30 secondes à l'échéance, ou à la durée restante si le minuteur est en pause. Ces trois commandes sont refusées quand aucun minuteur ne court, et la pause tombe d'elle-même quand l'étape change (le nouveau minuteur démarre normalement). Elles ne révèlent rien et s'annulent (`R-11`). Seuls ceux qui voyaient le minuteur voient la nouvelle échéance ou la pause, ce qui garde la nuit uniforme.

## 3. Déroulé de la nuit

- `R-20` L'ordre de nuit est **calculé** à partir des rôles présents (chaque rôle déclare son `nightOrder` dans `docs/02`). Les rôles absents ou morts sont ignorés. Avec l'option `fakeWakeForDeadRoles` (mode présentiel), le meneur appelle quand même un rôle mort, pour ne pas révéler sa mort.
- `R-21` Les actions de nuit sont des **intentions** enregistrées. Elles sont résolues **ensemble** à l'aube (§5), sauf les exceptions marquées « immédiat » dans `docs/02` (par exemple, la Voyante voit le rôle immédiatement).
- `R-22` En mode distanciel, toutes les sous-étapes qui ne dépendent pas l'une de l'autre peuvent se dérouler **en parallèle** (option `parallelNight`, désactivée par défaut). Les dépendances sont fixes : Salvateur avant Loups, Loups avant Sorcière.

## 4. Votes

- `R-30` Vote du jour : chaque joueur vivant vote pour un joueur vivant ou s'abstient (si l'option `allowAbstain` est active). Le vote est **public** (on voit qui vote pour qui au fil du vote) ou **secret** (on ne voit que le résultat), selon l'option `voteVisibility`.
- `R-36` **Épargner** (option `allowSpare`, activée par défaut) : le bulletin propose, en plus des joueurs, le choix « **Épargner : n'exécuter personne** ». Il compte comme un candidat : la voix double du Maire s'y applique normalement, la marque du Corbeau ne concerne que les joueurs. S'il arrive en tête, ou à égalité avec un joueur, **personne n'est exécuté**. Utile face à un Ange ou quand le village manque d'indices.
- `R-31` On peut changer son vote tant que le vote n'est pas clos.
- `R-32` Le Maire a une voix qui compte double.
- `R-33` En cas d'**égalité**, on applique l'option `tieBreak` :
  - `mayor` (par défaut) : le Maire choisit parmi les ex æquo. S'il n'y a pas de Maire, on passe à `revote`.
  - `revote` : un second vote a lieu uniquement entre les ex æquo. Si l'égalité persiste, personne ne meurt.
  - `nobody` : personne ne meurt.
  - Le **Bouc émissaire**, s'il est vivant, l'emporte sur toutes ces options (voir `docs/02`).
- `R-34` Vote des loups (nuit) : les loups vivants doivent s'accorder sur **une** victime. Selon l'option `wolfVoteMode`, c'est soit l'unanimité (par défaut), soit la majorité simple, et en cas d'égalité le meneur tranche. Si le minuteur expire sans accord, il n'y a pas de victime.
  - `unanimous` : l'étape se résout dès que **tous** les loups vivants désignent la même cible.
  - `majority` : l'étape se résout dès que tous les loups vivants ont voté. La cible qui a le plus de voix l'emporte. En cas d'égalité, le meneur choisit parmi les ex æquo.
  - Un loup peut changer d'avis tant que l'étape n'est pas résolue. Il n'existe pas de choix « personne » : seuls le minuteur ou le forçage donnent une nuit sans victime.
- `R-35` Élection du Maire : vote de tous les joueurs **vivants**. En cas d'égalité, on fait un second vote entre les ex æquo, puis un tirage au sort entre eux. On peut voter pour soi-même (la règle « pas de vote contre soi-même » de D-08 vise l'exécution). Il n'y a pas d'abstention. Si aucun bulletin n'est déposé, le Maire est tiré au sort parmi les éligibles.
- `R-37` **Clôture d'un vote.** Le vote du village et celui du Maire ne se closent jamais seuls : c'est le meneur qui les clôt, ou la fin du minuteur. Quand tous les votants ont voté, le moteur le signale au meneur, sans rien clore (`R-31` permet de changer d'avis jusqu'au bout).
- `R-38` **Précisions sur l'égalité au vote du village** (`R-33`) :
  - `mayor` : le Maire dispose de 30 s pour choisir parmi les ex æquo. Passé ce délai, personne n'est exécuté.
  - `revote` : seuls les ex æquo sont candidats au second vote, sans le choix « Épargner ».
  - Si aucun bulletin n'est déposé, personne n'est exécuté.

## 5. Résolution des morts

- `R-40` À l'aube, on calcule les morts **dans cet ordre** :
  1. La cible des loups, sauf si elle est protégée par le Salvateur, sauvée par la potion de vie, ou si c'est l'Ancien (sa première vie).
  2. La cible de la potion de mort de la Sorcière (non bloquée par le Salvateur), cause `witch`. Si c'est aussi la victime des loups, elle ne meurt qu'une fois, de la cause `wolves`.
  3. Les autres morts de nuit (Loup blanc, etc.).

  Chaque étape de nuit déclare ses morts de l'aube, et le moteur les calcule dans l'ordre de nuit, ce qui donne l'ordre ci-dessus. Les causes (`wolves`, `witch`, `vote`, `hunter`, `grief`) ne sont connues que du meneur (`docs/04` §Projection).
- `R-41` **Morts en chaîne** : à chaque mort, on applique les effets « à la mort » (le Chasseur tire, l'amoureux meurt de chagrin, l'Enfant sauvage se transforme, le Maire désigne son successeur…). On répète jusqu'à ce qu'il n'y ait plus de nouveaux effets, puis on vérifie la victoire (`R-05`).
- `R-42` L'ordre des effets à la mort est : chagrin des amoureux → Chasseur → succession du Maire. Pour une même vague de morts (l'aube, l'exécution, un tir) :
  1. on tue d'abord tous les chagrins, de proche en proche (cause `grief`) ;
  2. puis on met en file les tirs de Chasseur de tous les morts de la vague, dans l'ordre des morts ;
  3. puis les successions du Maire.

  Une mort causée par un effet de la file (le tir du Chasseur) forme une nouvelle vague, dont les effets s'ajoutent **à la fin** de la file.
- `R-43` Option `revealRoleOnDeath` (par défaut : `true`) : le rôle d'un joueur est révélé à tous quand il meurt. Si elle vaut `false`, seul le meneur le voit.
- `R-44` La victoire (`R-05`) est vérifiée quand la file des effets à la mort est **vide**. Seule exception : la succession du Maire, qui ne peut tuer personne, est sautée si la partie est déjà gagnée.
- `R-45` **Le Chasseur se dévoile en tirant.** La file des effets est publique : dès que son tir est attendu, son rôle est révélé à tous, même avec `revealRoleOnDeath: false`.
- `R-46` **Valeurs par défaut des effets** (`R-13`) : à la fin du minuteur, seul l'effet en tête de file prend sa valeur par défaut (pas de tir, successeur tiré au sort), puis le suivant lance son propre minuteur. Un forçage du meneur résout toute la file de cette façon.

## 6. Le Maire (option `mayor`, activée par défaut)

Le Maire est un **titre** (badge), pas un rôle. Il se cumule avec n'importe quel rôle.

- `R-50` Le Maire est élu au **premier jour qui suit une nuit** (jour 1, ou jour 2 en role play), juste après l'aube et avant le débat. Les joueurs vivants peuvent se déclarer candidats (facultatif, sur un minuteur `timers.mayorCandidacy`), puis on vote. S'il n'y a aucun candidat, tous les vivants sont éligibles.
- `R-51` Sa voix compte double et il départage les égalités (`R-33`).
- `R-52` **Succession** : le meneur choisit le fonctionnement à la création, avec l'option `mayorSuccession`.
  - `designate` (par défaut) : à sa mort, le Maire désigne immédiatement un successeur parmi les vivants (minuteur de 30 s, sinon le choix se fait au hasard). La désignation se fait pendant la résolution des morts (`R-42`).
  - `reelect` : à sa mort, le titre disparaît. Au début du jour suivant (après l'aube), une nouvelle `MAYOR_ELECTION` a lieu. Si le Maire meurt à l'exécution, le village n'a pas de Maire jusqu'à l'élection du lendemain, et les égalités de la nuit et du vote suivant se résolvent sans lui (`tieBreak` → `revote`).
- `R-53` Si le Maire perd son droit de vote (Idiot du village), il perd aussi son titre, qui suit la même règle de succession.

## 7. Morts, spectateurs, déconnexions

- `R-60` Un joueur mort voit le canal « cimetière » et, si l'option `deadSeeRoles` est active, tous les rôles. Il ne voit jamais les canaux des vivants.
- `R-61` Un joueur déconnecté reste dans la partie. Ses actions passent en attente puis prennent leur valeur par défaut à la fin du minuteur. Le meneur voit l'état de connexion de chacun.
- `R-62` Le meneur peut **remplacer** un joueur déconnecté par un nouvel utilisateur, qui hérite alors du rôle et de l'état.
- `R-63` Le **pseudo** d'un joueur est unique dans la partie, sans tenir compte de la casse ni des espaces en début et en fin. Un pseudo déjà pris est refusé (`NAME_TAKEN`). L'état de connexion (`R-61`) n'est pas un fait de jeu : il vit dans le Durable Object, hors du moteur et du journal (`docs/04`).

## 8. Options de partie (récapitulatif)

| Clé | Type | Défaut | Réf. |
|---|---|---|---|
| `playMode` | `inPerson` \| `remote` | `inPerson` | — |
| `gameMode` | `classic` \| `white-night` \| `vampire` | `classic` | `docs/11` |
| `mayor` | bool | `true` | §6 |
| `dealMode` | `simultaneous` \| `ceremony` | `simultaneous` | `docs/12` §3 |
| `pilotMode` | `manual` \| `assisted` | `assisted` | `docs/12` §1 |
| `roleplay` | bool | `false` | §9 (modificateur) |
| `mayorSuccession` | `designate` \| `reelect` | `designate` | R-52 |
| `revealRoleOnDeath` | bool | `true` | R-43 |
| `deadSeeRoles` | bool | `true` | R-60 |
| `voteVisibility` | `public` \| `secret` | `public` | R-30 |
| `allowAbstain` | bool | `false` | R-30 |
| `allowSpare` | bool | `true` | R-36 |
| `tieBreak` | `mayor` \| `revote` \| `nobody` | `mayor` | R-33 |
| `wolfVoteMode` | `unanimous` \| `majority` | `unanimous` | R-34 |
| `wolvesWinOnParity` | bool | `false` | R-02 |
| `seerMode` | `role` \| `team` | `role` | Voyante |
| `littleGirlRisk` | `{ base, increase }`, en points de % : `base` de 0 à 50, `increase` de 0 à 25 (probabilité plafonnée à 75 %) | `{ base: 10, increase: 10 }` | Petite fille |
| `witchSelfSave` | `never` \| `firstNightOnly` \| `always` | `firstNightOnly` | Sorcière |
| `fakeWakeForDeadRoles` | bool | `true` en présentiel | R-20 |
| `parallelNight` | bool | `false` | R-22 |
| `timers` | objet (secondes par phase, `null` = pas de minuteur) | voir `packages/protocol/src/options.ts` (D-02). Voyante, Sorcière, Cupidon et amoureux : `nightAction` ; tir du Chasseur : `hunterShot` | `R-14` |

## 9. Modificateur « Role play » (option `roleplay`)

Le role play n'est **pas un mode de jeu**. C'est un **modificateur** : il s'ajoute par-dessus n'importe quel mode (Classique, Nuit blanche, Vampire) et ralentit le début de partie pour la rendre plus immersive. Ses règles sont préfixées `RP-`.

### Personnage
- `RP-01` Pendant la distribution (`DEAL`), en plus de découvrir son rôle, chaque joueur remplit sa **fiche de personnage** : nom de personnage (obligatoire, 2 à 30 caractères), **métier** (choisi dans une liste ou saisi librement), un **trait** ou une anecdote (optionnel, 140 caractères maximum) et un portrait (avatar de la galerie). Un bouton « Inspire-moi » propose une combinaison aléatoire.
- `RP-02` La fiche est **publique** : tout le monde voit le personnage de chacun (sur `PlayerChip`, en sous-titre du pseudo). Elle ne dit **jamais** rien du rôle.
- `RP-03` Le meneur peut refuser une fiche (contenu inapproprié), et le joueur doit alors la modifier.

### Boucle modifiée
```
DEAL (+ fiches) → PRESENTATIONS (jour 1) → NIGHT 1 (sans mort) → DAWN → MAYOR_ELECTION → DAY_DEBATE → DAY_VOTE → EXECUTION → NIGHT 2 → … (boucle normale)
```
- `RP-10` **Jour 1 = présentations.** Les joueurs passent un par un, dans l'ordre des places. Celui qui a la parole voit « À toi de te présenter », avec un minuteur (`timers.presentation`, 60 s par défaut). Tout le monde voit sa fiche en grand. En distanciel, la présentation peut aussi être postée dans le chat du village. Il n'y a **ni élection, ni vote** le jour 1.
- `RP-11` **Nuit 1 sans mort.** Tous les rôles d'information et de mise en place agissent normalement (Voyante, Cupidon, Enfant sauvage, Renard, Salvateur, Corbeau, Joueur de flûte…). En revanche, **toute action qui tue est désactivée** pour cette nuit : le vote des loups (ils se réveillent quand même pour se reconnaître et peuvent se concerter), la potion de mort de la Sorcière, le Grand méchant loup, et le tirage de la Nuit blanche. Le mode Vampire **garde** la conversion, puisqu'elle ne tue pas.
- `RP-12` L'**aube du jour 2** annonce qu'il n'y a pas de victime (« La nuit a été calme… »). Le Corbeau et le Montreur d'ours appliquent leurs effets normalement. Puis la boucle normale reprend : Maire, débat, vote, exécution, nuit 2.
- `RP-13` Les règles qui parlent du « premier vote » ou de la « première nuit » (l'Ange, l'option `witchSelfSave = firstNightOnly`) visent la **première nuit avec des morts possibles** (nuit 2) et le **premier vote** (jour 2).

### Mise en scène
- `RP-20` À la mort d'un joueur, l'annonce cite son personnage : « Mathilde, la boulangère, a été retrouvée morte… », suivie du rôle si `revealRoleOnDeath` est actif.
- `RP-21` Le script du meneur (`NarratorScript`) propose des formules qui reprennent les personnages et les métiers. Ce sont des gabarits i18n avec des variables `{character}` et `{job}`.
- `RP-22` L'écran de fin affiche, pour chaque joueur, le pseudo, le personnage et le rôle.

### Compatibilité avec les modes
- Nuit blanche : compatible. Le modificateur est visible par tout le monde, ce qui ne trahit pas le mode. L'absence de mort la nuit 1 vaut pour tous les modes.
- Vampire : compatible (voir `RP-11`).

Chaque option est définie dans un schéma Zod unique (`packages/protocol/src/options.ts`, ADR 0008), qui alimente à la fois le moteur et l'écran de configuration.

Options présentes dans le schéma mais refusées par le moteur tant que leur jalon n'est pas atteint (`R-15`) : `roleplay: true` (M5), `dealMode: 'ceremony'` (M4), `parallelNight: true` (M5), et un `gameMode` autre que `classic` (M7).
