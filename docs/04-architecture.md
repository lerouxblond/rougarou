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
- **Rôles en plugins** : voir `docs/02` §Modèle. Le cœur expose des points d'accroche et un pipeline de résolution des morts (`R-40` à `R-46`). Ceux de M3 :
  - `nightSteps[]` : chaque étape déclare son ordre, ses acteurs, l'action reçue, sa valeur par défaut, ce que voit l'acteur et, avec `dawn`, ses **morts de l'aube**. À la fin de la nuit, le moteur passe la liste des morts d'étape en étape dans l'ordre de nuit (`R-40`). Une étape peut aussi agir à son entrée (`onEnter` : les amoureux se découvrent) et dire si elle se joue cette nuit (`scheduled` : l'étape des amoureux existe avant que Cupidon ait choisi).
  - `nightObservers[]` : un rôle peut **regarder** l'étape d'un autre rôle sans en être acteur ni la bloquer, avec ses propres actions et sa propre vue (la Petite fille et l'étape des loups).
  - `onDeath` : un rôle met en file ses effets à la mort (le tir du Chasseur). La file accepte plusieurs genres d'effets (`hunterShot`, `mayorSuccession`), publics, résolus dans l'ordre de `R-42`.
  - `onDawn`, `onVoteResolved` et `onTargeted` arrivent avec les rôles qui en ont besoin (M6).
- **Informations privées** (ADR 0010) : ce qu'un joueur apprend en secret (résultat de la Voyante, partenaire d'un amoureux, pseudos partiels vus par la Petite fille, suspects reçus par les loups) est rangé dans `GameState`, dans les infos (`knowledge`) de ce joueur. Elles sortent par sa vue projetée (`me.knowledge`, « Mes infos »), survivent au rechargement et passent par les tests de non-fuite comme le reste.
- **Projection et modes déguisés** : pour un mode `disguised` (Nuit blanche), `projectView` construit la vue d'un joueur **comme si** la partie était du mode `disguiseAs` avec la composition leurre. Le vrai mode n'existe que dans `NarratorView`. Le test `W-33` compare la forme des messages envoyés dans les deux cas.
- **Ce qui vit où** (ADR 0008) : les schémas Zod des **options**, des **commandes** et des **vues projetées** sont dans `packages/protocol`, parce qu'ils traversent le réseau. Le moteur importe ces types. Les **données de configuration** partagées (poids d'équilibre, `docs/02`) y vivent aussi, pour que l'écran de configuration les affiche sans aller-retour ; la composition suggérée, propre au mode, arrive par la vue du meneur. `GameState` et les **événements** restent internes au moteur : ils ne quittent jamais le serveur, seule la vue projetée en sort.
- **Projection** : `projectView` est la **seule** fonction autorisée à produire ce qui part vers un client. Elle part d'une vue vide et **ajoute** ce que le viewer a le droit de voir (liste blanche, jamais liste noire).
  - **Nuit uniforme** : un joueur qui n'agit pas dans l'étape en cours ne voit ni l'étape, ni son minuteur, ni aucune action. Sa vue reste identique du début de la nuit jusqu'à « Lever le jour », pour qu'aucun changement ne trahisse le moment où une étape se résout. Le test de non-fuite le vérifie.
  - **Aube masquée** (`R-12`) : tant que les morts ne sont pas annoncées, la vue d'un joueur indique encore `NIGHT`.
  - **Morts sans cause** : les joueurs voient la liste des morts de la nuit, jamais leur cause. Une cause « potion » trahirait la Sorcière.
  - **Observateurs** : un joueur qui regarde l'étape en cours (`nightObservers`) la voit comme un acteur, minuteur compris. Sa vue ne change qu'à ce moment-là.
  - **Actions** : chaque vue porte les actions possibles pour son lecteur (`availableActions`). Le client en tire ses boutons, sans rien recalculer (règle 1).
  - **Journal** (`R-19`) : les faits journalisés vivent dans `GameState` (`journal`), chacun avec l'heure de la commande (`now` injecté, pas d'horloge dans le moteur) et une clé i18n à paramètres. La vue du meneur porte tout le journal ; celle d'un joueur ne porte la chronologie qu'à `ENDED`.
  - Les vues sont validées par des schémas stricts (`packages/protocol/src/views.ts`, ADR 0008).

## Durable Object `GameRoom`

- Il est identifié par `idFromName(gameId)`, et le `gameId` est un ULID.
- Il stocke dans le SQLite du DO les tables `events(seq, grp, type, payload, at)`, `snapshot(seq, state)`, `members(user_id, kind: 'narrator'|'player')`, `ticket(ticket, user_id, expires_at)` et `meta` (identifiant, révision, date de purge). Le code est dans `apps/server/src/room/`. `grp` numérote la commande qui a produit l'événement : `Undo` supprime les lignes du dernier groupe (`R-11`). Au réveil, le DO recharge le dernier instantané et rejoue les événements qui le suivent.
- Le **meneur** est l'utilisateur qui a créé la partie. Un utilisateur qui ouvre la WebSocket sans être membre ne peut envoyer que `JoinGame`, qui fait de lui un joueur.
- L'**état de connexion** (`R-61`) n'est pas un fait de jeu : il vit dans le DO, jamais dans `GameState` ni dans le journal, sinon `Undo` l'annulerait. Le DO l'envoie au meneur seul, par un message `presence`.
- Il utilise l'**API WebSocket Hibernation** (`ctx.acceptWebSocket`, `webSocketMessage`, `webSocketClose`) : les sockets restent ouverts pendant que le DO hiberne, ce qui le garde dans la formule gratuite.
- Les **minuteurs** passent par `ctx.storage.setAlarm()`. Un DO n'a qu'une alarme : elle vise la plus proche de deux échéances, celle du moteur (`state.deadline`) et la purge à J+7 d'une partie terminée. À l'échéance du moteur, le DO applique la commande `Timeout` avec l'acteur `system` (`R-14`). Pause et +30 s (`R-16`) replanifient l'alarme.
- Boucle de traitement d'un message :
  1. On valide le message avec Zod (`ClientMessage`).
  2. On identifie l'utilisateur (attaché au socket lors de l'upgrade).
  3. On applique `engine.apply`. En cas d'erreur, on envoie `error` à l'émetteur seul.
  4. On ajoute les événements au journal.
  5. Pour **chaque** socket, on calcule `projectView` et on envoie un `state` (complet) ou un `patch` (diff JSON, optimisation au jalon M8).
- À la distribution, la partie passe en `playing` dans D1. À `ENDED`, on écrit un résumé dans D1 (`game`, `game_player`) et on garde le DO 7 jours (pour l'écran de fin et « Rejouer »), puis on le purge avec `deleteAll()`. Un DO purgé garde seulement une marque, pour qu'aucun ticket ne fasse renaître une partie vide sous le même identifiant.

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
  | { t: 'error'; id?: string; code: ErrorCode; messageKey: string }  // clé i18n, jamais un texte
  | { t: 'chat'; channel: ChannelId; msg: ChatMessage }
  | { t: 'presence'; connected: PlayerId[] }         // au meneur seul (R-61)
  | { t: 'pong' };
```

- Chaque message porte un `v` (version du protocole). Si le client a une version trop ancienne, le serveur renvoie `error: 'PROTOCOL_OUTDATED'`, et l'app invite l'utilisateur à se mettre à jour.
- Le `seq` est la **révision** de la partie : il croît à chaque commande acceptée, `Undo` compris (le nombre d'événements, lui, diminue). Si le client détecte un trou dans la séquence, il demande un `state` complet.
- Les schémas sont dans `packages/protocol/src/ws.ts` (WebSocket) et `rest.ts` (REST). Le chat (`t: 'chat'`) arrive en M5. Il n'y a pas de message `private` : une information privée fait partie de la vue projetée de son destinataire (ADR 0010). Une réponse REST en erreur a la forme `{ code, messageKey }`.

## Authentification

- On utilise **Better Auth** dans le Worker (handler Hono sur `/api/auth/*`), avec l'adaptateur Drizzle pour **D1**.
- Méthodes : e-mail + mot de passe, Google OAuth (optionnel, activé par variable d'environnement), et invité (D-04).
- **Web (PWA)** : cookie de session `HttpOnly`, `Secure`, `SameSite=Lax`, sur le même domaine que l'API.
- **Tauri** : plugin *bearer* de Better Auth. Le jeton est stocké dans le stockage sécurisé de l'OS (plugin Tauri `stronghold` ou keychain), jamais dans `localStorage`.
- **WebSocket** : le client obtient d'abord un **ticket** à usage unique valable 30 s (`POST /api/games/:id/ticket`), puis ouvre `wss://…/ws/:gameId?ticket=…`. Le Worker vérifie la session à l'émission ; le ticket est émis et **consommé par le DO de la partie**, qui seul peut garantir l'usage unique : il refuse un ticket inconnu, expiré ou déjà servi. On ne met jamais le jeton de session dans l'URL.
- **Invités** (D-04) : plugin `anonymous` de Better Auth. Un invité a une session et un identifiant comme un compte. La conversion crée un nouveau compte, vers lequel on transfère d'abord ses lignes D1 (ADR 0009).
- **E-mails** : Resend, derrière une interface `EmailSender`. Tant qu'aucun domaine n'est vérifié, la vérification d'e-mail et la réinitialisation par e-mail sont désactivées (ADR 0009).

## Base de données D1 (Drizzle)

| Table | Colonnes clés |
|---|---|
| `user`, `session`, `account`, `verification` | Gérées par Better Auth |
| `profile` | `user_id` PK, `display_name`, `avatar_id`, `locale`, `prefs` (JSON) |
| `game` | `id` (ULID), `code`, `narrator_id`, `status`, `play_mode` (présentiel/distanciel), `game_mode_id` (écrit seulement à `ENDED` pour un mode déguisé), `options` (JSON), `created_at`, `ended_at`, `winner` |
| `game_player` | `game_id`, `user_id` (`null` après suppression du compte, D-21), `seat`, `display_name` (pseudo de la partie, qui reste dans l'historique des autres), `character` (JSON, role play), `final_role`, `team`, `alive_at_end`, `won` |
| `preset` | `id`, `owner_id`, `mode_id`, `name`, `composition` (JSON), `options` (JSON) |

- Le schéma vit dans `apps/server/src/db/schema.ts`. On génère les migrations avec `drizzle-kit generate` (dans `apps/server/migrations`), et on les applique avec `wrangler d1 migrations apply <base> --env <env>` en CI. Les tests du serveur les appliquent sur une D1 vierge.
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
