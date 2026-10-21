# 0002 — Moteur de jeu pur et event sourcing léger

- **Statut** : accepté
- **Date** : 2026-10-21

## Contexte
Les règles du Loup-garou comptent beaucoup d'interactions entre rôles et de cas limites. Le meneur doit pouvoir annuler une action. On veut des tests déterministes et une chronologie en fin de partie.

## Décision
`packages/engine` est une bibliothèque TypeScript pure de type `(state, command, ctx) → { state, events } | error`. L'état se reconstruit à partir des événements, l'aléa vient d'une graine, et les rôles sont des plugins déclaratifs avec des points d'accroche.

## Alternatives considérées
- **Logique dans le DO** : plus rapide à écrire, mais impossible à tester sans runtime et difficile à réutiliser (meneur automatique, simulations).
- **Bibliothèque de machine à états (XState)** : très expressive, mais la logique des rôles en plugins s'y intègre mal et la sérialisation est plus lourde.

## Conséquences
- `Undo`, la chronologie de fin, le débogage par rejeu et les tests de propriétés deviennent faciles.
- Il faut de la discipline : pas d'effet de bord dans le moteur, ce que l'ESLint vérifie (imports interdits).
