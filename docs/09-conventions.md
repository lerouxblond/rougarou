# 09 — Conventions et normes

## Langue

- **Code** (identifiants, commentaires techniques, noms de fichiers) : anglais.
- **Documentation** (`docs/`, ADR, README) et **textes de l'interface** : français, via i18n.
- **Commits et PR** : en anglais (Conventional Commits). La description de la PR peut être en français.
- Correspondance rôle → identifiant : voir `docs/02` (par exemple, `seer` = Voyante).

## Nommage

| Élément | Convention | Exemple |
|---|---|---|
| Fichiers TS | `kebab-case.ts` | `night-plan.ts` |
| Composants React | `PascalCase.tsx`, un composant exporté par fichier | `RoleCard.tsx` |
| Hooks | `useCamelCase` | `useGameView` |
| Types et interfaces | `PascalCase`, sans préfixe `I` | `GameState` |
| Constantes | `SCREAMING_SNAKE_CASE` | `MAX_PLAYERS` |
| Commandes du moteur | Verbe à l'impératif | `CastVote` |
| Événements du moteur | Participe passé | `VoteCast` |
| Clés i18n | `domaine.sous_domaine.cle` | `roles.seer.name`, `phase.night.title` |
| Tables SQL | `snake_case` au singulier | `game_player` |

## TypeScript

- On préfère les **unions discriminées** aux classes et à l'héritage (commandes, événements, messages).
- On n'utilise pas d'`enum` : des unions de littéraux et des objets `as const`.
- Les erreurs métier du moteur sont **renvoyées** (`Result`), jamais levées. On ne lève une exception que pour un bug (invariant violé).
- Les fonctions du moteur sont pures et ne mutent pas leurs entrées (mises à jour immuables, avec `structuredClone` ou `immer` si nécessaire, à décider dans l'ADR 0007 au jalon M0).
- Les imports se font par alias de package (`@rougarou/engine`), jamais en chemin relatif entre packages.
- Exhaustivité : `switch` sur une union, avec `assertNever(x)` dans le `default`.

## React

- On n'utilise que des composants fonctionnels et des hooks. On n'utilise pas de `useEffect` pour dériver un état : on calcule pendant le rendu.
- Un composant d'écran ne fait pas d'appel réseau direct : il passe par les hooks `useGameView()`, `useSendCommand()` et les requêtes TanStack.
- Styles : utilitaires Tailwind qui reposent sur les tokens. On n'utilise pas de couleur en dur ni de `style={{}}`, sauf pour une valeur calculée (position dans le cercle des joueurs).
- Accessibilité : chaque interaction a un équivalent clavier. Les éléments interactifs sont de vrais `button` ou `a`, et `aria-live` sert pour les annonces de phase et de mort.

## Tests

| Niveau | Où | Ce qu'on attend |
|---|---|---|
| Moteur | `packages/engine/test` | **Couverture de 90 % minimum** (lignes et branches). Un fichier de test par rôle, un par règle `R-xx` critique, plus les 10 cas limites de `docs/02` |
| Non-fuite | `packages/engine/test/leaks` | Simulation d'une partie complète. Pour chaque vue de chaque joueur à chaque étape, on vérifie qu'aucune information interdite n'apparaît |
| Propriétés | `packages/engine/test/properties` | **fast-check** : des parties aléatoires (composition, actions) se terminent toujours, l'état reste cohérent (pas de mort qui vote, nombres cohérents) |
| Serveur | `apps/server/test` | Vitest avec le pool Workers : cycle de vie du DO, tickets WS, autorisations, limitation de débit |
| UI | `packages/ui`, `apps/web` | Testing Library pour les composants à logique, axe pour l'accessibilité |
| E2E | `e2e/` | Playwright : 1 meneur + 5 joueurs (6 contextes), une partie complète jusqu'à la victoire, et la reconnexion en cours de nuit |

Les scénarios de partie s'écrivent avec un **DSL de test** lisible :

```ts
game()
  .players(['Alice', 'Bob', 'Chloé', 'David', 'Eve'])
  .roles({ Alice: 'werewolf', Bob: 'seer', Chloé: 'witch', David: 'hunter', Eve: 'villager' })
  .night(n => n.seer('Bob', 'Alice').wolves('Eve').witch('Chloé', { save: true }))
  .expectDawn({ deaths: [] })
  .day(d => d.vote({ Alice: 'Bob', Bob: 'Alice', Chloé: 'Alice', David: 'Alice', Eve: 'Alice' }))
  .expectDeath('Alice')
  .expectWinner('village');
```

## Git

- Branches : `main` (toujours déployable), `feat/<sujet>`, `fix/<sujet>`, `chore/<sujet>`, `docs/<sujet>`.
- **Conventional Commits** (vérifiés par commitlint) : `feat(engine): add guardian role`, `fix(web): hide role card on blur`.
  Scopes autorisés : `engine`, `protocol`, `server`, `web`, `ui`, `i18n`, `native`, `ci`, `docs`, `design`, `deps`.
- Les PR se font par squash merge. Une PR = un sujet. Une PR qui touche plus de 400 lignes de code non généré doit être découpée.
- Hooks Lefthook : `pre-commit` → lint-staged (Prettier + ESLint sur les fichiers modifiés). `commit-msg` → commitlint. `pre-push` → `typecheck`.

## Documentation

- La doc vit dans `docs/` et **suit le code** : une PR qui modifie une règle, un rôle, le protocole ou le schéma de base de données met à jour la doc dans le même commit.
- **ADR** (`docs/adr/NNNN-titre.md`, gabarit dans `0000-template.md`) pour chaque décision structurante. Un ADR accepté ne se modifie pas : on en écrit un nouveau qui le remplace.
- On écrit un TSDoc sur les fonctions exportées de `engine` et `protocol`. On ne commente pas ce que le code dit déjà.
- Le `README.md` racine décrit l'installation, les commandes et les liens vers la doc. `CHANGELOG.md` est généré par release-please.

## Définition de « terminé » (pour toute tâche)

1. `pnpm check` passe.
2. Les tests couvrent le nouveau comportement, et le test de non-fuite est mis à jour si de l'information cachée est concernée.
3. Les textes passent par i18n (fr renseigné, en avec la clé présente même si elle n'est pas traduite).
4. L'UI est vérifiée en thème nuit et jour, sur mobile 375 px et desktop 1280 px.
5. La doc et les ADR sont à jour.
