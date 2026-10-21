# apps/native — squelette

Enveloppe Tauri 2 de la PWA : Windows, macOS, Linux et Android. **Le contenu
réel de ce paquet est écrit au jalon M8** (`docs/10-roadmap.md`). À M0, seul
l'emplacement est réservé dans le monorepo.

Ce qui reste à faire en M8 (`docs/08-deploiement.md`) :

- `src-tauri/` : `Cargo.toml`, `tauri.conf.json` (avec `build.frontendDist`
  pointant sur `../../web/dist` et `build.devUrl` sur `http://localhost:5173`),
  `src/main.rs`.
- Plugins : `updater` (desktop), `deep-link` (`rougarou://join/ABC123`),
  `haptics` (mobile), `os`, et `stronghold` ou `store` pour le jeton.
- `capabilities/*.json` au strict minimum : accès réseau vers le domaine de
  l'API, et rien sur le système de fichiers.
- Les jobs de `release.yml` et la signature (voir le tableau de `docs/08`).

L'app native embarque le build web plutôt que de charger une URL distante :
elle démarre vite et passe la revue des stores (`docs/08`).

Aucune chaîne Rust n'est installée en CI avant M8 : les commandes
`pnpm --filter native tauri …` annoncées dans `CLAUDE.md` ne fonctionneront
qu'à partir de ce jalon.
