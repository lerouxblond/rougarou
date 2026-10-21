# 0006 — Modificateurs : des couches cumulables, distinctes des modes

- **Statut** : accepté
- **Date** : 2026-10-21

## Contexte
Le Role play change le rythme du début de partie (présentations, première nuit sans mort), mais ni les camps ni la victoire. Il doit pouvoir se combiner avec tous les modes. D'autres options de ce genre viendront (par exemple, un mode « Chronométré » ou « Débutant guidé »).

## Décision
On crée un registre `packages/engine/src/modifiers/` de `GameModifierDefinition`, à côté de celui des modes. Une partie a **un** mode et **zéro ou plusieurs** modificateurs. Un modificateur ne peut qu'ajouter des phases, désactiver des effets de nuit, enrichir le profil des joueurs et le script du meneur. Il ne touche jamais aux camps ni aux conditions de victoire.

## Alternatives considérées
- **Role play comme mode** : il faudrait une variante de chaque mode (« Vampire + Role play »…), ce qui donne une explosion combinatoire.
- **Role play comme simple option booléenne dans le cœur** : c'est faisable, mais chaque option suivante du même genre ajouterait des `if` dans la boucle.

## Conséquences
- Le cœur expose les points d'accroche `extraPhases` et `disabledNightEffects(nightNumber)`.
- Les tests vérifient chaque modificateur avec chaque mode compatible (matrice dans `engine/test/modifiers`).
