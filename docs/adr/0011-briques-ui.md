# 0011 — Les briques de l'interface complète (M4)

- **Statut** : accepté
- **Date** : 2026-10-23

## Contexte
M4 remplace les écrans bruts par le design system « Lanterne » (`docs/06`). `docs/05` impose déjà Radix UI Primitives, Motion et des polices auto-hébergées, et `docs/06` cite Lucide pour les icônes génériques. Deux besoins de M4 ne sont couverts par aucune brique imposée : le **glisser-déposer des places** (US-12), qui doit rester utilisable au clavier et au lecteur d'écran, et le **QR du code de partie** (US-10). Il faut aussi des sons publics en M4 (`docs/10`), alors qu'aucun fichier de son n'existe encore (`docs/07`).

## Décision
On ajoute, au moment où une tâche s'en sert et à la dernière version stable :
- **Radix UI Primitives** (dialog, tabs, toast, switch), **Motion** et **`@fontsource`** (Cormorant Garamond, DM Sans, Pixelify Sans), comme le prévoit `docs/05` ;
- **`lucide-react`** pour les icônes génériques (`docs/06` §Iconographie), importées une par une ;
- **`@dnd-kit`** (core et sortable) pour le glisser-déposer : il gère le pointeur, le toucher et le clavier, et annonce les déplacements aux lecteurs d'écran ;
- **`uqr`** pour le QR : un encodeur sans dépendance qui produit un SVG.

Les sons publics de M4 sont **synthétisés** par la Web Audio API, sans fichier (P31).

## Alternatives considérées
- **Glisser-déposer HTML5 natif** : pas de toucher sur mobile, pas de clavier ; il faudrait réécrire ce que `@dnd-kit` fait déjà.
- **Glisser-déposer maison** (pointeur + boutons) : plus de 50 lignes pour l'accessibilité seule (`docs/05` §Ajouter une dépendance).
- **Bibliothèque de QR plus connue** (`qrcode`) : elle tire des dépendances Node et pèse davantage pour le même SVG.
- **Sons CC0 téléchargés** : il faut les choisir, les normaliser et les créditer ; c'est le travail de M4b, avec les profils audio.

## Conséquences
- Chaque dépendance entre dans le catalogue pnpm et dans `docs/05` avec sa version. Le budget de bundle (`scripts/check-bundle-size.mjs`) les surveille : `@dnd-kit` et `uqr` ne se chargent que dans le salon du meneur.
- Les sons synthétisés ne coûtent aucun octet d'asset, mais ils sonneront « simples » : M4b les remplace par de vrais fichiers sans changer leurs points de déclenchement.
- Radix impose la structure de ses composants : nos composants de `packages/ui` l'enveloppent et n'exposent que nos tokens.
