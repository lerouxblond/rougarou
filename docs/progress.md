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

- [ ] **T10 — Client : store Zustand, socket, indicateur de connexion** *(PR D)*
  - Fichiers : `apps/web/src/game/{socket,store,useGameView,useSendCommand}.ts`, `src/components/ConnectionIndicator.tsx`, `test/socket.test.ts`, `pnpm-workspace.yaml` (`zustand` 5.0.16, `@tanstack/react-query` 5.104.5)
  - Contenu : chaque `ServerMessage` validé par Zod ; la dernière vue fait foi ; reconnexion à délai croissant (US-90) ; un trou de `seq` déclenche une resynchronisation ; `ack` et `error` corrélés par `id`
  - Tests attendus : message invalide ignoré ; reconnexion après coupure avec des délais croissants ; l'indicateur s'annonce par `aria-live`

- [ ] **T11 — Écrans bruts : auth, accueil, salon, configuration, distribution, débogage** *(PR D)*
  - Fichiers : `apps/web/src/routes/{Login,Signup,Home,Join,Game}.tsx`, `src/game/screens/{Lobby,Config,Deal,DebugView}.tsx`, `src/api.ts`, i18n
  - Contenu : connexion, inscription, « Jouer en invité » ; créer ou rejoindre par code et `/join/:code`, avec retour au salon après connexion (US-11) ; salon (code, liste, connexion vue par le meneur, monter/descendre, expulser) ; configuration brute (compteurs loups/villageois, options) ; carte à maintenir pour révéler et « J'ai vu mon rôle » ; vue de débogage : la vue projetée et un bouton par entrée de `availableActions`, de quoi jouer toute la partie
  - Tests attendus : Testing Library + axe sur chaque écran ; aucun texte en dur (test existant) ; un bouton par action reçue, aucun quand la vue n'en porte pas

- [ ] **T12 — E2E : 1 meneur + 5 joueurs, reconnexion de nuit** *(PR D)*
  - Fichiers : `e2e/m2-full-game.spec.ts`, `e2e/m2-reconnect.spec.ts`, `e2e/fixtures/table.ts`, `playwright.config.ts` (`BASE_URL` pour viser la preview ou la production)
  - Tests attendus : 6 contextes jouent jusqu'à la victoire ; un joueur recharge en pleine nuit et retrouve exactement sa vue ; aucun joueur n'a le rôle d'un autre dans son DOM

- [ ] **T13 — Déploiement, vérification et rapport**
  - Actions : créer les bases `rougarou-db` et `rougarou-db-preview`, `wrangler secret put BETTER_AUTH_SECRET` sur les deux environnements, merger, puis lancer les e2e de T12 **contre l'URL de production**
  - Tests attendus : `pnpm check` au vert ; e2e au vert en local, sur la preview et en production ; vérification point par point de la définition de « terminé »
