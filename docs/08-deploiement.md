# 08 — Hébergement, CI/CD et releases

## Hébergement : tout sur Cloudflare (formule gratuite)

| Composant | Service | Remarque |
|---|---|---|
| PWA (fichiers statiques) | **Workers Static Assets**, servis par le même Worker que l'API | Même origine que l'API, donc des cookies `SameSite=Lax` simples et pas de CORS pour le web |
| API + WebSocket | **Worker** `rougarou` (Hono) | `/api/*`, `/ws/*` |
| Temps réel | **Durable Object** `GameRoom` (SQLite) | Classe déclarée par une migration dans `wrangler.jsonc` |
| Base de données | **D1** `rougarou-db` | Une base par environnement |
| Domaine | `rougarou.<compte>.workers.dev` au départ, domaine personnalisé ensuite (optionnel, environ 10 € par an) | — |

**Quotas à surveiller** (formule gratuite des Workers) : requêtes quotidiennes des Workers et des Durable Objects, lignes D1 lues et écrites. L'API Hibernation et l'envoi d'états uniquement lors des changements gardent une soirée de jeu bien en dessous de ces quotas. Un tableau de bord Cloudflare suffit en V1. Si les quotas sont dépassés de façon régulière, on passe à la formule Workers payante (environ 5 $ par mois), sans aucun changement de code.

### Environnements

| Env | Déclencheur | Worker | D1 |
|---|---|---|---|
| `local` | `pnpm dev` | `wrangler dev` (Miniflare) | D1 locale |
| `preview` | PR ouverte ou mise à jour | `wrangler versions upload` → URL de preview commentée sur la PR | `rougarou-db-preview` |
| `production` | Merge sur `main` | `wrangler deploy` | `rougarou-db` |

Les migrations D1 s'appliquent **avant** le déploiement du Worker, et elles doivent rester rétrocompatibles avec la version précédente du Worker (on ajoute des colonnes, on n'en supprime jamais dans la même release).

## Workflows GitHub Actions (`.github/workflows/`)

### `ci.yml` : sur chaque PR et chaque push
1. Checkout, setup pnpm et Node, cache pnpm et Turbo.
2. `pnpm install --frozen-lockfile`.
3. En parallèle : `lint`, `typecheck`, `test` (Vitest, y compris le pool Workers).
4. `build` (web + server).
5. `test:e2e` (Playwright, Chromium et WebKit mobile) contre `wrangler dev`.
6. Rapport de taille du bundle commenté sur la PR (échec si le JS initial dépasse 250 ko gzip).

### `deploy.yml` : sur un push sur `main` (après le passage de `ci`), et en preview sur une PR
- Utilise `cloudflare/wrangler-action`.
- Étapes : `wrangler d1 migrations apply <db> --remote`, puis `wrangler deploy` (ou `versions upload` pour une preview).
- Le Worker de preview (`rougarou-preview`) est créé automatiquement par `deploy --env preview` au premier passage, car `versions upload` exige qu'il existe déjà.
- Secrets nécessaires : `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- Secrets du Worker (définis une fois par `wrangler secret put`, pas dans GitHub) : `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`/`SECRET`, clé du fournisseur d'e-mail.

### `release-please.yml` : sur un push sur `main`
- Maintient une PR de release (version semver et `CHANGELOG.md`) à partir des Conventional Commits.
- Avant la V1, les versions restent en `0.x` (`bump-minor-pre-major`, première version `0.1.0`) : la `v1.0.0-rc.1` arrive en M8 et la `v1.0.0` en M9 (`docs/10`).
- Au merge de cette PR, le tag `vX.Y.Z` est créé, ce qui déclenche `release.yml`.

### `release.yml` : sur un tag `v*`
Il crée une **GitHub Release** (en brouillon, publiée quand tous les jobs ont réussi) avec :

| Job | Runner | Outil | Artefacts |
|---|---|---|---|
| desktop-windows | `windows-latest` | `tauri-apps/tauri-action` | `.msi`, `.exe` (NSIS) |
| desktop-macos | `macos-latest` | `tauri-action` (`--target universal-apple-darwin`) | `.dmg` |
| desktop-linux | `ubuntu-22.04` | `tauri-action` | `.AppImage`, `.deb`, `.rpm` |
| android | `ubuntu-latest` + JDK + Android SDK/NDK | `tauri android build --apk` puis signature | `.apk` signé (et `.aab` pour un éventuel Play Store) |
| ios | `macos-latest` | `tauri ios build` | Upload vers **TestFlight** (pas de `.ipa` installable depuis la Release) |
| updater | — | `tauri-action` génère `latest.json` | Pour la mise à jour automatique des apps desktop (plugin `updater`) |

La version de l'app est lue depuis le tag et injectée dans `tauri.conf.json` et dans `package.json`.

### Signature : ce qu'il faut savoir

| Plateforme | Sans signature | Avec signature | Secrets GitHub |
|---|---|---|---|
| Windows | Fonctionne, mais SmartScreen affiche un avertissement | Certificat de signature de code (payant) ou Azure Trusted Signing | `WINDOWS_CERTIFICATE`, `WINDOWS_CERTIFICATE_PASSWORD` |
| macOS | Gatekeeper bloque (il faut faire clic droit → Ouvrir) | Compte Apple Developer (99 $/an), signature et **notarisation** | `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID` |
| Linux | Aucun problème | — | — |
| Android | Un APK **doit** être signé, avec un keystore généré une fois et conservé | — | `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` |
| iOS | Impossible à distribuer | Compte Apple Developer, TestFlight (jusqu'à 10 000 testeurs) ou App Store | `APPLE_*`, plus `APP_STORE_CONNECT_API_KEY` |
| Mises à jour desktop | — | Paire de clés du plugin updater de Tauri | `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` |

**Recommandation** : en V1, on distribue sur iPhone via la **PWA** (« Ajouter à l'écran d'accueil » dans Safari). Le job iOS est écrit, mais **désactivé** (`if: vars.IOS_ENABLED == 'true'`) tant qu'aucun compte Apple Developer n'existe. Même logique pour la signature macOS et Windows : les jobs fonctionnent sans signature et l'activent automatiquement si les secrets existent.

## Tauri : configuration attendue

- `apps/native/src-tauri/tauri.conf.json` : `build.frontendDist` → `../../web/dist`, `build.devUrl` → `http://localhost:5173`.
- L'app native charge le build **embarqué**, et pas l'URL distante, pour démarrer vite et passer la revue des stores. L'API est appelée sur `https://<domaine>/api`.
- Plugins Tauri : `updater` (desktop), `deep-link` (`rougarou://join/ABC123`), `haptics` (mobile), `os`, `store` ou `stronghold` (jeton).
- Les capacités (fichiers `capabilities/*.json`) donnent le **strict minimum** : réseau vers le domaine de l'API, et rien sur le système de fichiers.

## Liste de contrôle d'une release

- [ ] La CI est au vert sur `main`.
- [ ] Les migrations D1 sont appliquées et rétrocompatibles.
- [ ] La version de `protocol` a été augmentée si le protocole WS a changé (les anciens clients reçoivent `PROTOCOL_OUTDATED`).
- [ ] Le CHANGELOG a été relu.
- [ ] Une partie de test à 1 meneur et 5 joueurs a été jouée sur la preview (navigateur desktop, Safari iOS, Chrome Android).
