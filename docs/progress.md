# Suivi d'avancement

Ce fichier suit l'exécution de la roadmap (`docs/10-roadmap.md`), jalon par jalon.
Il est mis à jour par la commande `/jalon` : une case est cochée quand la tâche est
commitée et que `pnpm check` passe.

---

## M0 — Socle

**But** : un monorepo vide mais « prêt pour la prod ».

**Terminé quand** : l'URL de production affiche l'accueil, la PWA est installable,
la CI est verte et une PR produit une URL de preview.

### Décisions bloquantes (`docs/12` §7)

| ID | Décision | État |
|---|---|---|
| D-16 | Langue de la V1 : français seul, i18n prêt dès M0 | ✅ validé |

Aucune décision 🟡 ne bloque M0.

### Versions retenues

`docs/05-stack.md` impose « la dernière version stable, puis on verrouille ».
Trois écarts à « la toute dernière » sont imposés par les pairs de dépendances,
vérifiés le 2026-10-21 :

| Outil | Version retenue | Dernière publiée | Raison de l'écart |
|---|---|---|---|
| TypeScript | **6.0.3** | 7.0.2 | `typescript-eslint@8.72` exige `typescript >=4.8.4 <6.1.0` |
| Vitest | **4.1.12** | 5.0.5 | `@cloudflare/vitest-pool-workers@0.23` exige `vitest ^4.1.0` |

Les versions sont centralisées dans le **catalogue pnpm** de `pnpm-workspace.yaml` : les paquets écrivent `catalog:` et non un numéro.

Décision prise pendant T2 : le sens unique des dépendances est vérifié par **`no-restricted-imports`** et non par `eslint-plugin-import-x`. Les imports entre paquets se font par alias (`docs/09`), donc contrôler les alias est le test exact, ne demande aucune résolution de chemin et évite une dépendance (`docs/05` §Ajouter une dépendance).

Le reste est à la dernière stable : pnpm 12.14.0, Turborepo 2.11.10, Vite 8.3.5,
React 19.3.1, Tailwind 4.3.3, ESLint 10.13.0, typescript-eslint 8.72.0,
Prettier 3.9.10, Lefthook 2.2.2, commitlint 21.2.4, Hono 4.13.13,
Wrangler 4.151.3, Zod 4.6.7, i18next 26.5.4, react-i18next 17.1.0,
vite-plugin-pwa 2.0.0, @ladle/react 5.1.1, TanStack Router 1.170.45,
Playwright 1.64.1.

### Tâches

- [x] **T1 — Outillage racine du monorepo**
  - Fichiers : `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.gitignore`, `.npmrc`, `.nvmrc`, `.editorconfig`
  - Contenu : `packageManager: pnpm@12.14.0`, scripts `dev`/`build`/`lint`/`typecheck`/`test`/`test:e2e`/`check`, pipeline Turbo avec dépendances et sorties de cache
  - Tests attendus : `pnpm install` aboutit ; `pnpm exec turbo run check --dry=json` liste les tâches de tous les packages

- [x] **T2 — `packages/config` : tsconfig, ESLint, Prettier, Vitest partagés**
  - Fichiers : `packages/config/package.json`, `tsconfig/{base,react,worker}.json`, `eslint/index.js`, `eslint/zones.js`, `eslint/zones.d.ts`, `prettier/index.json`, `vitest/base.ts`, et `eslint.config.js` à la racine
  - Contenu : TS strict complet (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `erasableSyntaxOnly` qui refuse les `enum` à la compilation), interdiction de `any` et `@ts-ignore`, sens unique des dépendances de `docs/04` et pureté du moteur (ni horloge, ni aléa, ni réseau, ni DOM, ni Cloudflare)
  - Doc mise à jour dans le même commit : `docs/04-architecture.md` (la règle et où elle vit) et `docs/05-stack.md` (catalogue et versions retenues)
  - Tests attendus : `packages/config/test/import-boundaries.test.ts` — 5 cas, lancés par l'API ESLint sur des fixtures : `engine → server` refusé, `web → engine` refusé, `engine → protocol` accepté, `Date`/`Math.random` refusés dans le moteur, `enum` refusé

- [x] **T3 — Hooks Git et Conventional Commits**
  - Fichiers : `lefthook.yml`, `commitlint.config.js`, `.prettierignore`
  - Contenu : `pre-commit` → Prettier + ESLint sur les fichiers modifiés ; `commit-msg` → commitlint avec les scopes de `docs/09` ; `pre-push` → `typecheck`
  - Tests attendus : `commitlint.test.ts` — `feat(engine): x` passe, `broken message` et `feat(unknown): x` échouent

- [x] **T4 — `packages/protocol` : squelette typé**
  - Fichiers : `packages/protocol/package.json`, `tsconfig.json`, `src/index.ts`, `src/version.ts`, `src/health.ts`, `test/health.test.ts`
  - Contenu : `PROTOCOL_VERSION`, schéma Zod `HealthResponse` (le seul message existant à ce jalon), helper `assertNever`
  - Tests attendus : le schéma accepte une réponse valide et rejette un corps inconnu ; `PROTOCOL_VERSION` est un entier positif

- [x] **T5 — `packages/engine` : squelette pur**
  - Fichiers : `packages/engine/package.json`, `tsconfig.json`, `src/index.ts`, `src/result.ts`, `src/rng.ts`, `test/rng.test.ts`
  - Contenu : types `Result`, `EngineError`, et un `Rng` à graine déterministe (le reste du moteur est M1). Aucune dépendance au réseau, au DOM ni à l'horloge
  - Tests attendus : deux `Rng` de même graine produisent la même suite ; deux graines différentes divergent

- [x] **T6 — ADR 0007 : mises à jour immuables ou immer**
  - Fichiers : `docs/adr/0007-mises-a-jour-immuables.md`
  - Décision proposée : **mises à jour immuables natives** (spread + helpers maison), `structuredClone` pour les instantanés, **sans immer**. Motifs : le moteur reste sans dépendance (règle 3 de `CLAUDE.md`), les états de partie sont petits (au plus 25 joueurs), et on évite le coût des Proxy dans le runtime Workers. À rouvrir par un nouvel ADR si l'ergonomie coince en M3
  - Tests attendus : aucun (document). Un test d'immuabilité arrivera avec `apply` en M1

- [ ] **T7 — `packages/i18n` : catalogues fr/en typés**
  - Fichiers : `packages/i18n/package.json`, `tsconfig.json`, `src/index.ts`, `src/fr.json`, `src/en.json`, `test/catalogs.test.ts`
  - Contenu : type dérivé des clés de `fr`, `en` avec toutes les clés présentes (valeurs non traduites admises, D-16), clés en `domaine.sous_domaine.cle`
  - Tests attendus : parité stricte des clés entre `fr` et `en` ; aucune valeur vide en `fr`

- [ ] **T8 — `packages/ui` : tokens, `Button`, Ladle**
  - Fichiers : `packages/ui/package.json`, `tsconfig.json`, `src/styles.css`, `src/Button.tsx`, `src/index.ts`, `src/Button.stories.tsx`, `.ladle/config.mjs`, `.ladle/components.tsx`
  - Contenu : `@import "../../design/tokens.css"` puis `@theme inline` pour exposer les tokens sémantiques à Tailwind ; `Button` avec les variantes `primary`/`secondary`/`ghost`/`danger` et les tailles `md`/`lg`, zone tactile au moins 44 px, anneau de focus `--color-focus` ; décorateur Ladle qui bascule `data-phase` nuit/jour
  - Tests attendus : `test/button.test.tsx` (Testing Library : rend le libellé passé, réagit au clavier, `axe` sans violation) et `test/contrast.test.ts` (exigé par `docs/06` : chaque paire texte/fond des deux thèmes atteint 4,5:1, et 3:1 pour les composants)

- [ ] **T9 — `apps/web` : shell PWA**
  - Fichiers : `apps/web/package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/i18n.ts`, `src/app.css`, `src/routes/__root.tsx`, `src/routes/index.tsx`, `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`
  - Contenu : TanStack Router, i18next branché sur `@rougarou/i18n`, `tokens.css` importé, `data-phase="night"` sur `<html>` (fond de nuit hors partie), page d'accueil statique sans aucun texte en dur, manifest et service worker par `vite-plugin-pwa` (API et WS jamais mis en cache)
  - Tests attendus : `test/home.test.tsx` — l'accueil affiche le titre issu d'i18n et `axe` ne signale rien ; le build écrit `dist/manifest.webmanifest` et un service worker (`test/build-artifacts.test.ts`)

- [ ] **T10 — `apps/server` : Worker Hono, assets et `/api/health`**
  - Fichiers : `apps/server/package.json`, `wrangler.jsonc`, `tsconfig.json`, `vitest.config.ts`, `src/index.ts`, `src/routes/health.ts`, `test/health.test.ts`
  - Contenu : Hono sur `/api/*`, Static Assets servant `apps/web/dist` avec repli SPA, en-tête CSP strict, CORS limité aux origines PWA et `tauri://localhost` ; environnements `preview` et `production` dans `wrangler.jsonc`
  - Tests attendus : `@cloudflare/vitest-pool-workers` — `GET /api/health` renvoie 200 et un corps que le schéma `HealthResponse` de `protocol` valide ; une route `/api/` inconnue renvoie 404 JSON

- [ ] **T11 — `apps/native` : squelette Tauri**
  - Fichiers : `apps/native/package.json`, `apps/native/README.md`
  - Contenu : les scripts `tauri dev` / `tauri android dev` attendus par `CLAUDE.md`, et un README qui note que `src-tauri/` (Cargo, capacités, plugins) est écrit en M8 — pas de chaîne Rust en CI avant ce jalon
  - Tests attendus : aucun (squelette). `pnpm --filter native tauri --help` n'est pas exigé en M0

- [ ] **T12 — Playwright et budget de bundle**
  - Fichiers : `playwright.config.ts`, `e2e/smoke.spec.ts`, `scripts/check-bundle-size.mjs`
  - Contenu : Chromium et WebKit mobile contre `wrangler dev`, un test de fumée (l'accueil se charge, le manifest est servi) ; le script échoue au-delà de 250 ko gzip de JS initial (`docs/08`)
  - Tests attendus : `pnpm test:e2e` passe en local ; `node scripts/check-bundle-size.mjs` sort en 0 sur le build courant

- [ ] **T13 — Workflows GitHub Actions**
  - Fichiers : `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `.github/workflows/release-please.yml`, `release-please-config.json`, `.release-please-manifest.json`
  - Contenu : `ci.yml` (cache pnpm et Turbo, `lint`/`typecheck`/`test` en parallèle, `build`, `test:e2e`, rapport de taille) ; `deploy.yml` (preview par `versions upload` commentée sur la PR, production par `deploy` sur la branche par défaut) ; `release-please.yml`. Les migrations D1 arrivent en M2 : l'étape est présente et conditionnée
  - Tests attendus : relecture, puis CI verte sur la PR (c'est un point de la définition de « terminé »)

- [ ] **T14 — README, vérification finale et rapport**
  - Fichiers : `README.md`, `docs/progress.md`
  - Contenu : commandes réelles, prérequis `corepack enable pnpm`, lien vers le suivi
  - Tests attendus : `pnpm check` complet au vert, puis vérification point par point de la définition de « terminé » de M0

### Points qui demandent une action humaine

Trois éléments de la définition de « terminé » sortent de ce que je peux faire seul :

1. **Secrets GitHub** `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID` à créer dans le dépôt.
2. **URL de production et de preview** : elles n'existent qu'après un premier `wrangler deploy`, qui exige le compte Cloudflare connecté.
3. **La branche courante est `master`**, alors que `docs/08` et `docs/09` parlent de `main`. Les workflows seront écrits sur `master` sauf indication contraire.
