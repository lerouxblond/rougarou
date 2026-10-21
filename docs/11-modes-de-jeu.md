# 11 — Modes de jeu

## Mode, preset, composition : trois notions distinctes

| Notion | Ce que c'est | Exemple | Qui le définit |
|---|---|---|---|
| **Mode de jeu** | Les **règles fondamentales** d'une partie : quels camps existent, ce qui se passe la nuit, comment on gagne, ce que les joueurs savent du mode | Classique, Nuit blanche, Vampire | Le code (`packages/engine/src/modes/`) |
| **Composition** | Quels rôles sont distribués, et combien de chaque | 2 Loups, 1 Voyante, 1 Sorcière, 4 Villageois | Le meneur, à chaque partie |
| **Preset** | Une composition et des options **sauvegardées** pour un mode donné | « Soirée à 10, Classique » | Un utilisateur (table `preset`) |

| **Modificateur** | Une couche **orthogonale** aux modes, qu'on peut cumuler avec n'importe lequel d'entre eux, et qui modifie légèrement la boucle ou la mise en scène | Role play (`docs/01` §9) | Le code (`packages/engine/src/modifiers/`) |

Un preset appartient toujours à **un** mode (`preset.mode_id`). Le mode limite les rôles et les options autorisés.

## Modèle de données d'un mode

Chaque mode est un module `packages/engine/src/modes/<id>.ts` qui exporte une `GameModeDefinition`, inscrite dans un registre. Les modes suivent la même logique de plugins que les rôles (`docs/02`).

```ts
interface GameModeDefinition {
  id: ModeId;                          // 'classic' | 'white-night' | 'vampire'
  disclosure: 'public' | 'disguised';  // disguised = les joueurs ne voient jamais ce mode
  disguiseAs?: ModeId;                 // mode affiché aux joueurs si disguised
  teams: TeamId[];                     // camps qui existent dans ce mode
  allowedRoles: RoleId[] | 'all';
  requiredRoles?: { role: RoleId; count: number }[];
  forcedOptions?: Partial<GameOptions>;     // options imposées par le mode
  defaultOptions?: Partial<GameOptions>;
  suggestComposition(playerCount: number): Composition;
  validateComposition(c: Composition, n: number): ValidationIssue[];
  setup?(state, ctx): GameState;            // après la distribution
  nightSteps?: NightStepSpec[];             // sous-étapes ajoutées à l'ordre de nuit
  narratorActions?: NarratorActionSpec[];   // boutons propres au mode (tableau de bord du meneur)
  winConditions: WinCondition[];            // remplace ou complète docs/01 §1
  project?(view, state, viewer): View;      // retouche de la vue (déguisement)
}
```

Un **modificateur** est une `GameModifierDefinition` (`id`, `compatibleModes`, `extraPhases`, `disabledNightEffects(nightNumber)`, `playerProfileSchema`, `narratorTemplates`). Un modificateur ne touche ni aux camps ni aux conditions de victoire. Pour un mode, la règle est : « est-ce que ça change qui gagne et comment ? ». Pour un modificateur : « est-ce que ça change le rythme ou l'habillage ? ».

Le cœur du moteur (boucle de phases, votes, Maire, pipeline des morts) reste **commun à tous les modes**. Un mode ne fait qu'ajouter des sous-étapes, des conditions de victoire et des retouches de projection.

---

## 1. Classique · `classic` · public

C'est le jeu de base, tel que le décrivent `docs/01` et `docs/02`. Tous les rôles sont autorisés. C'est le mode par défaut.

---

## 2. Nuit blanche · `white-night` · **déguisé**

> Il n'y a aucun loup. Chaque nuit, le meneur fait mourir un joueur au hasard. Le village gagne s'il comprend qu'il n'y a pas de loup.

### Mise en place
- `W-01` Le meneur choisit « Nuit blanche » et configure une **composition leurre** : une composition classique **avec** des loups, exactement comme pour une vraie partie. C'est cette composition que les joueurs voient.
- `W-02` À la distribution, chaque carte de loup de la composition leurre est remplacée par un **Simple villageois**. Les autres rôles sont distribués normalement.
- `W-03` Rôles autorisés : seulement les rôles du camp Village **dont le pouvoir ne dépend pas d'un loup** : Villageois, Voyante, Sorcière, Chasseur, Cupidon, Salvateur, Idiot du village, Bouc émissaire, Corbeau, Renard, Montreur d'ours. Les rôles qui ont besoin d'un loup pour fonctionner (Petite fille, Enfant sauvage, Chien-loup, Chevalier…) sont **interdits dans la composition leurre**, sinon ils trahiraient le mode.

### Déroulé
- `W-10` La nuit, l'ordre de nuit est **celui de la composition leurre**. On appelle donc l'étape des loups, que personne n'exécute, avec une durée aléatoire réaliste (entre 20 et 60 s) pour imiter un vrai vote de loups.
- `W-11` À l'étape des loups, l'app **tire au sort** une victime parmi les vivants. Le meneur la voit, peut **retirer au sort** une fois, puis valide. Cette victime remplace la victime des loups dans la résolution (`R-40`). Le Salvateur, la Sorcière et l'Ancien interagissent avec elle exactement comme avec une victime de loups.
- `W-12` La Voyante voit le vrai rôle de la cible (donc jamais de loup) : c'est un indice légitime. Le Renard ne trouve jamais de loup, et le Montreur d'ours ne grogne jamais.
- `W-13` Le jour se déroule normalement (Maire, débat, vote, exécution).

### Victoire
- `W-20` À tout moment pendant le jour, le village peut **déclarer à voix haute** (ou dans le chat) qu'il n'y a pas de loup. Le meneur clique alors sur **« Le village déclare : pas de loup »**.
  - En **Nuit blanche**, le village gagne aussitôt.
  - **Ce bouton existe dans tous les modes**, sinon sa présence trahirait la Nuit blanche. Dans les autres modes, le meneur annonce que la déclaration est fausse et la partie continue. Une option `falseDeclarationPenalty` (désactivée par défaut) peut entraîner la défaite immédiate du village.
- `W-21` **Défaite** : le village perd s'il ne reste plus que **2 joueurs vivants** (seuil configurable `whiteNightLoseAt`).

### Exigences de secret (critiques)
- `W-30` Les vues projetées des joueurs d'une Nuit blanche doivent être **identiques** à celles d'une partie classique jouée avec la composition leurre : même champ `gameMode` (`classic`), même composition affichée, mêmes étapes de nuit, mêmes minuteurs visibles.
- `W-31` Le mode réel n'apparaît que dans la **vue du meneur**. Il apparaît aussi dans les données D1 de la partie, mais seulement après `ENDED`.
- `W-32` La révélation d'un rôle à la mort (`revealRoleOnDeath`) montre le vrai rôle. Une ancienne carte de loup devenue Villageois est révélée « Simple villageois », ce qui constitue un indice.
- `W-33` **Test obligatoire** : on génère deux parties (Nuit blanche et Classique avec la même composition leurre et la même graine), puis on vérifie que la **forme** des messages envoyés aux joueurs non-meneurs est identique : mêmes types, mêmes champs, durées de nuit dans la même plage.
- `W-34` À la fin de la partie, l'écran de fin révèle le mode avec une animation dédiée (« C'était une Nuit blanche »).

---

## 3. Vampire · `vampire` · public

> Il n'y a pas de loup, mais un vampire, qui convertit un joueur par nuit. Les vampires ne se connaissent pas entre eux, et le vrai danger est de s'éliminer entre vampires au vote.

### Camps et rôles
- `V-01` Il y a deux camps : **Village** et **Vampires**.
- `V-02` Rôle obligatoire : **Vampire originel** (`vampire`, ×1). On n'utilise aucun rôle du camp Loups ni aucun rôle solo.
- `V-03` Rôles du village autorisés en V1 : Villageois, Voyante, Sorcière (adaptée, `V-14`), Chasseur, Salvateur (adapté, `V-13`), Idiot du village, Bouc émissaire, Corbeau. Les autres rôles sont interdits tant que leurs interactions avec les vampires ne sont pas spécifiées.

### Nuit
- `V-10` Chaque nuit, le **Vampire originel** (ou celui qui en a hérité, `V-20`) choisit un joueur vivant, autre que lui-même, à **convertir**. **Il n'y a aucun meurtre la nuit.** Les morts ne viennent que du jour (vote, Chasseur…).
- `V-11` Le joueur converti apprend à l'aube, en privé : « Tu es désormais un vampire ». Il **garde son rôle et ses pouvoirs**, mais il change de camp. Il **ne sait pas** qui sont les autres vampires, ni qui l'a converti.
- `V-12` Si la cible est **déjà un vampire**, la conversion est perdue. Le vampire actif apprend en privé que sa cible était déjà des siens, ce qui lui révèle cette personne. C'est voulu.
- `V-13` **Salvateur** : il protège sa cible de la conversion.
- `V-14` **Sorcière** : elle voit la cible de la conversion. Sa potion de vie devient un **antidote** (elle annule la conversion de la nuit). Sa potion de mort fonctionne normalement : c'est **la seule mort de nuit possible**.
- `V-15` **Voyante** : elle voit le camp **actuel** de sa cible, donc « Vampire » pour un converti.
- `V-16` Ordre de nuit : Voyante (30) → Salvateur (35) → Corbeau (37) → **Vampire (40)** → Sorcière (50).
- `V-17` Il y a un aube annoncé, mais sans mort (sauf potion de mort). Le meneur annonce « Le village se réveille », et personne n'apprend publiquement qu'une conversion a eu lieu.

### Succession du vampire
- `V-20` Quand le vampire **actif** meurt, son pouvoir passe au **vampire converti depuis le plus longtemps** parmi les vivants. Ce dernier l'apprend en privé (« Tu es le nouveau maître ») et convertit dès la nuit suivante.
- `V-21` L'héritier **n'apprend pas** l'identité des autres vampires, ni celle des joueurs convertis par son prédécesseur. Seul le vampire actif connaît les joueurs qu'il a lui-même convertis.
- `V-22` La succession se répète tant qu'il reste au moins un vampire vivant.

### Victoire
- `V-30` Les **Vampires** gagnent dès que le nombre de vampires vivants est **supérieur ou égal** au nombre de non-vampires vivants. Cette vérification a lieu après chaque résolution, y compris à l'aube après une conversion.
- `V-31` Le **Village** gagne quand il ne reste aucun vampire vivant.
- `V-32` Les vampires votent le jour comme tout le monde. Exécuter un autre vampire est une erreur possible, puisqu'ils ne se connaissent pas : c'est le cœur du mode.

### Secret
- `V-40` La liste des vampires n'est visible **que par le meneur**. Chaque vampire ne voit que lui-même et, s'il est le vampire actif, ses propres conversions.
- `V-41` En distanciel, il n'existe **pas** de canal de chat des vampires.

### Composition suggérée
| Joueurs | Composition |
|---|---|
| 6–8 | Vampire, Voyante, Villageois |
| 9–12 | Vampire, Voyante, Sorcière, Chasseur, Villageois |
| 13+ | Vampire, Voyante, Sorcière, Chasseur, Salvateur, Corbeau, Villageois |

L'**indicateur d'équilibre** doit tenir compte de la conversion : le camp Vampires gagne un joueur par nuit.

---

## Cas limites des modes (tests obligatoires)

1. Nuit blanche : le Salvateur protège la victime tirée au sort → personne ne meurt, et l'aube ressemble exactement à celle d'une partie classique.
2. Nuit blanche : on joue un Chasseur et un Cupidon, et la victime tirée est un amoureux → la chaîne de morts habituelle s'applique.
3. Nuit blanche : le meneur clique sur « Pas de loup » dans une partie Classique → rien ne change côté moteur, et l'événement est journalisé.
4. Vampire : le vampire actif est exécuté le jour → l'héritier est le plus ancien converti vivant. S'il n'y en a aucun, le village gagne.
5. Vampire : on convertit le Chasseur, puis on l'exécute → il tire (son pouvoir est conservé), et la victoire est vérifiée après le tir.
6. Vampire : l'antidote de la Sorcière et la protection du Salvateur s'appliquent sur la même cible → la conversion est annulée, les deux sont consommés, et chacun applique sa propre règle.
7. Vampire : 3 vivants, 1 vampire, la conversion réussit → 2 vampires contre 1, et les vampires gagnent à l'aube.
8. Vampire : la Voyante est convertie → elle continue à sonder, et c'est désormais un vampire qui en tire l'information.
