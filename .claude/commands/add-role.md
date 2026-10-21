---
description: Ajouter un rôle au moteur en suivant la procédure du projet
argument-hint: <role-id>
---

Ajoute le rôle `$ARGUMENTS` en suivant **strictement** cette procédure :

1. Lis sa fiche dans `docs/02-roles.md` ainsi que les règles `R-xx` qu'elle cite dans `docs/01-regles-du-jeu.md`. Si la fiche est ambiguë ou incomplète, arrête-toi et propose une précision de la doc avant de coder.
2. Écris d'abord les tests dans `packages/engine/test/roles/$ARGUMENTS.test.ts` avec le DSL de test : le cas nominal, chaque contrainte de ciblage, chaque cas limite le concernant dans `docs/02` §Cas limites.
3. Ajoute le test de non-fuite dans `packages/engine/test/leaks/` : ce que ce rôle sait ne doit être visible que des viewers autorisés.
4. Implémente `packages/engine/src/roles/$ARGUMENTS.ts` (une `RoleDefinition`) et inscris-le au registre. Ne modifie le cœur du moteur que si un point d'accroche manque. Dans ce cas, ajoute le point d'accroche de façon générique et documente-le dans `docs/04`.
5. Ajoute les textes dans `packages/i18n` (`roles.<id>.name`, `.short`, `.rules`, `.narrator.wake`, `.narrator.sleep`) en fr, et les clés en en.
6. Ajoute l'icône fallback dans `packages/ui/icons/icon-role-<id>.svg` et une entrée dans `apps/web/public/assets/CREDITS.md`.
7. Lance `pnpm check`. Fais un commit `feat(engine): add <id> role`.
