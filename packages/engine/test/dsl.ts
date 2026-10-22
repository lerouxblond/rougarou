import type {
  Actor,
  Ballot,
  CommandInput,
  Composition,
  GameOptionsInput,
  PlayerId,
  RoleId,
} from '@rougarou/protocol';
import { commandSchema } from '@rougarou/protocol';

import {
  apply,
  createGame,
  createRng,
  evolve,
  type ApplyResult,
  type EngineErrorCode,
  type GameEvent,
  type GameState,
  type Rng,
} from '../src/index.ts';

/** Horloge de depart des parties de test. */
export const T0 = 1_000_000;

/**
 * Pilote de partie pour les tests (`docs/09` §Tests).
 *
 * Il envoie de vraies commandes au moteur, garde l'etat et tout le journal, et
 * echoue bruyamment quand une commande attendue est refusee. Les joueurs ont
 * pour identifiant leur nom, pour que les scenarios se lisent.
 */
export interface GameDriver {
  readonly state: GameState;
  /** Tous les evenements depuis la creation. */
  readonly log: readonly GameEvent[];
  /** Les groupes d'evenements, un par commande acceptee (`R-11`). */
  readonly groups: readonly (readonly GameEvent[])[];
  /** Les evenements de la derniere commande acceptee. */
  readonly last: readonly GameEvent[];
  now: number;
  /** Envoie une commande ; l'etat n'avance que si elle est acceptee. */
  send(actor: Actor, command: CommandInput): ApplyResult;
  /** Envoie une commande qui doit etre acceptee. */
  ok(actor: Actor, command: CommandInput): GameDriver;
  /** Envoie une commande qui doit etre refusee avec ce code. */
  rejects(actor: Actor, command: CommandInput, code: EngineErrorCode): GameDriver;
  /** Raccourcis d'acteurs. */
  narrator(command: CommandInput): GameDriver;
  as(playerId: PlayerId, command: CommandInput): GameDriver;
  advance(force?: boolean): GameDriver;
  /** Avance l'horloge jusqu'a l'echeance en cours et envoie `Timeout`. */
  expire(): GameDriver;
  /** Rejoue un evenement tel quel (pour une distribution choisie). */
  replay(event: GameEvent): GameDriver;
  // Raccourcis de jeu
  wolfVote(wolf: PlayerId, target: PlayerId): GameDriver;
  /** Envoie une action de nuit pour `actor`. */
  night(actor: PlayerId, action: NightActionInput): GameDriver;
  seerProbe(seer: PlayerId, target: PlayerId): GameDriver;
  witch(witch: PlayerId, choice?: { save?: boolean; kill?: PlayerId | null }): GameDriver;
  shoot(hunter: PlayerId, target: PlayerId): GameDriver;
  link(cupid: PlayerId, first: PlayerId, second: PlayerId): GameDriver;
  confirmLove(lover: PlayerId): GameDriver;
  vote(voter: PlayerId, target: Choice): GameDriver;
  votes(ballots: Readonly<Record<PlayerId, Choice>>): GameDriver;
}

/** Une action de nuit, telle que le client l'envoie. */
export type NightActionInput = Extract<CommandInput, { type: 'SubmitNightAction' }>['action'];

/** Un choix de bulletin : un identifiant de joueur, `'spare'` ou `'abstain'`. */
export type Choice = string;

export const NARRATOR: Actor = { kind: 'narrator' };
export const SYSTEM: Actor = { kind: 'system' };

export function player(playerId: PlayerId): Actor {
  return { kind: 'player', playerId };
}

function toBallot(target: Choice): Ballot {
  return target === 'spare' || target === 'abstain'
    ? { kind: target }
    : { kind: 'player', playerId: target };
}

/** Une partie neuve, dans le salon. `seed` alimente l'alea du contexte. */
export function newGame(seed = 1, gameId = 'game-1'): GameDriver {
  const created = createGame(gameId);
  const rng: Rng = createRng(seed);
  let state = created.state;
  const log: GameEvent[] = [...created.events];
  const groups: GameEvent[][] = [[...created.events]];

  const driver: GameDriver = {
    get state() {
      return state;
    },
    get log() {
      return log;
    },
    get groups() {
      return groups;
    },
    get last() {
      return groups.at(-1) ?? [];
    },
    now: T0,

    send(actor, command) {
      const cmd = commandSchema.parse(command);
      const result = apply(state, { actor, cmd }, { now: driver.now, rng });

      if (result.ok) {
        state = result.state;
        log.push(...result.events);
        groups.push([...result.events]);
      }

      return result;
    },

    ok(actor, command) {
      const result = driver.send(actor, command);

      if (!result.ok) {
        throw new Error(
          `Commande ${command.type} refusee : ${result.error.code} (${result.error.messageKey}) en ${state.phase}`,
        );
      }

      return driver;
    },

    rejects(actor, command, code) {
      const result = driver.send(actor, command);

      if (result.ok) {
        throw new Error(`Commande ${command.type} acceptee alors qu'on attendait ${code}`);
      }

      if (result.error.code !== code) {
        throw new Error(
          `Commande ${command.type} refusee avec ${result.error.code} (${result.error.messageKey}) au lieu de ${code}`,
        );
      }

      return driver;
    },

    narrator: (command) => driver.ok(NARRATOR, command),
    as: (playerId, command) => driver.ok(player(playerId), command),
    advance: (force = false) => driver.narrator({ type: 'AdvancePhase', force }),

    expire() {
      if (state.deadline === null) {
        throw new Error(`Aucun minuteur en cours en ${state.phase}`);
      }

      driver.now = state.deadline;
      return driver.ok(SYSTEM, { type: 'Timeout' });
    },

    replay(event) {
      state = evolve(state, event);
      log.push(event);
      groups.push([event]);
      return driver;
    },

    wolfVote: (wolf, target) =>
      driver.as(wolf, { type: 'SubmitNightAction', action: { kind: 'wolfVote', target } }),
    night: (actor, action) => driver.as(actor, { type: 'SubmitNightAction', action }),
    seerProbe: (seer, target) => driver.night(seer, { kind: 'seerProbe', target }),
    witch: (witch, { save = false, kill = null } = {}) =>
      driver.night(witch, { kind: 'witchPotions', save, kill }),
    shoot: (hunter, target) => driver.as(hunter, { type: 'HunterShoot', playerId: target }),
    link: (cupid, first, second) =>
      driver.night(cupid, { kind: 'cupidLink', lovers: [first, second] }),
    confirmLove: (lover) => driver.night(lover, { kind: 'loversConfirm' }),
    vote: (voter, target) => driver.as(voter, { type: 'CastVote', ballot: toBallot(target) }),
    votes(ballots) {
      for (const [voter, target] of Object.entries(ballots)) {
        driver.vote(voter, target);
      }

      return driver;
    },
  };

  return driver;
}

/** Compte les roles d'une distribution, pour en faire la composition. */
export function compositionOf(roles: Readonly<Record<PlayerId, RoleId>>): Composition {
  const composition: Composition = {};

  for (const role of Object.values(roles)) {
    composition[role] = (composition[role] ?? 0) + 1;
  }

  return composition;
}

export interface SetupOptions {
  readonly roles: Readonly<Record<PlayerId, RoleId>>;
  readonly options?: GameOptionsInput;
  readonly seed?: number;
}

/**
 * Une partie distribuee avec exactement ces roles, chaque joueur ayant vu le
 * sien : on est en `DEAL`, pret a lancer la nuit.
 *
 * La distribution choisie est rejouee sous forme d'evenement `RolesDealt`,
 * comme le moteur l'aurait produit avec une graine qui donne ce tirage.
 */
export function setup({ roles, options = {}, seed = 1 }: SetupOptions): GameDriver {
  const driver = newGame(seed);
  const names = Object.keys(roles);

  for (const name of names) {
    driver.as(name, { type: 'JoinGame', name });
  }

  driver
    .advance()
    .narrator({ type: 'SetOptions', options })
    .narrator({ type: 'SetComposition', composition: compositionOf(roles) })
    .replay({ type: 'RolesDealt', seed, assignments: roles })
    .replay({ type: 'PhaseChanged', phase: 'DEAL' });

  for (const name of names) {
    driver.as(name, { type: 'ConfirmRoleSeen' });
  }

  return driver;
}

/** Les types des evenements, pour des assertions lisibles. */
export function types(events: readonly GameEvent[]): string[] {
  return events.map((event) => event.type);
}

/** Cinq joueurs : Alice est le loup. */
export const FIVE_ROLES = {
  Alice: 'werewolf',
  Bob: 'villager',
  Chloe: 'villager',
  David: 'villager',
  Eve: 'villager',
} as const;

/** Huit joueurs : Alice et Bob sont les loups. */
export const EIGHT_ROLES = {
  Alice: 'werewolf',
  Bob: 'werewolf',
  Chloe: 'villager',
  David: 'villager',
  Eve: 'villager',
  Fanny: 'villager',
  Gaspard: 'villager',
  Hugo: 'villager',
} as const;

/** Les vivants, dans l'ordre des places. */
export function living(game: GameDriver): string[] {
  return game.state.seats.filter((id) => game.state.players[id]?.alive === true);
}

/**
 * Elit `mayor` a l'unanimite depuis le debut de l'election, sans candidature.
 * On arrive au debat.
 */
export function electMayor(game: GameDriver, mayor: string): GameDriver {
  game.advance();

  for (const voter of living(game)) {
    game.vote(voter, mayor);
  }

  return game.advance();
}

/**
 * Depuis la distribution ou l'execution : une nuit ou les loups tuent
 * `victim`. En pilotage assiste, on arrive a l'aube, avant « Lever le jour ».
 */
export function firstNight(game: GameDriver, victim: string): GameDriver {
  game.advance();

  for (const wolf of living(game).filter((id) => game.state.players[id]?.role === 'werewolf')) {
    game.wolfVote(wolf, victim);
  }

  return game;
}

/**
 * Depuis n'importe quel moment du jour (ou l'aube), le meneur avance, en
 * forcant si besoin, jusqu'a la nuit suivante. Personne n'est elu ni execute
 * autrement que par les valeurs par defaut.
 */
export function toNextNight(game: GameDriver): GameDriver {
  const start = game.state.nightNumber;

  for (let step = 0; step < 20; step += 1) {
    if (game.state.phase === 'ENDED') {
      return game;
    }

    if (game.state.phase === 'NIGHT' && game.state.nightNumber > start) {
      return game;
    }

    const blocked =
      game.state.pending.length > 0 ||
      game.state.vote?.tie != null ||
      (game.state.phase === 'NIGHT' && game.state.night?.stepResolved !== true);

    game.advance(blocked);
  }

  throw new Error(`Nuit suivante introuvable depuis ${game.state.phase}`);
}
