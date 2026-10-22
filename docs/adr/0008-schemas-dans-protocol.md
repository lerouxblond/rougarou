# 0008 — Options, commandes et vues dans `protocol`, état et événements dans le moteur

- **Statut** : accepté
- **Date** : 2026-10-22

## Contexte

`docs/01` §8 plaçait le schéma Zod des options dans `packages/engine/src/options.ts`. Or les options traversent le réseau : le meneur les envoie dans la commande de configuration, et le serveur doit les valider à la frontière (`CLAUDE.md` règle 4). Les commandes et les vues projetées sont dans le même cas. Le sens unique des dépendances (`docs/04`) interdit à `protocol` d'importer `engine`, alors que l'inverse est permis.

## Décision

Les schémas Zod des **options**, des **commandes** (avec leur enveloppe `{ actor, cmd }`) et des **vues projetées** vivent dans `packages/protocol`, et le moteur en importe les types. `GameState` et les **événements** restent internes au moteur : ils ne quittent jamais le serveur. Les vues sont décrites par des schémas **stricts** (`z.strictObject`), qui refusent toute clé non déclarée.

## Alternatives considérées

- **Schémas dans le moteur, que le protocole réexporte** : cela inverserait le sens des dépendances, et le client web (qui n'a pas le droit d'importer le moteur) ne pourrait plus valider ce qu'il reçoit.
- **Schémas dupliqués** : deux sources de vérité qui divergent tôt ou tard.
- **Événements dans `protocol`** : ils contiennent toute l'information cachée (rôles, cibles de nuit). Les exposer dans un paquet que le client importe inviterait à les envoyer tels quels, ce qui contredit la règle 2.

## Conséquences

- Le client et le serveur valident les mêmes schémas, sans dépendre du moteur.
- Les tests de non-fuite valident chaque vue avec son schéma strict : un champ ajouté par erreur à la projection fait échouer le test, au lieu de partir en silence vers un client.
- Ajouter une option ou une commande touche `protocol` (et `PROTOCOL_VERSION` si le changement est incompatible) avant de toucher le moteur.
