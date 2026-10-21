# 0007 — Mises à jour immuables sans immer

- **Statut** : accepté
- **Date** : 2026-10-21

## Contexte

Le moteur suit le schéma `(state, command) => { state, events } | error` et ne mute jamais ses entrées (`CLAUDE.md` règle 3, ADR 0002). `docs/09` laissait le choix ouvert : « mises à jour immuables, avec `structuredClone` ou `immer` si nécessaire, à décider dans l'ADR 0007 au jalon M0 ».

Ce qui pèse sur la décision :

- L'état d'une partie est **petit** : au plus 24 joueurs plus un meneur (`docs/00`), chacun avec un rôle, des statuts et quelques marqueurs. On n'est pas sur des dizaines de milliers d'objets.
- L'état doit rester **sérialisable sans surprise** : il est écrit dans le SQLite du Durable Object en instantané tous les 50 événements (`docs/04`), et rejoué à l'identique.
- `packages/engine` doit rester **sans dépendance** : la règle de lint du monorepo lui interdit déjà Node, Cloudflare et le DOM, et `docs/05` demande de ne pas ajouter une dépendance qu'on peut couvrir en moins de 50 lignes.
- Le code tourne dans le **runtime Workers**, où l'on préfère éviter une couche de `Proxy` sur le chemin chaud.

## Décision

On écrit les mises à jour **à la main, en immuable** : littéraux d'objet et de tableau, `...spread`, `map`, `filter`, et quelques helpers maison typés pour les retouches répétitives (remplacer un joueur dans une liste, modifier une entrée de dictionnaire). `structuredClone` sert uniquement à figer les **instantanés** et les états de référence dans les tests. On n'ajoute **pas** immer.

## Alternatives considérées

- **immer** — l'ergonomie des brouillons (`draft.players[i].alive = false`) est réelle et évite des spreads imbriqués. Écarté pour trois raisons : il introduit une dépendance dans le paquet qu'on veut garder le plus pur du dépôt ; les objets gelés et les `Proxy` compliquent la sérialisation vers le SQLite du DO et la lecture des diffs en test ; et le gain porte surtout sur des états profonds, ce que l'état d'une partie n'est pas. La structure de `GameState` sera plate et indexée par identifiant de joueur, ce qui réduit encore les spreads imbriqués.
- **Mutation puis `structuredClone` à l'entrée de `apply`** — plus simple à écrire, mais elle fait reposer la pureté sur la discipline au lieu du typage, et un oubli de clone deviendrait un bug de fuite d'état difficile à voir. On garde le clone pour les instantanés, pas comme filet de sécurité.
- **Une bibliothèque de structures persistantes (Immutable.js)** — impose son propre modèle de données à tout le dépôt, y compris au protocole et aux vues projetées, pour un bénéfice nul à cette taille d'état.

## Conséquences

- `packages/engine` reste sans aucune dépendance d'exécution, et la règle de lint qui garde sa pureté continue de suffire.
- Les états sont des objets JSON ordinaires : l'instantané du DO, le rejeu et la comparaison en test ne demandent aucune conversion.
- Le coût est ergonomique : une mise à jour imbriquée demande plusieurs niveaux de spread. On le contient en gardant `GameState` **plat** (dictionnaires indexés par identifiant plutôt que tableaux imbriqués) et en concentrant les retouches répétitives dans des helpers testés.
- `readonly` et `ReadonlyArray` sont utilisés dans les types de `GameState` pour que le compilateur refuse une mutation accidentelle.
- À surveiller : si l'écriture des règles devient pénible au jalon M3, quand les rôles à effets différés arrivent, on rouvre la question par un **nouvel** ADR qui remplace celui-ci (un ADR accepté ne se modifie pas, `docs/09`).
