# 02 — Catalogue des rôles

> Les noms des rôles sont des termes génériques du folklore et du jeu de déduction sociale. Les **textes de description sont écrits pour ce projet**, sans recopier ceux d'une édition commerciale (voir `docs/07-assets.md`).

## Modèle de données d'un rôle

Chaque rôle est un module de `packages/engine/src/roles/<id>.ts` qui exporte une `RoleDefinition` :

```ts
interface RoleDefinition {
  id: RoleId;                    // 'seer', 'witch'… (anglais, kebab/camel en code)
  team: 'village' | 'wolves' | 'solo';
  tier: 'core' | 'extension';    // core = jalon M3, extension = jalon M6
  unique: boolean;               // ne peut être présent qu'une fois
  minPlayers?: number;
  wakes: 'never' | 'firstNight' | 'everyNight' | 'everyOtherNight';
  nightSteps?: NightStepSpec[];  // ses étapes de nuit : ordre, acteurs, action, défaut, morts de l'aube
  nightObservers?: NightObserverSpec[]; // regarde l'étape d'un autre rôle sans la bloquer (Petite fille)
  onDeath?: (tx, playerId) => void;    // met en file ses effets à la mort (tir du Chasseur)
  dayAction?: ActionSpec;        // ex. Corbeau, Servante (M6)
  winCondition?: (state) => boolean;   // rôles solo uniquement (M6)
  knowsTeammates: boolean;       // ce que ce rôle voit en plus (les loups entre eux)
}
```

Les informations privées qu'un rôle obtient (résultat de la Voyante, partenaire d'un amoureux…) sont rangées dans l'état, dans les infos du joueur, et sortent par la vue projetée (`me.knowledge`, ADR 0010).

Un **registre** (`roles/index.ts`) assemble les définitions. Ajouter un rôle revient à ajouter un fichier, l'inscrire au registre, écrire ses tests et ajouter ses textes i18n. On ne touche jamais au cœur du moteur pour un rôle. C'est ce qui permettra les rôles personnalisés en V2.

## Ordre de nuit

| Ordre | Rôle | Quand | Action |
|---|---|---|---|
| 5 | Voleur | Nuit 1 | Échanger sa carte avec une des 2 cartes en trop |
| 10 | Cupidon | Nuit 1 | Désigner 2 amoureux |
| 12 | Amoureux | Nuit 1 | Se découvrir (information seulement) |
| 15 | Enfant sauvage | Nuit 1 | Choisir un modèle |
| 17 | Chien-loup | Nuit 1 | Choisir son camp |
| 20 | Deux sœurs / Trois frères | Nuit 1 (puis toutes les 2 nuits en option) | Se découvrir et se concerter |
| 30 | Voyante | Chaque nuit | Sonder un joueur (**immédiat**) |
| 32 | Renard | Chaque nuit (tant qu'il a son pouvoir) | Flairer un groupe de 3 joueurs (**immédiat**) |
| 35 | Salvateur | Chaque nuit | Protéger un joueur |
| 37 | Corbeau | Chaque nuit | Marquer un joueur (+2 voix contre lui le lendemain) |
| 40 | Loups-garous (tous les loups, Petite fille en espion) | Chaque nuit | Choisir une victime |
| 42 | Infect père des loups | Chaque nuit (une seule fois par partie) | Infecter la victime au lieu de la tuer |
| 44 | Grand méchant loup | Chaque nuit tant qu'aucun loup n'est mort | Seconde victime |
| 46 | Loup blanc | Toutes les 2 nuits (nuits paires) | Tuer un loup |
| 50 | Sorcière | Chaque nuit | Potion de vie et/ou potion de mort |
| 60 | Joueur de flûte | Chaque nuit | Charmer 2 joueurs |
| 62 | Charmés | Chaque nuit | Se découvrir entre charmés (information) |

## Rôles — palier `core` (jalon M3)

### Loup-garou · `werewolf` · Loups
- La nuit, les loups se reconnaissent et votent ensemble pour une victime (`R-34`). En distanciel, ils ont un canal de chat dédié, ouvert seulement la nuit.
- Un loup ne peut pas cibler un autre loup (sauf le Loup blanc avec son action propre).

### Simple villageois · `villager` · Village
- Aucun pouvoir. Il débat et vote.

### Voyante · `seer` · Village · unique
- Chaque nuit, elle sonde **un** joueur vivant autre qu'elle. Selon l'option `seerMode`, elle découvre son **rôle exact** ou seulement son **camp**.
- Le résultat est **immédiat** (`R-21`) et privé : il entre aussitôt dans ses infos (« Mes infos ») et l'étape se résout. Avec `seerMode: 'role'`, le rôle sondé s'affiche aussi sur ce joueur dans sa liste des joueurs.
- Minuteur ou forçage : elle ne sonde personne.
- Elle lit le camp **effectif** du joueur (`teamOf`) : un joueur infecté (M6) apparaît comme loup.

### Sorcière · `witch` · Village · unique
- Elle possède **1 potion de vie** et **1 potion de mort**, chacune utilisable une fois par partie, et elle peut utiliser les deux la même nuit.
- Elle voit la victime désignée par les loups (ou « personne »), même si le Salvateur la protège (elle ne le sait pas). Si elle utilise sa potion de vie sur un joueur déjà protégé, la potion est quand même consommée : une potion est consommée dès qu'elle est bue.
- Elle répond en **une seule fois** par nuit : `{ save, kill }`, où « ne rien faire » vaut `false` et `null`. Aucun aller-retour ne trahit ainsi un choix.
- Potion de vie : seulement s'il y a une victime et que la potion reste. Sur elle-même, selon l'option `witchSelfSave` (`never`, `firstNightOnly`, `always`).
- Potion de mort : un joueur vivant autre qu'elle. Sa cible meurt à l'aube (cause `witch`, connue du seul meneur), même si le Salvateur la protège.
- Elle se réveille chaque nuit, **même sans potion** : sinon, le meneur trahirait leur usage.
- Minuteur ou forçage : elle ne fait rien.

### Chasseur · `hunter` · Village · unique
- Quand il meurt, quelle qu'en soit la cause (chagrin compris), un tir entre dans la file des effets à la mort, après le chagrin et avant la succession du Maire (`R-42`). Il désigne un joueur vivant, qui meurt avec la cause `hunter` et déclenche à son tour ses effets. S'il meurt la nuit, il tire à l'aube.
- Minuteur `hunterShot` (30 s) ou forçage : pas de tir.
- Son rôle est révélé dès que le tir est attendu, même avec `revealRoleOnDeath: false` (`R-45`).

### Cupidon · `cupid` · Village · unique
- La nuit 1 (ordre 10), il désigne 2 joueurs vivants distincts (il peut se choisir lui-même), qui deviennent **amoureux**. Il connaît le couple, mais pas les rôles des amoureux. Minuteur ou forçage : pas d'amoureux.
- Étape « Amoureux » (nuit 1, ordre 12) : chaque amoureux découvre l'autre, son pseudo et son rôle (dans ses infos et dans la liste des joueurs), puis confirme. Minuteur ou forçage : confirmé.
- Si un amoureux meurt, l'autre meurt de chagrin aussitôt (`R-41`, cause `grief`). Si le couple réunit un loup et un non-loup, voir `R-03`.

### Petite fille · `little-girl` · Village · unique
- **Elle choisit de prendre le risque.** Pendant l'étape des loups, elle a l'action « Espionner ». Par défaut, elle n'espionne pas. Elle n'est pas un acteur de l'étape et ne la bloque jamais.
- **Ce qu'elle voit.** Dès qu'elle espionne, elle voit en direct les votes de la meute (les cibles sont nommées). Chaque loup vivant y apparaît sous un **pseudo partiellement dévoilé** :
  - une case par caractère, donc la longueur se voit, et les espaces restent visibles ;
  - **un tiers des lettres** (arrondi à l'inférieur, au moins une à partir de 3 lettres) apparaissent, à des positions tirées au hasard. Par exemple, `A _ _ _ _ _ e` pour « Alexane » (7 lettres, 2 dévoilées). Un pseudo de 1 ou 2 lettres ne montre que sa longueur ;
  - le tirage est refait **chaque nuit** et pour chaque loup, et les loups sont listés dans un ordre tiré au hasard : en espionnant plusieurs nuits, elle recoupe ses indices. Les pseudos partiels de chaque nuit restent dans ses infos.
  - Le pseudo complet et l'identifiant d'un loup ne partent jamais vers elle. Les tirages sont inscrits dans l'événement, pour le rejeu.
- **Le risque grandit à chaque prise de risque.** La n-ième nuit où elle espionne, elle est repérée avec la probabilité `min(base + (n − 1) × increase, 75 %)`. Option `littleGirlRisk` : `base` de 0 à 50 % (défaut **10**), `increase` de 0 à 25 points (défaut **10**). Avec les défauts : 10 %, 20 %, 30 %… jusqu'à 75 %. Seules les nuits où elle espionne comptent, et le compteur ne retombe pas après qu'elle a été repérée. Un tirage par nuit espionnée, inscrit dans l'événement.
- **Ce que reçoivent les loups** quand elle est repérée : une **liste de 3 suspects**, la Petite fille et 2 autres non-loups vivants tirés au hasard (moins s'il n'y en a pas assez), dans l'ordre des places. L'indice, « La Petite fille vous observe : c'est l'une de ces personnes », reste ensuite dans leurs infos. Si elle est repérée de nouveau, les loups reçoivent une **nouvelle** liste, tirée à part : en croisant les listes, ils resserrent l'étau.
- Cela marche autant en présentiel qu'à distance. Le chat des loups, et sa version masquée pour elle, arrivent en M5.

### Maire (titre, pas un rôle)
- Voir `R-50` à `R-52`. On le représente comme un **badge** sur le joueur, pas comme un `RoleDefinition`.

## Rôles — palier `extension` (jalon M6)

### Salvateur · `guardian` · Village · unique
- Chaque nuit, il protège un joueur (lui-même compris) de l'attaque des loups. Il **ne peut pas protéger le même joueur deux nuits de suite**. La protection ne bloque ni la potion de mort, ni le Loup blanc.

### Ancien · `elder` · Village · unique
- Il survit à la **première** attaque des loups (la deuxième le tue).
- S'il est tué par le village (vote, tir du Chasseur, potion de la Sorcière), **tous les villageois perdent leurs pouvoirs** jusqu'à la fin de la partie. Cet effet est annoncé publiquement.

### Idiot du village · `village-idiot` · Village · unique
- S'il est désigné par le vote du jour, son rôle est révélé et il **ne meurt pas**, mais il perd son droit de vote pour le reste de la partie. S'il était Maire, il perd ce titre.
- Il meurt normalement de toutes les autres causes.

### Bouc émissaire · `scapegoat` · Village · unique
- En cas d'égalité au vote du jour, c'est **lui** qui meurt, quelle que soit l'option `tieBreak`. Avant de mourir, il désigne les joueurs autorisés à voter le lendemain.

### Loup blanc · `white-werewolf` · Solo · unique · minPlayers 12
- Il vote avec les loups comme un loup normal. Les nuits paires, il peut en plus tuer un loup.
- Il gagne s'il est le **dernier survivant**. Les loups le voient comme un loup.

### Infect père des loups · `infect-wolf` · Loups · unique
- Une fois par partie, après le vote des loups, il peut **infecter** la victime au lieu de la tuer. Elle rejoint alors le camp Loups en secret, garde son rôle et ses pouvoirs, et se réveille désormais avec les loups.
- L'infection est bloquée si la victime est protégée par le Salvateur ou sauvée par la Sorcière. Dans ce cas, le pouvoir n'est pas consommé.

### Grand méchant loup · `big-bad-wolf` · Loups · unique
- Tant qu'aucun joueur du camp Loups n'est mort, il dévore chaque nuit une **seconde victime**, en solo, après le vote des loups.

### Enfant sauvage · `wild-child` · Village → Loups · unique
- La nuit 1, il choisit un modèle. Si ce modèle meurt, l'Enfant sauvage **devient un loup** (en secret) et se réveille avec les loups dès la nuit suivante.

### Chien-loup · `wolf-hound` · Village ou Loups · unique
- La nuit 1, il choisit son camp de façon définitive. S'il choisit les loups, il se réveille avec eux.

### Renard · `fox` · Village · unique
- La nuit, il désigne un joueur. Le moteur examine ce joueur et ses **deux voisins vivants** (selon l'ordre des places). S'il y a au moins un loup parmi eux, le Renard le sait et garde son pouvoir. Sinon, il l'apprend et **perd son pouvoir**.

### Corbeau · `raven` · Village · unique
- La nuit, il peut marquer un joueur. Au vote du lendemain, ce joueur a **+2 voix** contre lui, et ce marquage est annoncé publiquement au début du jour.

### Deux sœurs · `sister` (×2) / Trois frères · `brother` (×3) · Village
- Les sœurs (ou les frères) se connaissent. La composition doit compter exactement 2 sœurs ou 3 frères. En distanciel, elles ou ils partagent un canal privé.

### Montreur d'ours · `bear-tamer` · Village · unique
- À chaque aube, si au moins un de ses **voisins directs vivants** est un loup (infectés compris), le message « L'ours grogne » est annoncé publiquement.

### Chevalier à l'épée rouillée · `rusty-knight` · Village · unique
- S'il est tué par les loups, le **premier loup vivant à sa gauche** (selon l'ordre des places) meurt à l'aube suivante.

### Joueur de flûte · `piper` · Solo · unique · minPlayers 10
- Chaque nuit, il charme 2 joueurs (jamais lui-même, ni deux fois le même). Les charmés se découvrent entre eux.
- Il gagne dès que **tous les autres joueurs vivants** sont charmés.

### Ange · `angel` · Solo puis Village · unique
- S'il est éliminé lors du **premier vote du jour** ou de la **première nuit**, il gagne seul et la partie s'arrête. Sinon, il devient un simple villageois.

### Servante dévouée · `devoted-servant` · Village · unique
- Quand un joueur est exécuté, et **avant** que son rôle soit révélé, elle peut se dévoiler et prendre ce rôle. Les pouvoirs qu'elle récupère sont remis à neuf (par exemple, les potions de la Sorcière). Sa carte de Servante est alors révélée.

### Voleur · `thief` · Village (selon sa nouvelle carte) · unique
- On ajoute 2 cartes en trop à la distribution. La nuit 1, le Voleur peut échanger sa carte avec l'une des deux. Si les deux cartes sont des loups, l'échange est obligatoire.

## Rôles propres à un mode de jeu

Ces rôles ne sont disponibles que dans le mode qui les déclare (`docs/11-modes-de-jeu.md`).

### Vampire originel · `vampire` · Vampires · unique · mode `vampire` uniquement
- Chaque nuit, il convertit un joueur. Il ne tue jamais. La succession, la victoire et le secret suivent les règles `V-10` à `V-41`.
- Un joueur converti n'est **pas** un nouveau `RoleDefinition` : il garde son rôle, et on lui ajoute le **statut** `vampire` (camp effectif = Vampires, avec la date de conversion pour la succession `V-20`).

## Compositions suggérées

Les compositions ci-dessous concernent le mode **Classique**. Chaque mode fournit sa propre fonction `suggestComposition` (voir `docs/11`).

Le moteur propose une composition par défaut (`suggestComposition(playerCount, tierFilter)`), que le meneur peut modifier. La règle de base est la suivante :

| Joueurs | Loups | Rôles spéciaux village suggérés |
|---|---|---|
| 5–6 | 1 | Voyante, Sorcière |
| 7–8 | 2 | Voyante, Sorcière, Chasseur |
| 9–11 | 2 | + Cupidon, Petite fille |
| 12–15 | 3 | + Salvateur, Ancien |
| 16–19 | 4 | + Idiot du village, Renard |
| 20–24 | 5 | + Corbeau, Montreur d'ours |

Le reste des places est complété par des Simples villageois. Un rôle qui n'est pas encore disponible (palier `extension` avant M6) n'est pas suggéré : sa place revient à un Simple villageois.

Un **indicateur d'équilibre** s'affiche dans l'écran de configuration et suit chaque + et − du meneur. C'est la somme des poids des rôles de la composition :

| Rôle | Poids | Rôle | Poids |
|---|---|---|---|
| Simple villageois | +1 | Chasseur | +3 |
| Loup-garou | −6 | Cupidon | −2 |
| Voyante | +7 | Petite fille | +3 |
| Sorcière | +4 | | |

Un total de −3 à +3 s'affiche « Équilibré », au-dessus « Avantage village », en dessous « Avantage loups », toujours avec un libellé et pas seulement une couleur. Chaque rôle ajouté plus tard déclare son poids. Les poids sont des **données de configuration**, pas un résultat de jeu : ils vivent dans `packages/protocol/src/composition.ts`, à côté du schéma des options, pour que l'indicateur suive les + et − sans aller-retour avec le serveur. La suggestion, elle, vient du mode (`suggestComposition`, `docs/11`) : le moteur l'envoie au meneur pendant la configuration (`suggestion` dans sa vue) (P29, M4).

## Cas limites (tous doivent avoir un test)

Les cas 1 et 3 sont testés en M3. Les cas 2 et 9 reposent sur le Salvateur et l'Infect père des loups : M3 pose leurs points d'accroche (la potion de vie est consommée dès qu'elle est bue, la Voyante lit le camp effectif), et leurs tests arrivent en M6 avec ces rôles.

1. Cupidon unit un loup et un villageois → ils forment un camp mixte (`R-03`).
2. La Sorcière sauve la cible alors que le Salvateur l'avait déjà protégée → personne ne meurt et la potion est consommée.
3. Le Chasseur meurt de chagrin (amoureux) → il tire quand même.
4. L'Ancien meurt par la potion de mort → les villageois perdent leurs pouvoirs.
5. Égalité au vote alors que le Bouc émissaire est vivant → le Bouc émissaire meurt, même s'il n'était pas parmi les ex æquo.
6. Le modèle de l'Enfant sauvage meurt pendant la même aube que d'autres joueurs → la transformation prend effet à la nuit suivante.
7. Le Maire meurt et désigne un successeur qui meurt de chagrin dans la même chaîne → une nouvelle succession est déclenchée.
8. Le Loup blanc est le dernier loup face à des amoureux mixtes → on applique la priorité de `R-06`.
9. La Voyante sonde un joueur infecté → elle le voit comme loup.
10. Le dernier loup meurt et le Grand méchant loup est déjà mort → le village gagne à la vérification suivante.
