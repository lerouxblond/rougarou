# Rougarou 🐺🌕

Une application multijoueur temps réel pour jouer au Loup-garou, autour d'une table ou à distance. Le meneur pilote la partie, et chaque joueur reçoit son rôle, agit et vote depuis son téléphone.

- **Web / PWA** : installable depuis le navigateur (iPhone compris).
- **Windows, macOS, Linux, Android** : binaires disponibles dans les [Releases](../../releases).

> Projet non affilié à « Les Loups-garous de Thiercelieux » ni à ses éditeurs. Toutes les illustrations et tous les textes sont originaux.

## Ce dépôt est conçu pour être construit avec Claude Code

1. Ouvrir le dossier dans Claude Code.
2. Lancer `/jalon` : Claude lit `CLAUDE.md`, la roadmap et démarre le jalon M0.
3. Valider le plan proposé, puis laisser travailler. Répéter `/jalon` à chaque jalon.
4. Pour ajouter un rôle plus tard : `/add-role <role-id>`.

## Prérequis (une fois)

- **Node 24** ou plus (la version exacte est dans `.nvmrc`).
- **pnpm**, activé par Corepack : `corepack enable pnpm`. La version est épinglée par le champ `packageManager`, donc aucune installation globale n'est nécessaire.
- Un compte GitHub et un compte Cloudflare (gratuit).
- Pour le déploiement : les secrets `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID` dans les secrets du dépôt GitHub. Les autres, pour les releases natives, sont listés dans `docs/08-deploiement.md`.

## Maquettes

Canevas de conception : https://claude.ai/artifact/1J7FNUx2o6rmad95PXPKWs (privé, à partager depuis le menu Partager).

## Documentation

Tout est dans [`docs/`](docs/) : vision, règles, rôles, fonctionnalités, architecture, stack, design system, assets, déploiement, conventions, roadmap et ADR.

L'avancement jalon par jalon est suivi dans [`docs/progress.md`](docs/progress.md).

## Développement

```bash
corepack enable pnpm   # une fois
pnpm install

pnpm dev          # web (Vite, http://localhost:5173) + Worker (wrangler dev)
pnpm check        # lint + typecheck + tests : à lancer avant chaque commit
pnpm test         # tests unitaires seuls (Vitest)
pnpm test:e2e     # Playwright, contre wrangler dev (nécessite pnpm build)
pnpm build        # build du client
pnpm ladle        # catalogue des composants, en thèmes nuit et jour
pnpm size         # budget de taille du bundle initial
```

Les hooks Git sont installés automatiquement par Lefthook : Prettier et ESLint
avant un commit, commitlint sur le message, `typecheck` avant un push.

## Organisation du dépôt

```
apps/
  web/       PWA React + Vite (interface uniquement)
  server/    Worker Cloudflare (Hono) : API et assets de la PWA
  native/    Tauri 2 — squelette, écrit au jalon M8
packages/
  engine/    Moteur de jeu pur (règles, modes, rôles, projection)
  protocol/  Schémas Zod partagés client ↔ serveur
  ui/        Design system « Lanterne » + Ladle
  i18n/      Catalogues fr/en typés
  config/    tsconfig, ESLint, Prettier, Vitest, commitlint partagés
design/      tokens.css (source de vérité) et sprites de travail
e2e/         Tests Playwright
```

Les versions des outils sont centralisées dans le **catalogue pnpm** de
`pnpm-workspace.yaml` : les paquets écrivent `catalog:` et non un numéro.
