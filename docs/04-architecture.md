# 04 — Architecture

## Vue d'ensemble

```
┌────────────────────────────┐        HTTPS (REST /api/*)        ┌──────────────────────────────────┐
│  Client                    │ ────────────────────────────────▶ │  Worker « api » (Hono)           │
│  React PWA                 │                                    │  • /api/auth/*  (Better Auth)    │
│  • navigateur              │                                    │  • /api/games  (créer, rejoindre)│
│  • Tauri (desktop/mobile)  │        WebSocket /ws/:gameId       │  • /api/me, /history, /presets   │
│    = même build web        │ ◀══════════════════════════════▶  │  • upgrade WS → Durable Object   │
└────────────────────────────┘                                    └───────────────┬──────────────────┘
                                                                                  │ stub.fetch()
                                                     ┌────────────────────────────▼─────────────────┐
                                                     │  Durable Object « GameRoom » (1 par partie)  │
                                                     │  • état autoritatif + journal d'événements   │
                                                     │    (SQLite intégré au DO)                    │
                                                     │  • appelle packages/engine                   │
                                                     │  • projectView() par client → broadcast      │
                                                     │  • alarms = minuteurs de phase               │
                                                     │  • WebSocket Hibernation API                 │
                                                     └────────────────────────────┬─────────────────┘
                                                                                  │ à la fin de partie
                                                                        ┌─────────▼─────────┐
                                                                        │  D1 (SQLite)      │
                                                                        │  comptes, sessions│
                                                                        │  historique,      │
                                                                        │  presets          │
                                                                        └───────────────────┘
```

On a **un seul build web**. La PWA est servie par Cloudflare (assets statiques du Worker, ou Pages). Les apps natives Tauri embarquent ce même build et parlent à la même API.

## Monorepo

```
rougarou/
├─ apps/
│  ├─ web/               React + Vite + TS (PWA). UI uniquement.
│  ├─ server/            Cloudflare Worker (Hono) + Durable Object GameRoom
│  └─ native/            Tauri 2 : enveloppe de apps/web (desktop + Android + iOS)
├─ packages/
│  ├─ engine/            Moteur de jeu PUR (règles, modes/, roles/, résolution, projection)
│  ├─ protocol/          Schémas Zod des messages WS + DTO REST, types partagés
│  ├─ ui/                Composants du design system (React) + tokens importés de /design
│  ├─ i18n/              Catalogues fr/en + helpers typés
│  └─ config/            tsconfig, eslint, prettier, vitest partagés
├─ design/               tokens.css (source de vérité), maquettes
├─ docs/                 cette documentation
└─ .github/workflows/    CI, déploiement, releases
```

Les dépendances entre packages vont **dans un seul sens** :

```
web ──▶ ui, protocol, i18n          server ──▶ engine, protocol
ui ──▶ (design/tokens)              engine ──▶ (rien d'interne sauf types de protocol)
```

`engine` n'importe jamais `server` ni `web`. Une règle ESLint le vérifie en CI : les imports entre paquets se faisant par alias (`@rougarou/engine`) et jamais en chemin relatif (`docs/09`), c'est `no-restricted-imports` qui interdit, paquet par paquet, tout alias absent de sa liste blanche. La carte des dépendances autorisées et la règle de pureté du moteur vivent dans `packages/config/eslint/zones.js`, et `packages/config/test/import-boundaries.test.ts` vérifie sur des fixtures qu'elles se déclenchent vraiment.

## Le moteur (`packages/engine`)

```ts
type Result = { ok: true; state: GameState; events: GameEvent[] } | { ok: false; error: EngineError };

function apply(state: GameState, command: Command, ctx: { now: number; rng: Rng }): Result;
function projectView(state: GameState, viewer: ViewerId): PlayerView | NarratorView;
function availableActions(state: GameState, viewer: ViewerId): ActionDescriptor[];
function nightPlan(state: GameState): NightStep[];
function checkVictory(state: GameState): Victory | null;
```

- **Commandes** (intentions) : `JoinGame`, `SetComposition`, `Deal`, `ConfirmRoleSeen`, `SubmitNightAction`, `AdvancePhase`, `CastVote`, `HunterShoot`, `Undo`, `SendChat`…
- **Événements** (faits) : `PlayerJoined`, `RolesDealt`, `PlayerKilled`, `VoteCast`, `PhaseChanged`, `MayorElected`…
- **Event sourcing léger** : l'état se reconstruit par `events.reduce(evolve, initialState)`. `Undo` rejoue tout sauf le dernier groupe d'événements. On prend un instantané de l'état tous les 50 événements.
- **Déterminisme** : l'aléa passe par un `Rng` à graine, stockée dans l'événement `RolesDealt`. Rejouer les mêmes événements donne le même état. Les tests en dépendent.
- **Modes de jeu en plugins** : `modes/<id>.ts` exporte une `GameModeDefinition` (`docs/11`). Le mode est choisi en `CONFIG`, puis figé dans l'événement `GameConfigured` avec la composition et les options. Le moteur combine le mode et les rôles : l'ordre de nuit = les étapes des rôles + les étapes du mode, et les conditions de victoire = celles du mode.
- **Modificateurs en plugins** : `modifiers/<id>.ts` (`docs/11` §Modificateurs), par exemple Role play. Ils sont actifs dans `GameConfigured.modifiers[]`, et le moteur consulte leurs points d'accroche (`extraPhases`, `disabledNightEffects`).
- **Rôles en plugins** : voir `docs/02` §Modèle. Le cœur expose des points d'accroche (`onDeath`, `onDawn`, `onVoteResolved`, `onTargeted`) et un pipeline de résolution des morts (`R-40` à `R-42`).
- **Projection et modes déguisés** : pour un mode `disguised` (Nuit blanche), `projectView` construit la vue d'un joueur **comme si** la partie était du mode `disguiseAs` avec la composition leurre. Le vrai mode n'existe que dans `NarratorView`. Le test `W-33` compare la forme des messages envoyés dans les deux cas.
- **Ce qui vit où** (ADR 0008) : les schémas Zod des **options**, des **commandes** et des **vues projetées** sont dans `packages/protocol`, parce qu'ils traversent le réseau. Le moteur importe ces types. `GameState` et les **événements** restent internes au moteur : ils ne quittent jamais le serveur, seule la vue projetée en sort.
- **Projection** : `projectView` est la **seule** fonction autorisée à produire ce qui part vers un client. Elle part d'une vue vide et **ajoute** ce que le viewer a le droit de voir (liste blanche, jamais liste noire).

## Durable Object `GameRoom`

- Il est identifié par `idFromName(gameId)`, et le `gameId` est un ULID.
- Il stocke dans le SQLite du DO les tables `events(seq, type, payload, at)`, `snapshot(seq, state)` et `members(userId, role: 'narrator'|'player'|'spectator', seat, connected)`.
- Il utilise l'**API WebSocket Hibernation** (`ctx.acceptWebSocket`, `webSocketMessage`, `webSocketClose`) : les sockets restent ouverts pendant que le DO hiberne, ce qui le garde dans la formule gratuite.
- Les **minuteurs** passent par `ctx.storage.setAlarm()`. À l'expiration, le DO applique `AdvancePhase` avec un motif `timeout`.
- Boucle de traitement d'un message :
  1. On valide le message avec Zod (`ClientMessage`).
  2. On identifie l'utilisateur (attaché au socket lors de l'upgrade).
  3. On applique `engine.apply`. En cas d'erreur, on envoie `error` à l'émetteur seul.
  4. On ajoute les événements au journal.
  5. Pour **chaque** socket, on calcule `projectView` et on envoie un `state` (complet) ou un `patch` (diff JSON, optimisation au jalon M8).
- À `ENDED`, on écrit un résumé dans D1 (`games`, `game_players`) et on garde le DO 7 jours (pour l'écran de fin et « Rejouer »), puis on le purge avec `deleteAll()`.

## Protocole (`packages/protocol`)

```ts
// Client → Serveur
type ClientMessage =
  | { t: 'cmd'; id: string; cmd: Command }          // id = corrélation pour l'ack
  | { t: 'chat'; channel: ChannelId; text: string }
  | { t: 'ping' };

// Serveur → Client
type ServerMessage =
  | { t: 'state'; seq: number; view: PlayerView | NarratorView }
  | { t: 'ack'; id: string }
  | { t: 'error'; id?: string; code: ErrorCode; message: string }
  | { t: 'chat'; channel: ChannelId; msg: ChatMessage }
  | { t: 'private'; info: PrivateInfo }              // résultat Voyante, Renard…
  | { t: 'pong' };
```

- Chaque message porte un `v` (version du protocole). Si le client a une version trop ancienne, le serveur renvoie `error: 'PROTOCOL_OUTDATED'`, et l'app invite l'utilisateur à se mettre à jour.
- Le `seq` est croissant. Si le client détecte un trou dans la séquence, il demande un `state` complet.

## Authentification

- On utilise **Better Auth** dans le Worker (handler Hono sur `/api/auth/*`), avec l'adaptateur Drizzle pour **D1**.
- Méthodes : e-mail + mot de passe, Google OAuth (optionnel, activé par variable d'environnement). L'envoi des e-mails de vérification et de réinitialisation passe par un fournisseur transactionnel (au choix au jalon M2, voir l'ADR à écrire).
- **Web (PWA)** : cookie de session `HttpOnly`, `Secure`, `SameSite=Lax`, sur le même domaine que l'API.
- **Tauri** : plugin *bearer* de Better Auth. Le jeton est stocké dans le stockage sécurisé de l'OS (plugin Tauri `stronghold` ou keychain), jamais dans `localStorage`.
- **WebSocket** : le client obtient d'abord un **ticket** à usage unique valable 30 s (`POST /api/games/:id/ticket`), puis ouvre `wss://…/ws/:gameId?ticket=…`. Le Worker vérifie le ticket avant de transférer au DO. On ne met jamais le jeton de session dans l'URL.

## Base de données D1 (Drizzle)

| Table | Colonnes clés |
|---|---|
| `user`, `session`, `account`, `verification` | Gérées par Better Auth |
| `profile` | `user_id` PK, `display_name`, `avatar_id`, `locale`, `prefs` (JSON) |
| `game` | `id` (ULID), `code`, `narrator_id`, `status`, `play_mode` (présentiel/distanciel), `game_mode_id` (écrit seulement à `ENDED` pour un mode déguisé), `options` (JSON), `created_at`, `ended_at`, `winner` |
| `game_player` | `game_id`, `user_id`, `seat`, `character` (JSON, role play), `final_role`, `team`, `alive_at_end`, `won` |
| `preset` | `id`, `owner_id`, `mode_id`, `name`, `composition` (JSON), `options` (JSON) |

- On versionne les migrations avec `drizzle-kit`, et on les applique avec `wrangler d1 migrations apply` en CI.
- Le code de partie actif est réservé dans D1 avec un index unique sur (`code`, `status != ended`).

## Client web

- **État serveur de jeu** : un store Zustand alimenté par le WebSocket (la dernière `view` reçue fait foi, et il n'y a pas d'état de jeu local).
- **Données REST** (profil, historique, presets) : TanStack Query.
- **Routage** : TanStack Router (routes typées).
- **Écran de partie** : une table `(phase, viewerKind, role) → composant`, sans cascade de `if`.
- **PWA** : `vite-plugin-pwa` (Workbox). Le shell est mis en cache et les assets en *cache-first*. L'API et le WebSocket ne sont jamais mis en cache.

## Sécurité (liste de contrôle)

- [ ] Toute entrée est validée par Zod à la frontière (REST et WS).
- [ ] La projection fonctionne en liste blanche, avec des tests de non-fuite par rôle et par phase (`engine/test/leaks/*.test.ts`). Un test générique passe aussi sur toutes les vues de toutes les phases d'une partie simulée et vérifie qu'aucun rôle caché n'apparaît.
- [ ] Le serveur limite le débit : 10 commandes par seconde et par socket, 1 message de chat par seconde.
- [ ] Le serveur vérifie les autorisations : seul le meneur peut lancer une commande de meneur, et seul le joueur concerné peut faire son action de nuit.
- [ ] CORS limité aux origines de la PWA et à `tauri://localhost` / `http://tauri.localhost`.
- [ ] Les secrets passent par `wrangler secret`, jamais dans le dépôt.
- [ ] Un en-tête CSP strict est appliqué sur la PWA.

## Observabilité

- On utilise les logs structurés JSON du Worker (`console.log` d'objets) et Workers Logs. Chaque entrée porte `gameId`, `seq` et `cmd`, sans aucune donnée personnelle ni rôle caché.
- Côté client, un rapport d'erreur volontaire (« Signaler un bug ») exporte le journal de la partie anonymisé. On n'utilise pas de traceur tiers en V1.
