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
  nightOrder?: number;           // plus petit = plus tôt
  nightAction?: ActionSpec;      // cibles possibles, contraintes, défaut
  dayAction?: ActionSpec;        // ex. Corbeau, Servante
  hooks?: {                      // réactions aux événements du moteur
    onDeath?: …; onTargeted?: …; onVoteResolved?: …; onDawn?: …;
  };
  winCondition?: (state) => boolean;   // rôles solo uniquement
  visibility?: …;                // ce que ce rôle voit en plus (ex. loups entre eux)
}
```

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
- Chaque nuit, elle sonde un joueur vivant autre qu'elle. Selon l'option `seerMode`, elle découvre son **rôle exact** ou seulement son **camp**. Le résultat est immédiat et privé.
- Un joueur infecté apparaît comme loup (`team` effectif = loups).

### Sorcière · `witch` · Village · unique
- Elle possède **1 potion de vie** et **1 potion de mort**, chacune utilisable une fois par partie, et elle peut utiliser les deux la même nuit.
- Elle voit la victime désignée par les loups, même si le Salvateur la protège (elle ne le sait pas). Si elle utilise sa potion de vie sur un joueur déjà protégé, la potion est quand même consommée.
- Elle ne peut se sauver elle-même que selon l'option `witchSelfSave`.
- La cible de la potion de mort meurt à l'aube, même si le Salvateur la protège.

### Chasseur · `hunter` · Village · unique
- Quand il meurt, quelle qu'en soit la cause, il désigne immédiatement un joueur vivant qui meurt avec lui (minuteur de 30 s, sinon pas de tir). S'il meurt la nuit, il tire à l'aube.

### Cupidon · `cupid` · Village · unique
- La nuit 1, il désigne 2 joueurs (il peut se choisir lui-même), qui deviennent **amoureux**. Les amoureux apprennent l'identité et le rôle l'un de l'autre.
- Si un amoureux meurt, l'autre meurt de chagrin aussitôt (`R-41`). Si les deux amoureux sont de camps différents, voir `R-03`.

### Petite fille · `little-girl` · Village · unique
- **Adaptation numérique** : pendant le tour des loups, elle voit en lecture seule leur canal et leur vote en cours, **avec les pseudos masqués** (« Loup A », « Loup B »…).
- Option `littleGirlRisk` (0 à 50 %, défaut 0) : chaque nuit où elle espionne, les loups ont cette probabilité de recevoir l'indice « vous vous sentez observés ». Cet indice ne révèle jamais son identité. Elle peut choisir de ne pas espionner.

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

Le reste des places est complété par des Simples villageois. Un **indicateur d'équilibre** (score heuristique du poids de chaque camp) s'affiche dans l'écran de configuration.

## Cas limites (tous doivent avoir un test)

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
