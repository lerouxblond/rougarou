---
description: Démarrer ou reprendre le prochain jalon de la roadmap
argument-hint: "[M0..M9] (optionnel)"
---

1. Lis `CLAUDE.md`, `docs/10-roadmap.md` et `docs/progress.md` (crée ce dernier s'il n'existe pas).
2. Détermine le jalon à traiter : `$ARGUMENTS` s'il est fourni, sinon le premier dont la définition de « terminé » n'est pas remplie.
3. Lis les documents de `docs/` dont ce jalon dépend.
4. Écris dans `docs/progress.md` la liste des tâches du jalon (cases à cocher), dans l'ordre d'exécution, avec pour chacune les fichiers touchés et les tests attendus.
5. Présente ce plan et attends une validation avant d'écrire du code, sauf si le plan ne fait que reprendre des tâches déjà validées.
6. Exécute les tâches une par une : tests, puis code, puis `pnpm check`, puis commit, puis case cochée dans `docs/progress.md`.
7. À la fin, vérifie point par point la définition de « terminé » du jalon et fais un rapport.
