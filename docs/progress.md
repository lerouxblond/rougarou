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

- [x] **T7 — `packages/i18n` : catalogues fr/en typés**
  - Fichiers : `packages/i18n/package.json`, `tsconfig.json`, `src/index.ts`, `src/fr.json`, `src/en.json`, `test/catalogs.test.ts`
  - Contenu : type dérivé des clés de `fr`, `en` avec toutes les clés présentes (valeurs non traduites admises, D-16), clés en `domaine.sous_domaine.cle`
  - Tests attendus : parité stricte des clés entre `fr` et `en` ; aucune valeur vide en `fr`

- [x] **T8 — `packages/ui` : tokens, `Button`, Ladle**
  - Fichiers : `packages/ui/package.json`, `tsconfig.json`, `src/styles.css`, `src/Button.tsx`, `src/index.ts`, `src/Button.stories.tsx`, `.ladle/config.mjs`, `.ladle/components.tsx`
  - Contenu : `@import "../../design/tokens.css"` puis `@theme inline` pour exposer les tokens sémantiques à Tailwind ; `Button` avec les variantes `primary`/`secondary`/`ghost`/`danger` et les tailles `md`/`lg`, zone tactile au moins 44 px, anneau de focus `--color-focus` ; décorateur Ladle qui bascule `data-phase` nuit/jour
  - Tests attendus : `test/button.test.tsx` (Testing Library : rend le libellé passé, réagit au clavier, `axe` sans violation) et `test/contrast.test.ts` (exigé par `docs/06` : chaque paire texte/fond des deux thèmes atteint 4,5:1, et 3:1 pour les composants)

- [x] **T9 — `apps/web` : shell PWA**
  - Fichiers : `apps/web/package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/i18n.ts`, `src/app.css`, `src/routes/__root.tsx`, `src/routes/index.tsx`, `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`
  - Contenu : TanStack Router, i18next branché sur `@rougarou/i18n`, `tokens.css` importé, `data-phase="night"` sur `<html>` (fond de nuit hors partie), page d'accueil statique sans aucun texte en dur, manifest et service worker par `vite-plugin-pwa` (API et WS jamais mis en cache)
  - Tests attendus : `test/home.test.tsx` — l'accueil affiche le titre issu d'i18n et `axe` ne signale rien ; le build écrit `dist/manifest.webmanifest` et un service worker (`test/build-artifacts.test.ts`)

- [x] **T10 — `apps/server` : Worker Hono, assets et `/api/health`**
  - Fichiers : `apps/server/package.json`, `wrangler.jsonc`, `tsconfig.json`, `vitest.config.ts`, `src/index.ts`, `src/routes/health.ts`, `test/health.test.ts`
  - Contenu : Hono sur `/api/*`, Static Assets servant `apps/web/dist` avec repli SPA, en-tête CSP strict, CORS limité aux origines PWA et `tauri://localhost` ; environnements `preview` et `production` dans `wrangler.jsonc`
  - Tests attendus : `@cloudflare/vitest-pool-workers` — `GET /api/health` renvoie 200 et un corps que le schéma `HealthResponse` de `protocol` valide ; une route `/api/` inconnue renvoie 404 JSON

- [x] **T11 — `apps/native` : squelette Tauri**
  - Fichiers : `apps/native/package.json`, `apps/native/README.md`
  - Contenu : les scripts `tauri dev` / `tauri android dev` attendus par `CLAUDE.md`, et un README qui note que `src-tauri/` (Cargo, capacités, plugins) est écrit en M8 — pas de chaîne Rust en CI avant ce jalon
  - Tests attendus : aucun (squelette). `pnpm --filter native tauri --help` n'est pas exigé en M0

- [x] **T12 — Playwright et budget de bundle**
  - Fichiers : `playwright.config.ts`, `e2e/smoke.spec.ts`, `scripts/check-bundle-size.mjs`
  - Contenu : Chromium et WebKit mobile contre `wrangler dev`, un test de fumée (l'accueil se charge, le manifest est servi) ; le script échoue au-delà de 250 ko gzip de JS initial (`docs/08`)
  - Tests attendus : `pnpm test:e2e` passe en local ; `node scripts/check-bundle-size.mjs` sort en 0 sur le build courant

- [x] **T13 — Workflows GitHub Actions**
  - Fichiers : `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `.github/workflows/release-please.yml`, `release-please-config.json`, `.release-please-manifest.json`
  - Contenu : `ci.yml` (cache pnpm et Turbo, `lint`/`typecheck`/`test` en parallèle, `build`, `test:e2e`, rapport de taille) ; `deploy.yml` (preview par `versions upload` commentée sur la PR, production par `deploy` sur la branche par défaut) ; `release-please.yml`. Les migrations D1 arrivent en M2 : l'étape est présente et conditionnée
  - Tests attendus : relecture, puis CI verte sur la PR (c'est un point de la définition de « terminé »)

- [x] **T14 — README, vérification finale et rapport**
  - Fichiers : `README.md`, `docs/progress.md`
  - Contenu : commandes réelles, prérequis `corepack enable pnpm`, lien vers le suivi
  - Tests attendus : `pnpm check` complet au vert, puis vérification point par point de la définition de « terminé » de M0

### Points qui demandent une action humaine

Trois éléments de la définition de « terminé » sortent de ce que je peux faire seul :

1. **Secrets GitHub** `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID` à créer dans le dépôt.
2. **URL de production et de preview** : elles n'existent qu'après un premier `wrangler deploy`, qui exige le compte Cloudflare connecté.
3. **La branche courante était `master`**, alors que `docs/08` et `docs/09` parlent de `main`. Résolu en T15 : la branche a été renommée en `main`.

### Vérification de la définition de « terminé »

| Point | État | Preuve |
|---|---|---|
| Monorepo pnpm + Turborepo, packages et apps | ✅ | 7 paquets : `config`, `engine`, `protocol`, `i18n`, `ui`, `web`, `server`, plus le squelette `native` |
| TS strict, ESLint, Prettier, Lefthook, commitlint, release-please | ✅ | `pnpm check` au vert ; les hooks tournent à chaque commit de ce jalon |
| Worker Hono servant `apps/web` + `GET /api/health` | ✅ | 7 tests dans le runtime Workers, et vérification contre `wrangler dev` |
| Shell PWA (manifest, SW, routage, i18n, tokens, fond de nuit, accueil) | ✅ | Le build produit `manifest.webmanifest` et `sw.js` ; 16 tests |
| Ladle avec un `Button` dans les deux thèmes | ✅ | `pnpm --filter @rougarou/ui run ladle:build` aboutit |
| `ci.yml` et `deploy.yml` (preview et production) | ✅ | Écrits et validés ; la séquence de `ci.yml` passe en local |
| ADR 0001 à 0005 relus, puis ADR 0007 | ✅ | `docs/adr/0007-mises-a-jour-immuables.md` |
| **L'URL de production affiche l'accueil** | ✅ | https://rougarou.neyteck-pro.workers.dev : l'accueil, `/api/health`, le manifest et `sw.js` répondent 200 (2026-10-22) |
| **La PWA est installable** | ✅ (local) | Manifest, service worker, icônes dont une maskable, vérifiés par test et en e2e. À reconfirmer sur l'URL de production |
| **La CI est verte** | ✅ | PR #1 : lint, types, tests et e2e au vert |
| **Une PR produit une URL de preview** | ✅ | PR #4 : le Worker `rougarou-preview` est créé au premier passage, puis l'URL de preview est commentée sur la PR. L'accueil et `/api/health` répondent 200 |

**Total des tests : 107 unitaires (7 paquets) + 18 e2e.**

### Ce qui reste à faire par une personne

1. Créer les secrets `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID` dans les
   secrets du dépôt GitHub.
2. Pousser la branche `main` et ouvrir une PR pour voir la CI et la preview.
3. Confirmer l'installation de la PWA depuis l'URL de production.

Tant que ces trois points ne sont pas faits, M0 est **complet côté code** mais sa
définition de « terminé » n'est pas entièrement vérifiable.

### Clôture de M0 (reprise du 2026-10-22)

Constat : les trois workflows se déclenchent sur `push: [main]`, mais la branche par
défaut du dépôt GitHub est `master`. **Aucune exécution de CI n'a jamais eu lieu**
(`gh run list` vide), aucune PR n'est ouverte et aucun secret n'est défini.

- [x] **T15 — Aligner la branche de déploiement** (option A retenue le 2026-10-22 : `master` renommée en `main`)
  - Option A (conforme à `docs/08` et `docs/09`) : renommer `master` en `main` sur GitHub (`gh api -X POST repos/lerouxblond/rougarou/branches/master/rename -f new_name=main`), puis `git branch -m` en local. Aucun fichier modifié.
  - Option B : passer les workflows sur `master` et mettre à jour `docs/08` et `docs/09` dans le même commit.
  - Tests attendus : `gh api repos/lerouxblond/rougarou --jq .default_branch` renvoie la branche retenue

- [x] **T16 — Secrets Cloudflare** (action humaine, faite le 2026-10-22)
  - `gh secret set CLOUDFLARE_API_TOKEN` et `gh secret set CLOUDFLARE_ACCOUNT_ID`
  - Tests attendus : `gh secret list` les affiche

- [x] **T17 — PR de vérification**
  - Pousser `init/jalon-01`, ouvrir une PR vers la branche par défaut
  - Tests attendus : `ci.yml` au vert, `deploy.yml` commente une URL de preview sur la PR ; après merge, l'URL de production affiche l'accueil et la PWA est installable
  - État (2026-10-22) : PR #1 mergée (squash) et production déployée. « Preview » échoue encore, car Wrangler refuse de téléverser une version d'un Worker qui n'existe pas (`rougarou-preview` n'a jamais été déployé). Release Please échoue aussi : GitHub Actions n'a pas le droit de créer de pull request dans ce dépôt

---

## M1 — Moteur v0 (sans interface)

**But** : on peut jouer une partie Loups contre Villageois entièrement en tests.

**Terminé quand** : la couverture du moteur dépasse 90 % et 1 000 parties aléatoires
se terminent sans violer d'invariant.

### Décisions bloquantes (`docs/12` §7)

| ID | Décision | État |
|---|---|---|
| D-02 | Minuteurs par défaut | ✅ validé |
| D-06 | Le meneur ne joue pas | ✅ validé |
| D-07 | 5 à 24 joueurs en Classique | ✅ validé |
| D-08 | Épargner, abstention en option, pas de vote contre soi | ✅ validé |

### Précisions de règles (règle 5 de `CLAUDE.md`) — ✅ validées le 2026-10-22

`docs/01` laissait des trous ou se contredisait avec `docs/12` sur les points suivants.
Elles sont entrées dans `docs/01` en T1 : P1 → `R-37`, P2 → `R-34`, P3 → `R-12`,
P4 → `R-11`, P5 → `R-13`, P6 → `R-44`, P7 → `R-35`, P8 → `R-38`, P9 → `R-07`,
P10 → `R-14`, P11 → `R-15`, P12 → ADR 0008.

| # | Sujet | Proposition |
|---|---|---|
| P1 | **Clôture des votes** : `docs/01` dit « automatique quand tous ont voté », alors que `docs/12` §1 laisse la clôture au meneur (et `R-31` permet de changer d'avis) | Le vote du village et celui du Maire ne se closent **jamais seuls** : le meneur clôt, ou le minuteur expire. Le moteur expose « tout le monde a voté » pour que le bouton du meneur le signale |
| P2 | **Vote des loups** (`R-34`) | Unanimité : l'étape se résout dès que tous les loups vivants désignent la même cible. Majorité : dès que tous ont voté, la cible en tête l'emporte, et une égalité est tranchée par le meneur. Pas de choix « personne ». Minuteur expiré ou forçage sans accord : pas de victime |
| P3 | **Aube en deux temps** : `docs/12` #9 montre au meneur les morts avant « Lever le jour » | À l'entrée en `DAWN`, les morts sont calculées et seul le meneur les voit. « Lever le jour » les annonce aux joueurs, puis les effets à la mort s'enchaînent. Une deuxième action du meneur passe à la suite |
| P4 | **Annuler** (`R-11`) | Le meneur annule le dernier **groupe d'événements** (une commande). C'est refusé si ce groupe contient une révélation : distribution, annonce des morts, clôture d'un vote, élection, fin de partie. On peut annuler plusieurs fois de suite |
| P5 | **Forcer** (`R-10`) | Valeurs par défaut : loups → pas de victime ; vote → clôture avec les bulletins déposés ; successeur du Maire → tirage ; « J'ai vu mon rôle » → ignoré. Le forçage est journalisé |
| P6 | **Victoire et succession du Maire** (`R-05`, `R-42`) | La victoire est vérifiée une fois la file d'effets vide. Seule exception : la succession du Maire, qui ne peut tuer personne, est sautée si la partie est déjà gagnée |
| P7 | **Élection du Maire** (`R-35`, `R-50`) | Votants = les vivants. On peut voter pour soi (la règle « pas de vote contre soi-même » de D-08 vise l'exécution). Pas d'abstention. Égalité → second vote entre ex æquo → tirage. Aucun bulletin → tirage parmi les éligibles |
| P8 | **Égalité au vote du village** (`R-33`) | `mayor` : le Maire choisit parmi les ex æquo (30 s, puis personne n'est exécuté). `revote` : seuls les ex æquo sont candidats, sans « Épargner ». Aucun bulletin déposé → personne n'est exécuté |
| P9 | **Composition valide en Classique** | Autant de rôles que de joueurs, 5 à 24 joueurs, au moins 1 loup, strictement moins de loups que de non-loups |
| P10 | **Minuteurs dans un moteur sans horloge** | Le moteur range une échéance `deadline = ctx.now + durée` et accepte une commande système `Timeout` seulement si `ctx.now >= deadline`. Les alarmes du DO, Pause et +30 s arrivent en M2 |
| P11 | **Options pas encore prises en charge** | Le schéma contient toutes les options de `docs/01` §8, mais `roleplay: true` (M5), `dealMode: 'ceremony'` (M4) et `parallelNight: true` (M5) sont refusés en M1 avec une erreur explicite |
| P12 | **Où vivent les schémas Zod** : `docs/01` §8 place les options dans `engine/src/options.ts`, mais elles traversent le réseau dans la commande de configuration, et `protocol` ne peut pas dépendre d'`engine` | Les schémas des **options**, des **commandes** et des **vues projetées** vont dans `packages/protocol`. Les **événements** et `GameState` restent internes au moteur. Les vues sont des schémas `.strict()`, ce qui permet aux tests de non-fuite de refuser tout champ inattendu. Décision consignée dans l'ADR 0008 |

### Tâches

- [x] **T1 — Préciser les règles et écrire l'ADR 0008**
  - Fichiers : `docs/01-regles-du-jeu.md` (P1 à P11), `docs/04-architecture.md` (P12), `docs/adr/0008-schemas-dans-protocol.md`
  - Tests attendus : aucun (document)

- [x] **T2 — Outillage de test du moteur**
  - Fichiers : `pnpm-workspace.yaml` (ajout de `fast-check`), `docs/05-stack.md` (Vitest 5 et `@cloudflare/vitest-plugin`, que M0 avait adoptés sans mettre la doc à jour), `packages/engine/package.json`, `packages/engine/vitest.config.ts` (seuils de 90 % en lignes et en branches, mesurés à chaque `pnpm test`)
  - Tests attendus : `pnpm --filter @rougarou/engine test` mesure la couverture et échoue sous 90 % ; une branche non testée du `Rng` (graine non entière) a été couverte

- [x] **T3 — `protocol` : identifiants, options, commandes**
  - Fichiers : `packages/protocol/src/{ids,options,commands}.ts`, `test/{options,commands}.test.ts`
  - Contenu : `GameOptions` (toutes les clés de `docs/01` §8 avec leurs défauts et les minuteurs de D-02), l'union discriminée `Command` avec son enveloppe `{ actor, cmd }`
  - Tests attendus : l'objet vide se complète avec les défauts, une clé inconnue est refusée, chaque commande valide passe et un `type` inconnu est refusé

> **T4 à T8 forment un seul commit.** `evolve`, l'état et les événements couvrent toute
> la boucle de jeu. Un commit T4 isolé aurait donc fait chuter la couverture sous le
> seuil de 90 % imposé en T2, et `pnpm check` aurait échoué. Plutôt que d'abaisser le
> seuil, la boucle a été écrite en entier, puis testée tâche par tâche avant un commit
> unique. Écart au découpage relevé en cours de route : à l'expiration d'un minuteur, la
> succession du Maire était résolue, mais le moteur passait aussi au jour à la place du
> meneur. C'est corrigé, et `R-14` le précise désormais.

- [x] **T4 — Cœur du moteur : état, événements, `evolve`, salon, configuration, distribution**
  - Fichiers : `packages/engine/src/{state,events,evolve,apply,defaults}.ts`, `roles/{index,werewolf,villager}.ts`, `modes/{index,classic}.ts`, `phases/{lobby,config,deal}.ts`, `test/dsl.ts`
  - Contenu : `GameState` plat et `readonly`, les événements, `apply` = valider puis émettre puis `evolve`, les registres des rôles et des modes (`RoleDefinition`, `GameModeDefinition`), une distribution déterministe par `rng`, et un DSL de test (`game().players().roles()…`)
  - Tests attendus : rejoindre/expulser/réordonner, composition invalide refusée (P9), D-07, distribution identique pour une même graine, rôles refusés hors mode, autorisations (`FORBIDDEN`), et l'état d'entrée jamais modifié

- [x] **T5 — Nuit : plan de nuit, vote des loups, minuteurs, forçage**
  - Fichiers : `src/night/{plan,wolves}.ts`, `src/timers.ts`, `test/night/*.test.ts`
  - Tests attendus : `R-20` (ordre calculé à partir des rôles vivants), `R-34` dans les deux modes (P2), `R-10` et P5, P10 (`Timeout` refusé avant l'échéance), `pilotMode` `assisted` / `manual`

- [x] **T6 — Aube, pipeline des morts, victoire**
  - Fichiers : `src/deaths.ts`, `src/victory.ts`, `src/phases/dawn.ts`, `test/{deaths,victory,dawn}.test.ts`
  - Tests attendus : `R-40` à `R-43`, P3, `R-01`, `R-02` (avec et sans `wolvesWinOnParity`), `R-05`, `R-06` (« Personne ne gagne »), et les conditions de victoire venant du mode

- [x] **T7 — Jour : débat, vote du village, exécution**
  - Fichiers : `src/phases/{debate,vote,execution}.ts`, `src/votes.ts`, `test/vote/*.test.ts`
  - Tests attendus : `R-30` à `R-33` et `R-36`, P1, P8, D-08 (pas de vote contre soi), abstention en option, et non-votants ignorés

- [x] **T8 — Le Maire**
  - Fichiers : `src/phases/mayor-election.ts`, `src/mayor.ts`, `test/mayor/*.test.ts`
  - Tests attendus : `R-50` à `R-52` (`designate` et `reelect`, y compris une mort à l'exécution suivie d'un `tieBreak` → `revote`), P6, P7, double voix (`R-32`). `R-53` reste sans objet tant que l'Idiot n'existe pas (M6) : le point d'accroche est prévu, mais pas de test

- [x] **T9 — Rejeu, instantanés, `Undo`**
  - Fichiers : `src/replay.ts`, `src/undo.ts`, `test/{replay,undo}.test.ts`
  - Tests attendus : `events.reduce(evolve)` redonne l'état, un instantané est pris tous les 50 événements, et P4 (annulation acceptée ou refusée, plusieurs fois de suite)

- [x] **T10 — `projectView` en liste blanche, et non-fuite**
  - Fichiers : `packages/protocol/src/views.ts`, `packages/engine/src/project.ts`, `test/leaks/generic.test.ts`
  - Tests attendus : chaque vue est validée par le schéma `.strict()`. Sur des parties simulées, à chaque événement et pour chaque joueur, aucun rôle d'autrui ne fuit, sauf les loups entre eux, `revealRoleOnDeath` et `deadSeeRoles`. Aucune cible de nuit et aucun bulletin secret ne fuit non plus. `availableActions` est cohérent avec ce que `apply` accepte

- [x] **T11 — Textes i18n du moteur**
  - Fichiers : `packages/i18n/src/{fr,en}.json`, `packages/engine/test/i18n-keys.test.ts`
  - Tests attendus : toutes les `messageKey` du moteur et tous les noms de rôles, de phases et de modes existent en `fr`

- [x] **T12 — Tests de propriétés**
  - Fichiers : `packages/engine/test/properties/random-games.test.ts`
  - Tests attendus : 1 000 parties aléatoires (5 à 24 joueurs, toutes options, actions et forçages au hasard) se terminent. Invariants : aucun mort n'agit ni ne vote, il y a au plus un Maire et il est vivant, le rejeu égale l'état, le décompte des camps est cohérent, et la victoire est conforme à `R-01`/`R-02`

- [x] **T13 — Vérification de la définition de « terminé » et rapport**
  - Fichiers : `docs/progress.md`
  - Tests attendus : `pnpm check` au vert, couverture du moteur ≥ 90 % (lignes et branches)
  - Écart relevé pendant la vérification : la roadmap demande la **retouche de projection** dans l'architecture des modes, et elle manquait. Elle a été ajoutée (`GameModeDefinition.project`), sans mode qui s'en serve avant M7.

### Vérification de la définition de « terminé »

| Point | État | Preuve |
|---|---|---|
| **Couverture du moteur > 90 %** | ✅ | 95,4 % des lignes, 92,1 % des branches, 99,5 % des fonctions. Le seuil est appliqué à chaque `pnpm test` |
| **1 000 parties aléatoires sans violer d'invariant** | ✅ | `test/properties/random-games.test.ts`, de 5 à 24 joueurs, toutes options, environ 14 s. Un bogue volontaire a été injecté et détecté |
| `GameState`, commandes, événements, `apply`, `evolve`, rejeu, `Undo`, `Rng` à graine | ✅ | `src/{state,events,evolve,apply,record}.ts`. Le rejeu est vérifié à chaque partie aléatoire |
| Machine d'états (`docs/01` §2) | ✅ sauf `PRESENTATIONS` | `PRESENTATIONS` appartient au role play (M5) et est refusé par `R-15` |
| Options (schéma Zod) | ✅ | `packages/protocol/src/options.ts` (ADR 0008) |
| Votes `R-30` à `R-35` (et `R-36` à `R-38`) | ✅ | `test/vote.test.ts`, `test/mayor.test.ts` |
| Maire `R-50` à `R-52`, `designate` et `reelect` | ✅ | `test/mayor.test.ts`. `R-53` attend l'Idiot du village (M6) |
| Pipeline des morts `R-40` à `R-43` (et `R-44`) | ✅ | `test/dawn.test.ts`, `test/mayor.test.ts` |
| Victoire `R-01` à `R-06` | ✅ pour `R-01`, `R-02`, `R-05` et `R-06` | `R-03` (amoureux, M3) et `R-04` (rôles solo, M6) se brancheront sur `WinCondition` et sa priorité |
| Rôles `werewolf` et `villager` en plugins, avec registre | ✅ | `src/roles/`. L'étape de nuit des loups appartient au plugin du rôle |
| Registre des modes avec `classic` : étapes de nuit, victoire, retouche de projection | ✅ | `src/modes/` |
| `projectView` en liste blanche et test de non-fuite générique | ✅ | `src/project.ts`, `test/leaks/generic.test.ts`. Deux fuites volontaires ont été détectées |
| DSL de test et tests de propriétés fast-check | ✅ | `test/dsl.ts`, `test/bot.ts`, `test/properties/` |

**Total des tests : 184 dans le moteur (14 fichiers), plus 45 dans le protocole.**

**M1 est terminé.** M0 l'est aussi : production déployée (PR #1) et previews fonctionnelles (PR #4).

**Choix de projection validés le 2026-10-22** (`docs/04` §Projection) : nuit uniforme, aube masquée avant « Lever le jour », causes de mort jamais publiques, et actions possibles jointes aux vues.

---

## M2 — Comptes et temps réel

**But** : de vrais utilisateurs se connectent à une vraie partie (UI minimale).

**Terminé quand** : 6 navigateurs (1 meneur et 5 joueurs) jouent une partie Loups contre
Villageois en production, et le rechargement d'une page en pleine nuit restaure l'état.

### Décisions bloquantes (`docs/12` §7)

| ID | Décision | État |
|---|---|---|
| D-01 | Pilotage `assisted` par défaut | ✅ validé |
| D-04 | Compte invité (pseudo seul) + compte complet, conversion en fin de partie | ✅ validé |
| D-18 | Fournisseur d'e-mails : Resend, inactif tant qu'aucun domaine n'est vérifié (Q1) | ✅ validé le 2026-10-22 |
| D-21 | Données personnelles : pseudo, e-mail, historique, suppression en libre-service, aucun traqueur (Q2) | ✅ validé le 2026-10-22 |

### Questions et précisions de règles (règle 5 de `CLAUDE.md`) — ✅ validées le 2026-10-22

| # | Sujet | Proposition |
|---|---|---|
| Q1 | **E-mail (D-18)**. Constat du 2026-10-22 : l'envoi par Cloudflare (Email Sending) exige la formule Workers payante ; Resend (gratuit : 100/jour, 3 000/mois) et Brevo exigent un **domaine vérifié**, or D-17 reporte le domaine à M8 | **Resend**, consigné dans l'ADR 0009, derrière une interface `EmailSender`. Tant qu'aucun domaine n'est vérifié, la vérification d'e-mail et la réinitialisation par e-mail sont **désactivées par configuration** ; les invités (D-04) couvrent les amis de passage |
| Q2 | **Données personnelles (D-21)** | Validée telle quelle. En M2 : `DELETE /api/me` (Better Auth `deleteUser`), qui supprime le compte et anonymise ses lignes `game_player` (`user_id` → `null`, le pseudo de la partie reste) |
| P13 | **Pause et +30 s** (annoncés pour M2 par P10, absents de `docs/01`) | Commandes meneur `PauseTimer`, `ResumeTimer`, `ExtendTimer`. Pause : l'état range `remaining = deadline − now` et `deadline = null`, donc `Timeout` est refusé. Reprise : `deadline = now + remaining`. +30 s : `deadline += 30 000` (ou `remaining` en pause). Refusées sans minuteur. Elles ne révèlent rien et sont annulables (`R-11`). Ceux qui voyaient le minuteur voient la nouvelle échéance, ou `paused: true`. Nouvelle règle `R-16` |
| P14 | **État de connexion** (`R-61`, US-12) : ce n'est pas un fait de jeu ; un événement le mettrait dans le journal et sous `Undo` | La connexion vit dans le DO, hors moteur. Le meneur reçoit `{ t: 'presence', connected: PlayerId[] }` ; les joueurs ne le reçoivent pas en M2. Ni `GameState` ni `projectView` ne changent |
| P15 | **Ticket WS** : `docs/04` le fait vérifier par le Worker, mais l'usage unique exige un état partagé | Le ticket est **émis et consommé par le DO** de la partie (RPC `issueTicket(userId)`, 30 s, effacé au premier usage). Le Worker vérifie la session à l'émission et transfère l'upgrade ; le DO refuse un ticket inconnu, expiré ou déjà servi. `docs/04` mis à jour |
| P16 | **Meneur et pseudo** | Le meneur est celui qui crée la partie (`game.narrator_id`, et `members` dans le DO). Tout autre utilisateur qui ouvre la WS est `player` s'il a rejoint ; sinon il ne peut envoyer que `JoinGame`. Le pseudo de `JoinGame` est prérempli par le profil et modifiable. Il doit être **unique dans la partie** (US-01), sans tenir compte de la casse ni des espaces : le moteur ne le vérifie pas encore → erreur `NAME_TAKEN` |

**Point à surveiller (coût 0 €)** : la formule gratuite des Workers accorde 10 ms de CPU par
requête, et le hachage scrypt de Better Auth la dépasse probablement à l'inscription et à la
connexion. T5 mesure ; si ça coince, on passe à PBKDF2 de WebCrypto (natif) ; si ça ne suffit
pas, la décision te remonte (formule payante à 5 $ par mois).

**Hors M2** (reporté pour tenir la règle des PR de 400 lignes) : QR du code (M4, avec le
design system), avatar et galerie (M4, assets), glisser-déposer des places (M4 ; en M2 :
boutons monter/descendre), connexion Google (variable d'environnement prévue, non testée),
plugin bearer pour Tauri (M8), affichage de l'historique (M5 ; en M2 on **écrit** le résumé
dans D1 sans l'afficher).

### Tâches

Quatre PR : **A** (T1–T3, règles et protocole), **B** (T4–T6, base et comptes),
**C** (T7–T9, `GameRoom`), **D** (T10–T12, client et e2e), puis T13.

- [x] **T1 — Docs, règles et ADR** *(PR A)*
  - Fichiers : `docs/01-regles-du-jeu.md` (`R-16` pour P13, `R-63` pour P16), `docs/04-architecture.md` (P14, P15, colonne `grp` de la table `events`, alarme multiplexée), `docs/12-deroulement-partie.md` (D-18 et D-21 → ✅), `docs/adr/0009-email-et-comptes-invites.md` (Resend inactif sans domaine, plugin `anonymous` de Better Auth pour D-04). Les versions des nouvelles dépendances entrent dans `docs/05` avec la tâche qui les ajoute
  - Tests attendus : aucun (document)

- [x] **T2 — Moteur : Pause, reprise, +30 s, unicité du pseudo** *(PR A)*
  - Fichiers : `packages/protocol/src/{commands,views}.ts`, `packages/engine/src/{state,events,evolve,apply,actions,project,timers}.ts`, `phases/lobby.ts`, `test/{timers,lobby}.test.ts`, `test/bot.ts`, i18n
  - Tests attendus : P13 (pause → `Timeout` refusé ; reprise → échéance décalée de la durée de pause ; +30 s en marche et en pause ; refus sans minuteur ; annulable) ; la vue d'un joueur qui ne voit pas le minuteur reste identique pendant la nuit (non-fuite) ; P16 (`Alice` puis ` alice ` → `NAME_TAKEN`) ; les 1 000 parties aléatoires tirent aussi ces commandes ; couverture ≥ 90 %

- [x] **T3 — Protocole WS et REST** *(PR A)*
  - Fichiers : `packages/protocol/src/{ws,rest,errors,game-code}.ts`, `test/{ws,rest,game-code}.test.ts`, `version.ts` (passe à 2)
  - Contenu : `ClientMessage` (`cmd`, `ping` ; `chat` arrive en M5) et `ServerMessage` (`state`, `ack`, `error`, `presence`, `pong`), chacun avec `v` ; `ErrorCode` (`PROTOCOL_OUTDATED`, `RATE_LIMITED`, `INVALID_MESSAGE` et les codes du moteur) ; DTO REST (`CreateGame`, `JoinByCode`, `Ticket`, `Me`) ; code de partie à 6 caractères sans `0/O/1/I`
  - Tests attendus : chaque message valide passe ; une clé inconnue et un `v` absent sont refusés ; le code refuse les caractères ambigus

- [x] **T4 — D1, Drizzle et migrations** *(PR B)* — bases `rougarou-db` et `rougarou-db-preview` créées le 2026-10-22 (région `weur`)
  - Fichiers : `apps/server/src/db/schema.ts`, `apps/server/drizzle.config.ts`, `apps/server/migrations/0000_*.sql` (générée), `wrangler.jsonc` (D1 par environnement), `vitest.config.ts`, `pnpm-workspace.yaml` (`drizzle-orm` 0.45.4, `drizzle-kit` 0.31.11)
  - Contenu : tables de Better Auth, `profile`, `game`, `game_player`, `preset` (`docs/04`), index unique partiel `game(code) where status != 'ended'`
  - Tests attendus : les migrations s'appliquent sur la D1 de test ; deux parties actives ne partagent pas un code ; une partie terminée libère le sien

- [x] **T5 — Better Auth : e-mail + mot de passe, invités, profil, suppression** *(PR B)*
  - Mesure du 2026-10-22 : le scrypt natif de Better Auth coûte environ 108 ms de CPU par hachage (PBKDF2 à 100 000 itérations : 28 ms). **Décision** : on garde scrypt, et on vérifie l'inscription sur la preview ; si elle échoue en 1102, on passe à Workers Paid (ADR 0009). **Vérifié le 2026-10-22 sur la preview de la PR #6** : trois inscriptions et une connexion répondent 200, sans erreur 1102 (comptes de test supprimés ensuite). L'échantillon est petit : à surveiller dans le tableau de bord (« Exceeded CPU Time Limits »).
  - Écart : la conversion d'un invité crée un **nouvel** identifiant (comportement du plugin `anonymous`) ; `onLinkAccount` transfère les lignes D1. L'ADR 0009 est corrigé. Les gabarits d'e-mail attendent le domaine (seuls l'interface et le client Resend sont livrés).
  - Secrets `BETTER_AUTH_SECRET` posés sur la preview et la production ; `apps/server/.dev.vars.example` pour le local
  - Fichiers : `apps/server/src/auth.ts`, `src/email.ts` (`EmailSender`), `src/routes/me.ts`, `test/{auth,me}.test.ts`, `pnpm-workspace.yaml` (`better-auth` 1.7.12)
  - Contenu : handler `/api/auth/*`, mot de passe de 12 caractères minimum (US-01), plugin `anonymous` avec conversion vers un compte (D-04), cookie `HttpOnly; Secure; SameSite=Lax`, `GET`/`PATCH /api/me` (pseudo), `DELETE /api/me` (Q2), secret `BETTER_AUTH_SECRET`
  - Tests attendus : inscription, connexion, refus sous 12 caractères, session invité, conversion invité → compte avec le même identifiant, `PATCH /api/me` validé par Zod, suppression qui anonymise `game_player`, **mesure du CPU** du hachage

- [x] **T6 — REST des parties** *(PR B)*
  - Fichiers : `apps/server/src/routes/games.ts`, `src/ulid.ts`, `test/games.test.ts`
  - Contenu : `POST /api/games` (ULID, code unique avec nouvelle tentative sur collision), `POST /api/games/join` (code actif → `gameId`)
  - Écart au plan : le ticket (`POST /api/games/:id/ticket`) passe en T8, puisque c'est le DO qui l'émet (P15) ; le DO est donc initialisé au premier ticket, et non à la création. « Rejoindre après la distribution » n'est pas refusé par la route, qui doit laisser revenir un membre après un rechargement : c'est le moteur qui refuse un nouveau venu (`WRONG_PHASE`)
  - Tests : sans session → 401 ; code inconnu ou partie terminée → 404 ; partie en cours trouvable ; corps invalide → 400 ; ULID triable ; alphabet du code

- [x] **T7 — `GameRoom` : journal SQLite, commandes, diffusion** *(PR C)*
  - Fichiers : `apps/server/src/room/{game-room,storage,broadcast}.ts`, `wrangler.jsonc` (classe et migration du DO), `test/room.test.ts`
  - Contenu : tables `events(seq, grp, type, payload, at)`, `snapshot`, `members` ; chargement = dernier instantané + rejeu ; `applyToRecord` avec `now` et une graine tirée de `crypto` ; `Undo` retire les lignes du dernier groupe ; `projectView` pour chaque socket après chaque commande ; l'erreur ne part qu'à l'émetteur ; logs JSON `{ gameId, seq, cmd }` sans donnée personnelle
  - Tests attendus : une commande refusée ne touche pas le journal ; une nouvelle instance du DO retrouve l'état exact ; `Undo` survit au rechargement ; chaque socket reçoit **sa** vue validée par le schéma strict, et un joueur ne reçoit jamais la vue du meneur

- [x] **T8 — WebSocket : tickets, hibernation, autorisations, débit** *(PR C)*
  - Fichiers : `apps/server/src/room/{tickets,sockets,rate-limit}.ts`, `src/routes/ws.ts`, `test/ws.test.ts`
  - Contenu : P15 ; API Hibernation (`acceptWebSocket`, pièce jointe `{ userId, kind }`) ; `PROTOCOL_OUTDATED` ; 10 commandes par seconde et par socket ; `presence` au meneur (P14) ; état complet à chaque (re)connexion
  - Tests attendus : ticket réutilisé, expiré ou d'une autre partie → refus ; message invalide → `error` sans effet ; 11ᵉ commande dans la seconde → `RATE_LIMITED` ; commande de meneur envoyée par un joueur → `FORBIDDEN` ; une reconnexion reçoit la vue courante ; `presence` ne part qu'au meneur

- [x] **T9 — Minuteurs par alarme, fin de partie, purge** *(PR C)*
  - Fichiers : `apps/server/src/room/{alarms,summary}.ts`, `test/alarms.test.ts`
  - Contenu : une seule alarme pour l'échéance du moteur et la purge à J+7 ; à l'expiration, `Timeout` avec l'acteur `system` ; à `ENDED`, résumé dans D1 (`game.status`, `winner`, `game_player`) ; à J+7, `deleteAll()` ; pause et +30 s replanifient l'alarme
  - Tests attendus : l'alarme applique `Timeout` à l'échéance et rien avant ; pause → alarme retirée ; fin de partie → lignes D1 écrites une seule fois ; purge → stockage vide

> **T7 à T9 forment un seul commit**, comme T4–T8 en M1 : la salle, ses sockets et son alarme
> partagent le même objet, et chacun ne se teste qu'à travers une vraie WebSocket. Écarts relevés :
> la limite de débit compte aussi `JoinGame` (normal, mais le test attend la fin de la fenêtre) ;
> `webSocketClose` ne peut pas renvoyer les codes réservés (1005, 1006) ; un DO purgé gardait des
> sockets qui relisaient un journal effacé, et un ticket l'aurait fait renaître vide. Les deux sont
> corrigés et testés. La PR C dépasse 400 lignes, surtout en tests : la découper aurait livré un
> Durable Object qu'on ne peut pas tester.

- [x] **T10 — Client : store Zustand, socket, indicateur de connexion** *(PR D)*
  - Fichiers : `apps/web/src/game/{socket,store,useGameView,useSendCommand}.ts`, `src/components/ConnectionIndicator.tsx`, `test/socket.test.ts`, `pnpm-workspace.yaml` (`zustand` 5.0.16, `@tanstack/react-query` 5.104.5)
  - Contenu : chaque `ServerMessage` validé par Zod ; la dernière vue fait foi ; reconnexion à délai croissant (US-90) ; un trou de `seq` déclenche une resynchronisation ; `ack` et `error` corrélés par `id`
  - Tests attendus : message invalide ignoré ; reconnexion après coupure avec des délais croissants ; l'indicateur s'annonce par `aria-live`

- [x] **T11 — Écrans bruts : auth, accueil, salon, configuration, distribution, débogage** *(PR D)*
  - Fichiers : `apps/web/src/routes/{Home,Join,Game}.tsx`, `src/components/{AuthGate,Field}.tsx`, `src/game/{ActionPanel,Lobby,Config,RoleCard}.tsx`, `src/{api,session,form}.ts`, i18n ; côté serveur `GET /api/games/:id` ; côté `ui`, `Button` accepte `type="submit"`
  - Écarts au plan : (1) pas de routes `/auth/login` et `/auth/signup` séparées : une porte `AuthGate` affiche connexion, inscription et invité **à la place** de la page demandée, ce qui ramène directement au salon après connexion (US-11) sans paramètre de redirection ; (2) `GET /api/games/:id` ajouté, car le code de la partie vit dans D1 et pas dans la vue projetée ; (3) le détecteur de texte en dur prenait les génériques TypeScript pour du JSX : son motif est affiné et testé dans les deux sens
  - Tests : accueil sans session et connecté, axe sur chaque écran, un contrôle par action reçue et aucun sans action, salon (connexion, déplacement, expulsion), carte maintenue pour révéler, à la souris et au clavier

- [x] **T12 — E2E : 1 meneur + 5 joueurs, reconnexion de nuit** *(PR D)*
  - Fichiers : `e2e/fixtures/table.ts`, `e2e/m2-full-game.spec.ts`, `e2e/m2-reconnect.spec.ts`, `e2e/smoke.spec.ts` (l'accueil sans session montre maintenant la connexion), `playwright.config.ts` (`E2E_BASE_URL` pour viser un déploiement ; en local, migrations D1 puis `wrangler dev` avec un secret propre aux tests)
  - Résultat en local (2026-10-22) : la partie à six navigateurs va jusqu'à la victoire du village en 9 s, chaque vue de joueur est contrôlée contre la fuite de rôle à chaque tour, et chaque joueur (puis le meneur) recharge en pleine nuit et retrouve exactement sa vue. 19 tests e2e passent ; les deux scénarios à six navigateurs ne tournent que sur Chromium
  - Bogue trouvé : la session invité et la déconnexion partaient sans corps JSON, et Better Auth répond alors 415. Corrigé dans `apps/web/src/api.ts`

- [x] **T13 — Déploiement, vérification et rapport**
  - Fait le 2026-10-22 : bases D1 créées, `BETTER_AUTH_SECRET` posé sur la preview et la production, `deploy.yml` applique la migration du Durable Object avant un téléversement de preview (`versions upload` ne le sait pas, `docs/08` mis à jour)
  - PR #5 à #8 mergées en squash dans `main`, l'une après l'autre (chaque branche rebasée sur `main`)
  - **Production** (`rougarou.neyteck-pro.workers.dev`, commit `8aed39b`) : les 11 tests e2e Chromium passent, dont la partie à six navigateurs jusqu'à la victoire (37 s) et la reconnexion en pleine nuit (39 s)

### Vérification de la définition de « terminé »

| Point | État | Preuve |
|---|---|---|
| **6 navigateurs (1 meneur, 5 joueurs) jouent une partie Loups contre Villageois en production** | ✅ | `E2E_BASE_URL=https://rougarou.neyteck-pro.workers.dev`, `e2e/m2-full-game.spec.ts` : six contextes de navigateur, de la création par le meneur à la victoire du village, avec un contrôle de non-fuite de rôle à chaque tour |
| **Recharger une page en pleine nuit restaure l'état** | ✅ | `e2e/m2-reconnect.spec.ts` en production : chaque joueur, puis le meneur, recharge et retrouve exactement sa vue |
| D1 + Drizzle + migrations, Better Auth, profil | ✅ | `apps/server/src/db/`, `migrations/0000_init.sql`, e-mail + mot de passe et invités (D-04), `GET`/`PATCH`/`DELETE /api/me` (D-21). Google : prévu, non branché |
| REST : créer, rejoindre par code, ticket WS | ✅ | `POST /api/games`, `POST /api/games/join`, `GET /api/games/:id`, `POST /api/games/:id/ticket` |
| `GameRoom` : hibernation, journal SQLite, vues projetées, alarmes, reconnexion | ✅ | `apps/server/src/room/`, 55 tests serveur dans le runtime Workers |
| Client : store Zustand, indicateur de connexion | ✅ | `apps/web/src/game/`, reconnexion à délai croissant |
| Écrans bruts : salon, distribution, vue de débogage | ✅ | `apps/web/src/routes/Game.tsx` et `src/game/` |

**Total des tests : 202 dans le moteur, 82 dans le protocole, 55 dans le serveur, 43 dans le web, 50 dans `ui`, plus 19 e2e (11 sur Chromium contre la production).**

**M2 est terminé.**

**Points ouverts** : (1) les e-mails attendent un domaine (D-17, ADR 0009) ; (2) le coût CPU de scrypt est à surveiller dans le tableau de bord Cloudflare (aucune erreur 1102 constatée) ; (3) GitHub a deux fois signalé un run de CI terminé alors que son job e2e tournait encore, et une fois renvoyé une erreur interne à release-please : il faut vérifier les jobs eux-mêmes avant de merger.

---

## M3 — Rôles classiques

**But** : la Voyante, la Sorcière, le Chasseur, Cupidon (et les amoureux) et la Petite fille
rejoignent les loups et les villageois.

**Terminé quand** : chaque rôle a ses tests, son test de non-fuite et ses textes i18n, et une
partie e2e à 8 joueurs utilise tous les rôles classiques.

### Décisions bloquantes (`docs/12` §7)

| ID | Décision | État |
|---|---|---|
| D-11 | Petite fille : **modifiée** le 2026-10-22. Elle voit des pseudos de loups partiellement dévoilés ; quand elle se fait repérer, les loups reçoivent une courte liste de suspects qui la contient ; risque croissant à chaque espionnage (P21) | ✅ validé le 2026-10-22 |

### Précisions de règles (règle 5 de `CLAUDE.md`)

P17 à P25 sont ✅ validées le 2026-10-22. P21 a été **revue** à la demande de
l'utilisateur (pseudos partiels, liste de 3 suspects, risque croissant) avant d'être validée.

| # | Sujet | Proposition |
|---|---|---|
| P17 | **Où vit une information privée** : `docs/04` prévoit un message WS `private`, mais il serait perdu au rechargement et échapperait au test de non-fuite | Les infos privées vivent dans `GameState` (`knowledge` par joueur) et sortent par la vue projetée : `me.knowledge[]` (« Mes infos »). Le message `private` est retiré de `docs/04`. ADR 0010 |
| P18 | **Voyante** | Une cible vivante autre qu'elle, une fois par nuit. Le résultat (rôle, ou camp avec `seerMode: 'team'`) entre aussitôt dans ses infos (immédiat, `R-21`) et l'étape se résout. Minuteur ou forçage : pas de sondage |
| P19 | **Sorcière** | Une seule soumission par nuit `{ save, kill }` (« ne rien faire » = `false` / `null`), pour qu'aucun aller-retour ne trahisse un choix. Elle voit la victime des loups (ou « personne »). Vie : seulement s'il y a une victime et que la potion reste ; sur elle-même selon `witchSelfSave`. Mort : un vivant autre qu'elle. Elle se réveille même sans potion, sinon le meneur trahirait leur usage. Minuteur ou forçage : rien. Ordre `R-40` : victime des loups sauf potion de vie, puis cible de la potion de mort (cause `witch`, connue du seul meneur) |
| P20 | **Chasseur** | À sa mort (toute cause), un effet `hunterShot` entre dans la file, après le chagrin et avant la succession du Maire (`R-42`). Cible : un vivant. Minuteur `hunterShot` ou forçage : pas de tir (`R-13`). Comme l'attente est publique, **son rôle est révélé dès que le tir est attendu**, même avec `revealRoleOnDeath: false`. Sa victime meurt avec la cause `hunter` et déclenche à son tour ses effets |
| P21 | **Petite fille (D-11), version revue** | **Choix de prendre le risque** : pendant l'étape des loups, elle a l'action « Espionner », et par défaut elle n'espionne pas. Elle n'est pas un acteur de l'étape et ne bloque jamais les loups. **Ce qu'elle voit** : dès qu'elle espionne, elle voit en direct les votes de la meute (les cibles sont nommées). Chaque loup y apparaît sous un **pseudo partiellement dévoilé** : une case par caractère (donc la longueur se voit), les espaces restent visibles, et **un tiers des lettres** (arrondi à l'inférieur, au moins une à partir de 3 lettres) apparaissent, à des positions tirées au hasard. Exemple : `A _ _ x _ _ e` pour « Alexane ». Le tirage est refait **chaque nuit** et pour chaque loup, et les loups sont listés dans un ordre tiré au hasard : en espionnant plusieurs nuits, elle recoupe ses indices. Les tirages sont inscrits dans l'événement, pour le rejeu. Le pseudo complet et l'identifiant d'un loup ne partent jamais vers elle. Un pseudo de 1 ou 2 lettres ne montre que sa longueur. **Le risque grandit à chaque prise de risque** : la n-ième nuit où elle espionne, elle est repérée avec la probabilité `min(base + (n − 1) × hausse, 75 %)`. Deux options : `littleGirlRisk.base` (0 à 50 %, défaut **10 %**) et `littleGirlRisk.increase` (0 à 25 points, défaut **10**). Avec les défauts : 10 %, 20 %, 30 %… jusqu'à 75 %. Seules les nuits où elle espionne comptent. Le compteur ne retombe pas après qu'elle a été repérée. Un tirage par nuit espionnée, inscrit dans l'événement. **Ce que reçoivent les loups** : pas de pseudo partiel, qu'ils pourraient trop facilement recouper à plusieurs. Ils reçoivent une **liste de 3 suspects** : la Petite fille et 2 autres non-loups vivants tirés au hasard (moins s'il n'y en a pas assez), affichés dans l'ordre des places. L'indice, « La Petite fille vous observe : c'est l'une de ces personnes », reste ensuite dans leurs infos. Si elle est repérée de nouveau, les loups reçoivent une **nouvelle** liste, tirée à part : en croisant les listes, ils resserrent l'étau. Il marche autant en présentiel qu'à distance. Le chat des loups, et sa version masquée pour elle, arrivent en M5 |
| P22 | **Cupidon et amoureux** | Nuit 1, ordre 10 : Cupidon désigne 2 vivants distincts (lui compris). Minuteur ou forçage : pas d'amoureux. Ordre 12 : étape « Amoureux », où chacun découvre l'autre (pseudo et rôle, dans ses infos et dans la liste des joueurs) et confirme ; minuteur ou forçage : confirmé. Le chagrin (`R-41`) est immédiat, cause `grief` |
| P23 | **Amoureux mixtes (`R-03`)** | Un couple loup + non-loup ajoute le vainqueur `lovers` (nouvelle valeur de `Winner`, pas un `TeamId`) : il gagne quand les deux amoureux sont les deux seuls vivants. Priorité `R-06` : au-dessus des loups et du village. Chacun garde son camp pour le reste (le loup amoureux vote toujours avec la meute) |
| P24 | **Morts en chaîne (`R-42`)** | Pour une même vague de morts : on tue d'abord tous les chagrins (récursivement), puis on met en file les tirs de Chasseur, puis les successions du Maire. Une mort causée par un effet de la file ajoute ses effets à la fin de la file |
| P25 | **Cas limites 2 et 9** : M3 doit les tester, mais ils reposent sur le Salvateur et l'Infect père des loups (M6) | En M3 : la potion de vie est consommée dès qu'elle est bue, et la Voyante lit le camp **effectif** (`teamOf`), point d'accroche de l'infection. Les tests des cas 2 et 9 tels qu'écrits passent en **M6**, avec leurs rôles. `docs/10` est mis à jour |

**Hors M3** : chat des loups et de la Petite fille (M5), sprites pixel art dans l'UI (M4 ;
en M3, cartes SVG de repli), écrans soignés (M4 ; en M3, contrôles bruts comme en M2).

### Tâches

Trois PR : **A** (T1–T2, règles et points d'accroche), **B** (T3–T7, les rôles),
**C** (T8–T10, client, cartes, e2e), puis T11.

- [x] **T1 — Docs, règles, ADR 0010** *(PR A)*
  - Fichiers : `docs/01-regles-du-jeu.md` (`R-03` et `R-42` précisés par P23 et P24, `R-45` révélation du Chasseur, option `littleGirlRisk` au §8 : `{ base: 10, increase: 10 }`, plafond 75 %), `docs/02-roles.md` (fiches précisées par P18 à P22 ; la fiche de la Petite fille est réécrite selon P21 revue), `docs/04-architecture.md` (P17, points d'accroche des rôles), `docs/10-roadmap.md` (P25), `docs/12-deroulement-partie.md` (D-11 réécrite, puis → ✅ ; la ligne #7 du §2 est mise à jour), `docs/07-assets.md` (la police d'affichage est Cormorant Garamond dans `tokens.css`, pas Cinzel), `docs/adr/0010-infos-privees-dans-la-vue.md`
  - Tests attendus : aucun (document)

- [x] **T2 — Points d'accroche génériques du moteur** *(PR A)*
  - Fichiers : `packages/engine/src/{state,events,evolve,deaths,project,actions,victory}.ts`, `roles/types.ts` (`nightSteps[]`, `onDeath`), `night/{types,flow}.ts` (`observers` d'une étape, morts de l'aube déclarées par chaque étape), `packages/protocol/src/{commands,views,options}.ts` (`me.knowledge`, genres d'effets en attente, causes de mort, `littleGirlRisk`), `test/deaths.test.ts`
  - Contenu : aucun changement de comportement pour les loups et les villageois ; la file d'effets accepte plusieurs genres d'effets (P24)
  - Tests attendus : les 202 tests existants passent ; ordre de la file `R-42` ; couverture ≥ 90 %

- [x] **T3 — Voyante** *(PR B)*
  - Fichiers : `src/roles/seer.ts`, `test/roles/seer.test.ts`, `test/leaks/seer.test.ts`, i18n (`roles.seer.{name,short,rules,narrator.wake,narrator.sleep}`), `packages/ui/icons/icon-role-seer.svg`, `apps/web/public/assets/CREDITS.md`
  - Tests attendus : P18 (cible valide, soi-même et mort refusés, une seule fois, `seerMode` rôle et camp, minuteur → rien, camp effectif via `teamOf`) ; non-fuite : le résultat n'est visible que d'elle et du meneur, et la vue des autres reste identique toute la nuit

- [x] **T4 — Sorcière** *(PR B)*
  - Fichiers : `src/roles/witch.ts`, `test/roles/witch.test.ts`, `test/leaks/witch.test.ts`, i18n, icône, crédits
  - Tests attendus : P19 (vie sans victime refusée, potion épuisée refusée, deux potions la même nuit, `witchSelfSave` × 3, potion de vie consommée, potion de mort tue à l'aube, réveil sans potion) ; non-fuite : la victime n'est vue que d'elle (et des loups), la cause `witch` jamais par un joueur

- [x] **T5 — Chasseur** *(PR B)*
  - Fichiers : `src/roles/hunter.ts`, `test/roles/hunter.test.ts`, `test/leaks/hunter.test.ts`, i18n, icône, crédits
  - Tests attendus : P20 (tir à l'aube après une mort de nuit, tir après exécution, minuteur et forçage → pas de tir, Chasseur Maire : tir puis succession, tir sur le dernier loup → victoire du village, révélation avec `revealRoleOnDeath: false`)

- [x] **T6 — Cupidon, amoureux, `R-03`** *(PR B)*
  - Fichiers : `src/roles/cupid.ts`, `src/lovers.ts`, `src/modes/classic.ts` (condition `lovers`), `test/roles/cupid.test.ts`, `test/leaks/lovers.test.ts`, i18n, icône, crédits
  - Tests attendus : P22, P23, P24, **cas limite 1** (couple loup + villageois, victoire `lovers` à deux survivants, priorité `R-06`), **cas limite 3** (le Chasseur meurt de chagrin et tire), chagrin en chaîne avec la succession du Maire ; non-fuite : seuls les amoureux (et le meneur) connaissent le couple, et Cupidon ne voit pas leurs rôles

- [x] **T7 — Petite fille** *(PR B)*
  - Fichiers : `src/roles/little-girl.ts`, `test/roles/little-girl.test.ts`, `test/leaks/little-girl.test.ts`, i18n, icône, crédits ; `test/bot.ts` et `test/properties/random-games.test.ts` (les bots jouent tous les rôles classiques)
  - Tests attendus : P21. Sans espionnage, elle ne voit rien. Masque des pseudos : longueur conservée, espaces visibles, ⌊lettres / 3⌋ lettres dévoilées (au moins 1 à partir de 3 lettres, aucune en dessous). Positions et ordre des loups retirés d'une nuit à l'autre, mais identiques au rejeu. Risque : avec base et hausse à 0, jamais repérée ; avec les défauts, 10 %, 20 %, 30 % sur les nuits espionnées successives, les nuits sans espionnage ne comptent pas, et le plafond est de 75 % ; avec des graines connues, repérée puis non repérée. Liste des suspects : 3 noms, elle comprise, aucun loup, moins s'il manque des non-loups vivants ; elle reste dans les infos des loups les nuits suivantes ; une deuxième détection ajoute une nouvelle liste, tirée à part. Elle ne bloque jamais l'étape. Non-fuite : jamais un identifiant de loup ni un pseudo complet dans sa vue (sauf si le rôle est déjà révélé), et seuls les loups voient la liste des suspects. 1 000 parties aléatoires avec tous les rôles classiques sans violer d'invariant. Couverture ≥ 90 %

- [x] **T8 — Cartes de rôle en SVG de repli** *(PR C)*
  - Fichiers : `packages/ui/src/{RoleCardArt,RoleIcon}.tsx`, `packages/ui/icons/*.svg` (les 7 rôles de M3, dessins originaux), `RoleCardArt.stories.tsx`, `test/role-card-art.test.tsx`
  - Contenu : carte 3:4, fond texturé en SVG, accent du camp (tokens), icône centrée, nom du rôle en police d'affichage, dans les deux thèmes ; texte alternatif traduit
  - Tests attendus : une carte par rôle de M3, nom lu par les lecteurs d'écran, axe sans violation

- [x] **T9 — Client : actions et « Mes infos »** *(PR C)*
  - Fichiers : `apps/web/src/game/{ActionPanel,RoleCard,MyInfo,NightPanel}.tsx`, i18n, `test/*.test.tsx`
  - Contenu : contrôles bruts pour sonder, les potions, désigner deux amoureux, confirmer, espionner, tirer ; « Mes infos » ; la carte de rôle utilise `RoleCardArt`
  - Tests attendus : un contrôle par action reçue, aucun sans action, « Mes infos » annoncé par `aria-live`, axe sur chaque écran

- [x] **T10 — E2E à 8 joueurs avec tous les rôles classiques** *(PR C)*
  - Fichiers : `e2e/fixtures/table.ts` (N joueurs, composition imposée), `e2e/m3-classic-roles.spec.ts`
  - Tests attendus : 1 meneur + 8 joueurs (2 loups, Voyante, Sorcière, Chasseur, Cupidon, Petite fille, Villageois) ; chaque rôle agit au moins une fois ; contrôle de non-fuite de rôle à chaque tour ; la partie va jusqu'à une victoire

- [x] **T11 — Déploiement, vérification et rapport**
  - Fichiers : `docs/progress.md`, `e2e/fixtures/table.ts`, `e2e/m2-reconnect.spec.ts`
  - Tests attendus : `pnpm check` au vert, e2e M3 contre la production, définition de « terminé » vérifiée point par point
  - Fait le 2026-10-23 : PR #11 à #13 mergées en squash dans `main`, l'une après l'autre (#12 rebasée sur `main`, `main` fusionnée dans #13, arbres vérifiés identiques aux branches relues). Production déployée au commit `04ce19c`
  - **Écart** : contre la production, la suite e2e Chromium échouait environ une fois sur deux, sur trois specs (M2 comprises). Aucune erreur serveur : le pilote de table relisait des vues périmées (double clic du meneur, attente d'un bouton retiré par la fin de partie, forçage avant que la vue d'un joueur n'arrive, ce qui laissait les amoureux non confirmés) et attendait 5 s une reconnexion qui en prend parfois plus. Corrigé dans la PR #15 ; ensuite, 6 passages de suite sans échec

### Vérification de la définition de « terminé » (2026-10-23)

| Point | État | Preuve |
|---|---|---|
| Chaque rôle a ses tests | ✅ | `test/roles/{seer,witch,hunter,cupid,little-girl}.test.ts` ; file d'effets dans `test/deaths.test.ts` |
| Chaque rôle a son test de non-fuite | ✅ | `test/leaks/{seer,witch,hunter,lovers,little-girl}.test.ts` ; le test générique joue tous les rôles classiques, avec un oracle de nuit uniforme par étape |
| Chaque rôle a ses textes i18n | ✅ | `roles.<id>.{name,description,short,rules}` et `narrator.*` en fr et en en, vérifiés par `test/i18n-keys.test.ts` |
| **Partie e2e à 8 joueurs avec tous les rôles classiques** | ✅ | `e2e/m3-classic-roles.spec.ts` **en production** (`E2E_BASE_URL=https://rougarou.neyteck-pro.workers.dev`) : 1 meneur + 8 joueurs dans neuf navigateurs, chaque rôle agit au moins une fois, non-fuite contrôlée à chaque tour, victoire du village. Les 12 tests Chromium passent 6 fois de suite (28 s à 1 min) |
| Ordre de nuit calculé, actions immédiates, informations privées | ✅ | étapes déclarées par rôle (T2), Voyante immédiate (`R-21`), `me.knowledge` (ADR 0010) |
| Cas limites 1, 2, 3, 9 | ✅ 1 et 3 | `test/roles/cupid.test.ts` ; 2 et 9 reportés en M6 avec leurs rôles (P25, `docs/10` mis à jour) |
| Cartes de rôle en SVG de repli | ✅ | `packages/ui/src/{RoleCardArt,RoleIcon}.tsx`, 7 icônes originales, crédits |
| 1 000 parties aléatoires avec tous les rôles | ✅ | `test/properties/random-games.test.ts`, chaque rôle y agit au moins une fois |
| Couverture du moteur ≥ 90 % | ✅ | lignes 96,6 %, branches 92,9 % (mesure du 2026-10-22, code inchangé depuis) |
| `pnpm check` | ✅ | 301 tests dans le moteur, 100 dans le protocole, 56 dans le serveur, 63 dans le web, 68 dans `ui`, 11 dans `config`, 6 dans `i18n` |

Précisions prises en codant, **validées le 2026-10-23** (cohérentes avec P17 à P25) :
- `R-46` : à la fin d'un minuteur, seul l'effet en tête de file prend sa valeur par défaut, puis le suivant lance son propre minuteur ; un forçage résout toute la file.
- Un tir de Chasseur sans aucun vivant à viser est sauté.
- La Petite fille compte comme « lettres » tous les caractères hors espaces (un trait d'union compte). L'exemple de P21 (« A _ _ x _ _ e », 3 lettres sur 7) contredisait la règle ⌊7 / 3⌋ = 2 : l'exemple de `docs/02` montre 2 lettres.
- Quand Cupidon se choisit lui-même, il reçoit aussi l'info `lover` de son partenaire.

**M3 est terminé.**

**Points ouverts** : (1) en production, une reconnexion prend 0,9 à 2 s, avec de rares pics à 7,6 s qui correspondent à des premiers essais ratés puis repris (0,5 + 1 + 2 + 4 s) : la cause de ces échecs reste à examiner (US-90 tient, la vue revient) ; (2) les points ouverts de M2 tiennent toujours (e-mails sans domaine, CPU de scrypt).

---

## M4 — Interface complète (présentiel jouable)

**But** : remplacer les écrans bruts par l'interface « Lanterne » (`docs/06`), côté joueur et
côté meneur, pour jouer en présentiel sans papier.

**Terminé quand** : une vraie partie en présentiel à 8 ou plus est jouée sans papier, le score
Lighthouse (PWA, accessibilité) est d'au moins 90 et axe ne signale aucune violation sérieuse.

### Décisions bloquantes (`docs/12` §7)

| ID | Décision | État |
|---|---|---|
| D-03 | Sons et vibrations : aucun ne trahit le jeu | ✅ |
| D-23 | Distribution `simultaneous` par défaut, `ceremony` en option | ✅ |
| D-24 | Direction Lanterne + pixel art | ✅ |
| D-22 | Synthèse vocale du texte à lire : **refusée pour la V1** (le meneur lit lui-même) | ✅ décidé le 2026-10-23 |

### Précisions de règles (règle 5 de `CLAUDE.md`) — ✅ validées le 2026-10-23

P28, P30, P31 et P32 ont été validées explicitement ; P26, P27 et P29 ont été présentées
sans objection.

| # | Sujet | Proposition |
|---|---|---|
| P26 | **Distribution `ceremony`** (`docs/12` §3, refusée par `R-15` jusqu'ici) | Un joueur à la fois, dans l'ordre des places. Celui dont c'est le tour voit sa carte et confirme « J'ai vu mon rôle » ; les autres voient « X découvre son rôle… », sans rien de plus. Le tour passe à la confirmation, sur « Suivant » du meneur, ou au bout de 8 s (minuteur `timers.ceremonyCard`, défaut 8, `null` possible). Le meneur lance la nuit après le dernier joueur. Une carte revue plus tard (« Ma carte ») ne rejoue rien |
| P27 | **Journal du meneur et chronologie de fin** (US-41, US-60, US-80) | Chaque fait journalisé (actions de nuit, votes, morts et causes, forçages, minuteurs expirés, corrections) entre dans `state.journal` avec l'heure de la commande (`now` injecté) et une clé i18n à paramètres. Le meneur le voit en direct ; les joueurs le reçoivent **seulement à `ENDED`**, comme chronologie nuit par nuit (`docs/01` §2). Test de non-fuite : aucune entrée dans une vue de joueur avant la fin |
| P28 | **Mode correction** (US-80) | Trois commandes du meneur, entre la distribution et la fin : `CorrectKill` (mort de cause `correction`, avec la chaîne normale des effets à la mort et la vérification de victoire), `CorrectRevive` (le joueur revient vivant, sans rien rejouer : un amoureux ressuscité ne ressuscite pas l'autre), `CorrectRole` (nouveau rôle, pouvoirs remis à neuf, info privée « Ton rôle a changé »). Chacune est annulable (`R-11`), marquée d'un badge dans le journal, et sa cause n'est jamais montrée aux joueurs (morts sans cause, `docs/04`) |
| P29 | **Composition suggérée et indicateur d'équilibre** (US-20) | La table de `docs/02` §Compositions, limitée aux rôles disponibles (M3 : `core`). Équilibre = somme de poids par rôle (Villageois +1, Loup −6, Voyante +7, Sorcière +4, Chasseur +3, Cupidon −2, Petite fille +3), affiché « Avantage village / Équilibré (−3 à +3) / Avantage loups », jamais par la couleur seule. Ce sont des **données de configuration**, pas un résultat de jeu : elles vivent dans `packages/protocol` (comme le schéma des options), pour que l'indicateur suive les + et − du meneur sans aller-retour |
| P30 | **« PWA ≥ 90 » de Lighthouse** : la catégorie PWA a disparu de Lighthouse (v12, 2024) | On vise **accessibilité ≥ 90, bonnes pratiques ≥ 90, performance ≥ 90** (profil mobile) sur l'accueil et sur une partie ; l'installabilité reste vérifiée par nos tests (manifest, service worker, icônes : `apps/web/test/build-artifacts.test.ts`). `docs/10` est mis à jour |
| P31 | **Sons en M4** (`docs/12` §5) : la synchronisation par le serveur et les profils audio sont en M4b | En M4, les sons publics sont **synthétisés** par la Web Audio API (création originale, aucun fichier ni licence) et joués **sur l'appareil du meneur seulement**, avec une option « Sons » désactivable. Les vibrations suivent `docs/12` §5 (jamais la nuit en présentiel). Les fichiers OGG de `docs/07` et les sons des joueurs arrivent en M4b |
| P32 | **« Rejouer avec les mêmes joueurs »** (US-60) | Reporté en **M5**, avec l'historique et les presets : il crée une nouvelle partie côté serveur (D1, Durable Object). En M4, l'écran de fin a un bouton « Nouvelle partie » qui ramène à l'accueil |

**Reports de M2 traités ici** : QR du code de partie (US-10), glisser-déposer des places
(US-12 ; les boutons monter/descendre restent pour le clavier). **L'avatar et sa galerie**
passent en M4b, avec `PixelSprite`.

**Nouvelles dépendances** (imposées par `docs/05` ou citées par `docs/06`, versions vérifiées
au moment de les ajouter) : Radix UI Primitives (dialog, tabs, toast, switch), Motion,
`@fontsource` (Cormorant Garamond, DM Sans, Pixelify Sans), `lucide-react` ; et, hors liste,
`@dnd-kit` (glisser-déposer accessible au clavier) et `uqr` (QR sans dépendance). ADR 0011.

**Hors M4** : `PixelSprite` et les six moments vivants (M4b), chat (M5), role play (M5),
écran de choix de mode (M7).

### Tâches

Neuf PR de moins de 400 lignes de code non généré : **A** (T1, #17), **B1** (T2–T3, #18) et **B2** (T4–T5, #19) pour le moteur, la B ayant été coupée en deux pour tenir la limite,
**C1**, **C2** (T6), **C3** et **C4** (T7) pour le design system, **D1** et **D2** (T8, joueur), **E1** et **E2** (T9, meneur), **F1**, **F2** (T10) et **F3** (T11) pour la configuration, le salon et la fin, **G** (T12, ambiance), **H** (T13), puis T14.

- [x] **T1 — Docs, règles, ADR 0011** *(PR A)*
  - Fichiers : `docs/01` (P26, P28, `timers.ceremonyCard`, `R-15` sans `ceremony`), `docs/02` (P29), `docs/03` (P27, P32), `docs/04` (journal dans la vue), `docs/06` (`Stepper`, `BalanceMeter`), `docs/07` (P31), `docs/10` (P30, P32), `docs/03` et `docs/06` (D-22 : pas de synthèse vocale), `docs/12` (D-22 → ✅), `docs/adr/0011-briques-ui.md`. Les versions entrent dans `docs/05` avec la tâche qui ajoute chaque dépendance. Règles nouvelles : `R-17` (cérémonie), `R-18` (correction), `R-19` (journal)
  - Tests attendus : aucun (document)

- [x] **T2 — Distribution `ceremony`** *(PR B)*
  - Fichiers : `packages/engine/src/phases/{config,deal}.ts`, `state.ts`, `events.ts`, `evolve.ts`, `project.ts`, `actions.ts`, `packages/protocol/src/{options,commands,views}.ts`, `test/deal.test.ts`, `test/leaks/ceremony.test.ts`, i18n
  - Tests attendus : P26 (ordre des places ; tour suivant à la confirmation, sur « Suivant », au minuteur ; confirmation hors tour refusée ; `simultaneous` inchangé) ; non-fuite : un joueur qui n'a pas la main ne voit que le nom de celui qui l'a
  - Fait : `test/ceremony.test.ts` (13 tests). Précision : forcer pendant la cérémonie lance la nuit tout de suite (ajoutée à `R-17`) ; un joueur voit sa carte (`me.role`) dès que sa main arrive, et la garde ensuite. Protocole v4 (`ceremony` dans les deux vues)

- [x] **T3 — Journal et chronologie** *(PR B)*
  - Fichiers : `packages/engine/src/{journal,state,evolve,project}.ts`, `packages/protocol/src/views.ts`, `test/journal.test.ts`, `test/leaks/generic.test.ts`, i18n (`journal.*`)
  - Tests attendus : P27 (une entrée par fait, heure de la commande, `Undo` retire l'entrée) ; non-fuite : aucune entrée dans une vue de joueur avant `ENDED`, la chronologie complète après
  - Fait : la transaction émet un événement `Journaled` juste après chaque fait journalisé (`src/journal.ts`), dans le même groupe, avec le `now` de la commande, la nuit et la phase : le rejeu et `Undo` n'ont rien de spécial à faire. 14 genres de faits (`journalFactSchema`). `test/journal.test.ts` (7 tests) et une ligne de l'oracle de `test/leaks/generic.test.ts`. Les clés `journal.*` arrivent avec les écrans qui les affichent (T9, T11)

- [x] **T4 — Mode correction** *(PR B)*
  - Fichiers : `packages/engine/src/phases/correction.ts`, `apply.ts`, `deaths.ts`, `packages/protocol/src/commands.ts`, `test/correction.test.ts`, `test/leaks/correction.test.ts`, i18n
  - Tests attendus : P28 (tuer déclenche chagrin, Chasseur et victoire ; ressusciter ; changer de rôle remet les potions ; refus avant la distribution et après la fin ; annulable) ; non-fuite : la cause `correction` n'apparaît jamais chez un joueur
  - Fait : `src/phases/correction.ts`, `test/correction.test.ts` (14 tests). **Précision** (ajoutée à `R-18`) : on ne corrige pas la nuit ni à l'aube masquée, sinon une mort ou un rôle qui change trahirait l'étape en cours (règle 2, nuit uniforme) ; on corrige à l'aube annoncée, au débat ou à l'exécution, et un rôle aussi pendant la distribution. Le débat attend les effets à la mort d'une correction avant d'ouvrir le vote. Le changement de rôle passe par `RoleCorrected` et non `KnowledgeGained`, qui rendrait la correction non annulable (`R-11`). Côté web : tuer et ressusciter passent par la liste de cibles existante ; changer de rôle attend l'écran du meneur (T9)

- [x] **T5 — Composition suggérée et équilibre** *(PR B)*
  - Fichiers : `packages/protocol/src/composition.ts`, `test/composition.test.ts`, `packages/engine/src/modes/classic.ts` (réutilise la suggestion)
  - Tests attendus : P29 (une suggestion valide pour chaque taille de 5 à 24, aucun rôle d'extension, `R-07` respecté ; poids et paliers de l'indicateur)
  - Fait : `packages/protocol/src/composition.ts` (`ROLE_WEIGHTS`, `balanceOf`, 8 tests). **Écart à P29** : la suggestion reste une fonction du mode dans le moteur (`suggestComposition`, `docs/11`), qui dépend du registre des rôles ; le moteur l'envoie au meneur en `CONFIG` (`suggestion` dans sa vue). Seuls les poids sont dans `protocol`, ce qui suffit pour que l'indicateur suive les + et − sans aller-retour. `docs/02` et `docs/04` corrigés. Couverture du moteur après PR B : 96,7 % des lignes, 93,4 % des branches

- [x] **T6 — Design system : fondations** *(PR C)*
  - Fichiers : `packages/ui/src/{IconButton,Badge,Avatar,Stepper,Switch,Tabs,Dialog,Sheet,Toast,EmptyState,Skeleton}.tsx` (Radix), polices `@fontsource` dans `styles.css`, histoires Ladle en nuit et en jour, `test/*.test.tsx`
  - Tests attendus : axe sans violation sur chaque histoire, nuit et jour ; `IconButton` sans `aria-label` refusé par le typage ; contraste (test existant) ; clavier (Tabs, Dialog, Stepper)
  - Fait en deux PR pour tenir la limite de 400 lignes : **C1** (polices, `IconButton`, `Badge`, `Avatar`, `Stepper`, `EmptyState`, `Skeleton` ; `test/foundations.test.tsx`, 5 tests) et **C2** (contrôles Radix `Switch`, `Tabs`, `Dialog`, `Sheet`, `Toast` ; `test/controls.test.tsx`, 7 tests), chacune avec ses histoires Ladle. Versions (catalogue pnpm, vérifiées le 2026-10-23) : `@radix-ui/react-dialog` 1.3.1, `react-tabs` 1.2.1, `react-switch` 1.4.1, `react-toast` 1.3.1, `@fontsource/cormorant-garamond`, `dm-sans` et `pixelify-sans` 5.3.0 (sous-ensemble latin seulement, environ 196 ko pour les huit graisses). Budget du bundle : 163 ko de JS et 5,4 ko de CSS au premier rendu. **Écart à l'ADR 0011** : `@dnd-kit/core` n'a rien publié depuis décembre 2024, plus de 12 mois (`docs/05`) ; T10 prendra `@dnd-kit/react` (0.5.1, octobre 2026), et l'ADR est corrigé avant sa fusion

- [x] **T7 — Design system : composants de jeu** *(PR C)*
  - Fichiers : `packages/ui/src/{RoleCard,PlayerChip,MayorBadge,PlayerCircle,TargetPicker,VoteBoard,PhaseBanner,Timer,NarratorScript,NightStepList,BalanceMeter}.tsx`, histoires, tests
  - Tests attendus : `RoleCard` maintenir pour révéler (souris, toucher, Espace, « Révéler 5 s ») ; `PlayerCircle` en grille sous 640 px ; `TargetPicker` ne propose que les cibles reçues et demande une confirmation ; `Timer` annonce 30 s, 10 s et 0 s par `aria-live` ; `VoteBoard` public (badges) et secret (compteur) ; axe sur tout
  - Fait en deux PR : **C3** (#22 : `RoleCard`, `PlayerChip`, `MayorBadge`, `PlayerCircle`, `TargetPicker` ; `test/game-components.test.tsx`, 9 tests ; la carte du web ne fournit plus que la face du rôle) et **C4** (`Timer`, `PhaseBanner`, `NarratorScript`, `NightStepList`, `VoteBoard`, `BalanceMeter` ; `test/board.test.tsx`, 13 tests). `ui` ne dépend pas de `protocol` (`docs/04`) : les composants prennent des props simples et des libellés déjà traduits. **Limite connue** : le `Timer` compare l'échéance du serveur à l'horloge du navigateur ; un décalage d'horloge décale l'affichage. La synchronisation sur l'heure du serveur arrive en M4b avec les sons (`docs/12` §5)

- [x] **T8 — Vue joueur** *(PR D)*
  - Fichiers : `apps/web/src/game/player/*.tsx` (mise en page par taille, barre basse « Ma carte », « Infos », « Joueurs », nuit uniforme, action, vote, élection, aube, cimetière), `routes/Game.tsx` (table `(phase, lecteur) → écran`), i18n, tests
  - Tests attendus : nuit uniforme (un joueur sans action rend exactement le même DOM toute la nuit) ; un contrôle par action reçue ; « Mes informations » annoncé ; axe sur chaque écran, nuit et jour, 375 px et 1280 px
  - **D1 fait** : bandeau de phase avec numéro et minuteur, mise en page par taille (une colonne et barre basse « Ma carte », « Infos », « Joueurs » ; jeu et joueurs côte à côte dès 640 px ; carte et infos à gauche, cercle sous le jeu dès 1024 px), nuit uniforme identique quel que soit le rôle, distribution et cérémonie. `test/player-screen.test.tsx` (10 tests). Vérifié en capture à 375 et 1280 px. **Correction** trouvée à la capture : le cercle affichait le rôle du joueur lui-même sous son nom, à la vue de ses voisins ; il ne l'écrit plus (la carte reste le seul moyen de le voir). **D2 fait** : les cibles passent par `TargetPicker` (Cupidon en choisit deux), le vote et l'élection par `VoteBoard` (bulletins en direct, puis décompte pondéré du serveur à la clôture, issue annoncée ; seulement « vote secret » en vote secret), l'aube annonce les morts sans cause et le rôle selon la vue, et les effets en attente sont nommés. Le pilote e2e touche l'étiquette d'une cible, comme un joueur, le bouton radio étant masqué. `test/player-screen.test.tsx` (13 tests) ; les 12 e2e Chromium passent en local sur le nouveau build

- [x] **T9 — Vue meneur** *(PR E)*
  - Fichiers : `apps/web/src/game/narrator/*.tsx` (trois colonnes ou onglets, `NightStepList`, `NarratorScript` (sans synthèse vocale, D-22), bouton principal et ligne « ce qui bloque », cercle avec les rôles, journal, annuler, forcer, pause, +30 s, mode correction), i18n, tests
  - Tests attendus : le libellé du bouton principal suit l'action reçue ; « ce qui bloque » ; axe ; raccourcis clavier

  - **E1 fait** : tableau en trois colonnes sur ordinateur (ordre de la nuit, texte à lire et actions, joueurs avec leurs rôles), en onglets sur téléphone et tablette ; une seule mise en page rendue à la fois (média `min-width: 1024px`), pour que le bouton principal n'existe qu'une fois. Le texte à lire suit l'étape (réveil, puis coucher une fois résolue) avec le texte d'avant et celui d'après ; le bouton principal change de libellé selon le moment (« Lever le jour », « Ouvrir le vote »…) et, en attente, dit ce qu'il attend et propose de forcer en bouton secondaire. Barre d'outils : pause, reprise, +30 s, annuler. `test/narrator-screen.test.tsx` (10 tests). Le pilote e2e trouve le bouton principal par `data-testid="primary-action"`. **E2 fait** : intentions de nuit en direct (votes des loups, choix de la Sorcière, Petite fille), morts et causes à l'aube (pour le meneur seul), journal horodaté avec badge sur chaque correction (colonne de droite, ou onglet « Journal »), mode correction dans une fenêtre qui n'apparaît que si le serveur propose une correction (tuer, ressusciter, changer de rôle). `test/narrator-screen.test.tsx` (14 tests) ; les 12 e2e Chromium passent en local
- [x] **T10 — Salon et configuration** *(PR F)*
  - Fichiers : `apps/web/src/game/{Lobby,Config}.tsx` (QR, glisser-déposer, suggestion, compteurs, `BalanceMeter`, options groupées avec aide), i18n, tests
  - Tests attendus : la suggestion remplit les compteurs ; l'équilibre suit chaque + et − ; options groupées (Votes, Nuit, Révélations, Minuteurs) ; glisser-déposer et boutons clavier envoient le même ordre ; le QR encode `/join/:code`
  - **F1 fait** (configuration) : « Utiliser la composition suggérée » (la suggestion du serveur), compteurs `Stepper` (un rôle unique plafonne à 1), `BalanceMeter` qui suit chaque + et −, options groupées Table, Votes, Nuit, Révélations, Minuteurs, chacune avec son aide (toutes celles de `docs/01` §8, sauf le role play, la nuit parallèle et le mode, refusés par `R-15`). `test/config.test.tsx` (5 tests). Libellés « Ajouter : Voyante » au lieu de « Ajouter un Voyante ». **Correction trouvée en capture** : passer de moins de 1024 px à plus (rotation d'une tablette) remontait l'éditeur et perdait le brouillon ; la colonne principale garde maintenant sa place dans l'arbre, et sur petit écran le texte et les actions restent visibles au-dessus des onglets (Étapes, Joueurs, Journal) au lieu d'être un onglet. **F2 fait** (salon) : carte d'invitation avec le code, le lien `/join/:code` et son QR (dessiné depuis la matrice d'`uqr`, toujours sombre sur clair), places à glisser par une poignée (`@dnd-kit/react`, souris, toucher et clavier), les flèches haut et bas restant là. Le salon du meneur et la carte d'invitation se chargent à la demande (ADR 0011) : le premier rendu reste à 178 ko de JS. Glisser-déposer vérifié dans Chromium (Bob passe devant Alice). **Correction trouvée en capture** : le QR était vide (une classe de couleur inexistante). Versions : `uqr` 0.1.3, `@dnd-kit/react` et `@dnd-kit/helpers` 0.5.1. `test/lobby.test.tsx` (2 tests) ; le pilote e2e lit le code par `data-testid="game-code"`

- [x] **T11 — Écran de fin et chronologie** *(PR F)*
  - Fichiers : `apps/web/src/game/End.tsx`, i18n, tests
  - Tests attendus : camp vainqueur, rôles révélés en cascade (sans animation en mouvement réduit), chronologie nuit par nuit lue depuis la vue ; axe
  - Fait (**F3**) : `EndScreen`, le même pour le meneur et les joueurs : vainqueur annoncé, tous les rôles révélés en cascade (80 ms entre deux cartes, `motion-safe`), chronologie découpée « Nuit N » (nuit et aube) puis « Jour N », à partir du journal que le serveur n'envoie qu'à la fin, et lien « Nouvelle partie » vers l'accueil (« Rejouer » en M5, P32). `test/end-screen.test.tsx` (3 tests) ; les e2e visent l'annonce du vainqueur, le même texte figurant aussi dans la chronologie

- [x] **T12 — Ambiance : phase, haptique, sons** *(PR G)*
  - Fichiers : `apps/web/src/ambience/{phase-theme,haptics,sounds}.ts`, `data-phase` sur `<html>`, fondu de 1,2 s (Motion), i18n (options « Sons », « Vibrations »), tests
  - Tests attendus : le thème suit la phase (l'aube masquée reste « nuit » chez le joueur, `R-12`) ; mouvement réduit → aucune animation ; vibrations selon la matrice de `docs/12` §5, jamais la nuit en présentiel ; sons seulement chez le meneur et si l'option est active
  - Fait : `src/ambience/` : `cues.ts` déduit les moments de deux vues successives (carte reçue, nuit, ton tour, jour, mort, sa mort, Maire, vote ouvert ou clos, fin) ; `feedback.ts` applique la matrice de `docs/12` §5 (aucune vibration la nuit en présentiel, « ton tour » seulement à distance, sons publics seulement) ; `sounds.ts` synthétise les sons (P31) ; `prefs.ts` range « Sons » et « Vibrations » sur l'appareil. Le thème suit la phase par `data-phase` sur `<html>` ; le fondu de 1,2 s existait déjà dans `tokens.css` (120 ms en mouvement réduit). **Motion n'est pas ajouté** : une transition CSS suffit ici, la bibliothèque arrivera avec les six moments vivants de M4b. `test/ambience.test.ts` (20 tests). Thème de jour vérifié en capture, chez le joueur (375 px) et chez le meneur. À reprendre plus tard : l'écran d'élection du joueur ne liste pas encore les candidats ; les textes français n'ont pas d'espace insécable avant « : » et « ? »

- [ ] **T13 — Vérification : e2e, axe, Lighthouse** *(PR H)*
  - Fichiers : `e2e/fixtures/table.ts` (nouveaux contrôles), `e2e/m4-*.spec.ts` (partie à 8 par la nouvelle interface, axe sur chaque écran, nuit et jour), `scripts/lighthouse.mjs`, `.github/workflows/ci.yml`
  - Tests attendus : partie à 8 jusqu'à la victoire par l'interface (la vue de débogage ne sert plus qu'à lire) ; axe sans violation `serious` ni `critical` ; Lighthouse ≥ 90 selon P30

- [ ] **T14 — Déploiement, partie réelle et rapport**
  - Fichiers : `docs/progress.md`
  - Tests attendus : `pnpm check` et e2e contre la production ; **une partie en présentiel à 8 ou plus, sans papier, jouée par l'utilisateur et sa table** (je fournis une liste de contrôle et j'attends le retour) ; définition de « terminé » vérifiée point par point
