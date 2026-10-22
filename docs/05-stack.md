# 05 — Stack technique

> Règle : au démarrage du projet (jalon M0), on installe la **dernière version stable** de chaque outil, puis on la verrouille par le lockfile et `packageManager`. Les numéros de version ci-dessous sont indicatifs. Une montée de version majeure passe par une PR dédiée.

## Où vivent les versions

Les versions sont écrites **une seule fois**, dans le **catalogue pnpm** de `pnpm-workspace.yaml`. Les paquets écrivent `"eslint": "catalog:"` au lieu d'un numéro, donc une montée de version se fait à un seul endroit. `packageManager` épingle pnpm lui-même.

Deux versions ne sont pas la dernière publiée, et c'est volontaire (vérifié le 2026-10-21) :

| Outil | Retenue | Dernière | Pourquoi |
|---|---|---|---|
| TypeScript | 6.0.3 | 7.0.2 | `typescript-eslint` exige `typescript >=4.8.4 <6.1.0`. Passer à TS 7 ferait perdre tout le lint typé. |
| `@types/react` | 19.3.0 | — | Suit React 19.3.1. |

pnpm 12 refuse par défaut les versions publiées depuis trop peu de temps (`minimumReleaseAge`). Les paquets épinglés volontairement et plus récents que ce délai sont listés dans `minimumReleaseAgeExclude`.

## Imposé

| Domaine | Choix | Pourquoi |
|---|---|---|
| Langage | **TypeScript** strict partout (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) | Un seul langage du moteur à l'UI |
| Runtime outillage | **Node LTS** active, **pnpm** (workspaces) + **Turborepo** | Monorepo rapide, cache de tâches |
| UI | **React** + **Vite** | Écosystème, compatible Tauri |
| Styles | **Tailwind CSS v4**, configuré à partir de `design/tokens.css` (`@theme`) | Tokens → utilitaires, sans valeur magique |
| Composants accessibles | **Radix UI Primitives** (dialog, popover, tabs, toast…) | Accessibilité gérée, sans style imposé |
| Animations | **Motion** (ex-Framer Motion) | Transitions jour/nuit, cartes |
| Routage | **TanStack Router** | Routes typées |
| Données REST | **TanStack Query** | Cache, reprises |
| État temps réel | **Zustand** | Store minimal alimenté par le WS |
| Validation | **Zod** | Protocole partagé client/serveur |
| i18n | **i18next** + `react-i18next`, catalogues JSON typés | Standard, pluriels |
| PWA | **vite-plugin-pwa** | Manifest + service worker |
| Backend | **Cloudflare Workers** + **Hono** | Gratuit, edge, prise en charge native de Better Auth |
| Temps réel | **Durable Objects** (backend SQLite, API Hibernation) | Une partie = une instance qui fait autorité |
| Base de données | **Cloudflare D1** + **Drizzle ORM** / drizzle-kit | SQLite managé, migrations typées |
| Auth | **Better Auth** (+ plugin bearer pour Tauri) | Auto-hébergé, adaptateur D1/Drizzle |
| Apps natives | **Tauri 2** (Windows, macOS, Linux, Android, iOS) | Un seul code, binaires légers |
| Tests unitaires | **Vitest** 5 (+ `@cloudflare/vitest-plugin`, ex-`vitest-pool-workers`, pour le Worker et le DO), couverture `@vitest/coverage-v8` | Rapide, environnement Workers réel |
| Tests de propriétés | **fast-check** (moteur seulement, `docs/09`) | Parties aléatoires reproductibles par graine |
| Tests e2e | **Playwright** (plusieurs contextes navigateur = plusieurs joueurs) | Simule une vraie table |
| Qualité | **ESLint** (flat config, typescript-eslint), **Prettier**, **Lefthook** (hooks Git), **commitlint** | Normes vérifiées automatiquement |
| CLI Cloudflare | **Wrangler** | Développement local et déploiement |

## Interdit (sauf ADR)

- `any`, `@ts-ignore` (utiliser `@ts-expect-error` avec justification si inévitable).
- Bibliothèque de composants à style imposé (MUI, Chakra, Ant…) : on construit le design system.
- Redux, MobX, ou tout second gestionnaire d'état global.
- Socket.io ou Pusher : on utilise les WebSockets natifs avec les Durable Objects.
- ORM autre que Drizzle. Pas de SQL brut hors des migrations, sauf dans le SQLite du DO.
- Stockage de jetons dans `localStorage`.
- Polices ou images chargées depuis un CDN tiers à l'exécution : tout est auto-hébergé dans le build.
- Analytics ou traceurs tiers.

## Ajouter une dépendance

Avant d'ajouter une dépendance, vérifie ces points :
1. Elle répond à un besoin réel, impossible à couvrir en moins de 50 lignes de code maison.
2. Elle est maintenue (version publiée il y a moins de 12 mois) et sa licence est compatible (MIT, Apache-2.0, BSD, ISC).
3. Elle n'alourdit pas le bundle initial de plus de 30 ko gzip (sinon, chargement à la demande).
4. Elle est compatible avec le runtime Workers si elle tourne côté serveur (pas d'API Node non prise en charge).
5. Si c'est une dépendance majeure, un ADR la justifie.
