# 0010 — Les informations privées vivent dans l'état et sortent par la vue projetée

- **Statut** : accepté
- **Date** : 2026-10-22

## Contexte
En M3, des joueurs apprennent des choses en secret : le résultat de la Voyante, le partenaire et le rôle d'un amoureux, le couple formé par Cupidon, les pseudos partiels des loups vus par la Petite fille, la liste de suspects que reçoivent les loups. `docs/04` prévoyait un message WebSocket `private` pour les transmettre. Ce message aurait trois défauts :
- il serait **perdu au rechargement** de la page ou à la reconnexion, puisque seule la vue est renvoyée à la connexion ;
- il échapperait aux **tests de non-fuite**, qui portent sur `projectView` (`CLAUDE.md` règle 2) ;
- il ferait une deuxième sortie d'information cachée, alors que la projection doit être la seule (`docs/04` §Projection).

## Décision
Chaque joueur a, dans `GameState`, une liste d'**infos** (`knowledge`), alimentée par l'événement `KnowledgeGained`. `projectView` les ajoute à la vue de ce joueur seul (`me.knowledge`, « Mes infos », J22), et la vue du meneur les montre toutes. Le message `private` est retiré du protocole.

## Alternatives considérées
- **Message `private`** : voir le contexte. Il faudrait en plus le rejouer à chaque reconnexion, donc le stocker quelque part : on retomberait sur l'état.
- **Recalculer les infos à partir du journal au moment de projeter** : `projectView` reçoit l'état, pas le journal, et chaque rôle devrait savoir relire ses événements. Plus fragile, pour le même résultat.

## Conséquences
- Une information privée suit les mêmes règles que le reste : schéma strict dans `packages/protocol/src/views.ts`, liste blanche, test de non-fuite par rôle.
- L'état grossit un peu (quelques entrées par joueur et par partie), ce qui reste négligeable devant le journal.
- Une info obtenue est un fait révélé : un groupe d'événements qui contient `KnowledgeGained` ne s'annule pas (`R-11`).
- Une info est un instantané : si un rôle change plus tard (M6), l'info d'origine reste telle qu'elle a été apprise.
