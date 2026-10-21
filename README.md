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

- Node LTS, pnpm, un compte GitHub et un compte Cloudflare (gratuit).
- Pour les releases : les secrets listés dans `docs/08-deploiement.md` (seuls `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` et le keystore Android sont indispensables au départ).

## Maquettes

Canevas de conception : https://claude.ai/artifact/1J7FNUx2o6rmad95PXPKWs (privé, à partager depuis le menu Partager).

## Documentation

Tout est dans [`docs/`](docs/) : vision, règles, rôles, fonctionnalités, architecture, stack, design system, assets, déploiement, conventions, roadmap et ADR.

## Développement

```bash
pnpm install
pnpm dev        # http://localhost:5173 (web) + API locale
pnpm check      # lint + typecheck + tests
```
