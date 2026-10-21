# 0005 — Modes de jeu en plugins, distincts des presets

- **Statut** : accepté
- **Date** : 2026-10-21

## Contexte
En plus du jeu classique, le produit propose des modes aux règles fondamentalement différentes : Nuit blanche (sans loup et déguisée en partie classique) et Vampire (conversion au lieu du meurtre). D'autres modes viendront. On ne veut pas les confondre avec les presets, qui ne sont que des compositions sauvegardées.

## Décision
Un mode est une `GameModeDefinition` (dans `packages/engine/src/modes/`), inscrite dans un registre. Elle déclare les camps, les rôles autorisés, les options imposées, les étapes de nuit en plus, les conditions de victoire, les actions du meneur et une éventuelle retouche de projection (`disclosure: 'disguised'`). La boucle de phases, les votes, le Maire et le pipeline des morts restent communs. Un preset référence un mode.

## Alternatives considérées
- **Modes codés comme des options (`if (mode === 'vampire')` dans le cœur)** : c'est rapide au début, mais chaque mode contamine tout le moteur, et la dette grandit à chaque nouveau mode.
- **Modes vus comme des presets enrichis** : un preset ne peut pas changer une condition de victoire ni masquer le mode. Ce sont deux niveaux différents.
- **Moteur séparé par mode** : on dupliquerait les votes, les morts et le Maire.

## Conséquences
- Ajouter un mode revient à ajouter un fichier, ses tests et ses textes i18n. Les règles du mode se spécifient d'abord dans `docs/11`.
- Les modes déguisés imposent un test de forme des messages (`W-33`), car le déguisement est une exigence de sécurité au même titre que la non-fuite des rôles.
- Le cœur doit exposer assez de points d'accroche. Un point d'accroche ajouté pour un mode doit rester générique.
