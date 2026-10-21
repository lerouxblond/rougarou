---
description: Ajouter un mode de jeu au moteur en suivant la procédure du projet
argument-hint: <mode-id>
---

Ajoute le mode `$ARGUMENTS` :

1. Vérifie que ses règles sont spécifiées dans `docs/11-modes-de-jeu.md` (identifiants de règle, victoire, secret, cas limites). Sinon, arrête-toi et propose la spécification.
2. Écris les tests d'abord : `packages/engine/test/modes/$ARGUMENTS.test.ts` (déroulé nominal, victoire, chaque cas limite) et, si le mode est `disguised`, le test de forme des messages façon `W-33`.
3. Implémente `packages/engine/src/modes/$ARGUMENTS.ts` (une `GameModeDefinition`) et inscris-le au registre. N'ajoute un point d'accroche dans le cœur que s'il reste générique, et documente-le dans `docs/04`.
4. Ajoute les textes i18n (`modes.<id>.name`, `.tagline`, `.rules`, les scripts du meneur), l'illustration fallback `mode-<id>` et la `ModeCard`.
5. Lance `pnpm check`. Fais un commit `feat(engine): add <id> game mode`.
