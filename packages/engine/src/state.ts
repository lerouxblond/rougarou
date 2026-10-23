import {
  gameOptionsSchema,
  type Ballot,
  type Composition,
  type DeathCause,
  type GameOptions,
  type JournalEntry,
  type Knowledge,
  type Phase,
  type PlayerId,
  type RoleId,
  type VoteOutcome,
  type Winner,
} from '@rougarou/protocol';

/**
 * Etat d'une partie.
 *
 * Il ne quitte jamais le serveur : seule la vue projetee en sort (`CLAUDE.md`
 * regle 2, ADR 0008). Il est plat, indexe par identifiant de joueur, et
 * entierement `readonly` (ADR 0007). C'est du JSON ordinaire, pour l'instantane
 * du Durable Object et la comparaison en test.
 */
export interface GameState {
  readonly gameId: string;
  readonly phase: Phase;
  readonly players: Readonly<Record<PlayerId, PlayerState>>;
  /** Ordre des places autour de la table (`docs/02`, Renard et Montreur d'ours). */
  readonly seats: readonly PlayerId[];
  readonly options: GameOptions;
  readonly composition: Composition;
  /** Graine de la distribution, conservee pour le rejeu (ADR 0002). */
  readonly seed: number | null;
  /** Numero de la nuit en cours ou de la derniere nuit jouee. Le jour N suit la nuit N. */
  readonly nightNumber: number;
  readonly mayor: PlayerId | null;
  /** Une election du Maire a deja eu lieu (`R-50`). */
  readonly electionHeld: boolean;
  readonly night: NightState | null;
  readonly dawn: DawnState | null;
  readonly election: ElectionState | null;
  readonly vote: VoteState | null;
  /** Nombre de nuits ou chaque Petite fille a espionne (`docs/02`, risque croissant). */
  readonly spyNights: Readonly<Record<PlayerId, number>>;
  /** Le couple forme par Cupidon (`docs/02`, `R-03`). */
  readonly lovers: Couple | null;
  /** Potions restantes de chaque Sorciere (`docs/02`). Absente : les deux. */
  readonly potions: Readonly<Record<PlayerId, Potions>>;
  /** Effets a la mort en attente, dans l'ordre de `R-42`. */
  readonly pending: readonly PendingEffect[];
  /**
   * Echeance de l'action en cours, en millisecondes (`R-14`). `null` : pas de
   * minuteur, c'est le meneur qui avance.
   */
  readonly deadline: number | null;
  /**
   * Duree restante d'un minuteur en pause, en millisecondes (`R-16`). Quand
   * elle est remplie, `deadline` est `null`.
   */
  readonly pausedRemaining: number | null;
  readonly winner: Winner | null;
  /**
   * Distribution en ceremonie (`R-17`) : la place du joueur qui a la main.
   * Egale a `seats.length` apres le dernier ; `null` hors ceremonie.
   */
  readonly ceremonyTurn: number | null;
  /** Les faits de la partie, dans l'ordre (`R-19`). */
  readonly journal: readonly JournalEntry[];
}

export interface PlayerState {
  readonly id: PlayerId;
  readonly name: string;
  readonly role: RoleId | null;
  readonly alive: boolean;
  /** Le joueur a confirme « J'ai vu mon role » (`docs/01` §2, `DEAL`). */
  readonly roleSeen: boolean;
  /** Le role est connu de tous (mort avec `revealRoleOnDeath`, `R-43`). */
  readonly roleRevealed: boolean;
  /** Ses infos privees, dans l'ordre ou il les a apprises (ADR 0010). */
  readonly knowledge: readonly Knowledge[];
}

/**
 * Identifiant d'une sous-etape de nuit (`R-20`), declare par le role ou le
 * mode qui la porte (`wolves` pour les loups).
 */
export type NightStepId = string;

export interface NightState {
  readonly number: number;
  readonly steps: readonly NightStepId[];
  /** Index de l'etape en cours. Egal a `steps.length` quand toutes sont passees. */
  readonly current: number;
  readonly stepResolved: boolean;
  /** Vote en cours de chaque loup (`R-34`). */
  readonly wolfVotes: Readonly<Record<PlayerId, PlayerId>>;
  /** Ex aequo que le meneur doit departager, en mode `majority`. */
  readonly wolfTie: readonly PlayerId[] | null;
  /** Victime choisie par les loups : une intention, resolue a l'aube (`R-21`). */
  readonly wolfVictim: PlayerId | null;
  /** Le choix de la Sorciere cette nuit, resolu a l'aube (`R-40`). */
  readonly witch: WitchChoice | null;
  /** Les amoureux qui ont confirme leur decouverte, la nuit 1. */
  readonly loversConfirmed: readonly PlayerId[];
  /** La Petite fille a espionne cette nuit : ce qu'elle a vu de la meute. */
  readonly spy: SpyGlimpse | null;
}

/** Un loup tel que la Petite fille le voit : les positions devoilees de son pseudo. */
export interface GlimpsedWolf {
  readonly wolf: PlayerId;
  readonly revealed: readonly number[];
}

/** Ce que la Petite fille a vu en espionnant, et si elle a ete reperee. */
export interface SpyGlimpse {
  readonly playerId: PlayerId;
  /** Les loups, dans l'ordre tire au hasard. */
  readonly pack: readonly GlimpsedWolf[];
  readonly caught: boolean;
}

/** Deux amoureux. */
export type Couple = readonly [PlayerId, PlayerId];

/** Les potions d'une Sorciere : `true` tant qu'elle ne l'a pas bue. */
export interface Potions {
  readonly life: boolean;
  readonly death: boolean;
}

/** Une Sorciere sauve la victime des loups (`save`) et/ou empoisonne `kill`. */
export interface WitchChoice {
  readonly save: boolean;
  readonly kill: PlayerId | null;
}

/** Cause d'une mort, connue du seul meneur (`docs/04` §Projection). */
export type { DeathCause };

export interface Death {
  readonly playerId: PlayerId;
  readonly cause: DeathCause;
}

export interface DawnState {
  readonly deaths: readonly Death[];
  /** « Lever le jour » a ete joue : les morts sont publiques (`R-12`). */
  readonly announced: boolean;
}

export interface ElectionState {
  readonly stage: 'candidacy' | 'vote';
  readonly candidates: readonly PlayerId[];
  /** Joueurs pour qui l'on peut voter : les candidats, ou tous les vivants. */
  readonly eligible: readonly PlayerId[];
  readonly ballots: Readonly<Record<PlayerId, PlayerId>>;
  readonly round: 1 | 2;
}

export interface VoteState {
  readonly candidates: readonly PlayerId[];
  /** Le choix « Epargner » est propose (`R-36`). */
  readonly spare: boolean;
  readonly ballots: Readonly<Record<PlayerId, Ballot>>;
  readonly round: 1 | 2;
  /** Ex aequo que le Maire doit departager (`R-33`, `R-38`). */
  readonly tie: readonly PlayerId[] | null;
  /** Ce que le Maire a decide d'une egalite : le designe, ou personne (minuteur, forcage). */
  readonly tieBroken: { readonly playerId: PlayerId | null } | null;
  /** Le vote est clos ; l'execution suit. */
  readonly closed: boolean;
  /** Decompte et issue, une fois le vote clos. */
  readonly result: {
    readonly tally: Readonly<Record<string, number>>;
    readonly outcome: VoteOutcome;
  } | null;
}

/** Le Maire mort doit designer son successeur (`R-52`, `designate`). */
export interface MayorSuccessionEffect {
  readonly kind: 'mayorSuccession';
  readonly from: PlayerId;
}

/** Le Chasseur mort doit tirer (`R-42`, `R-45`). */
export interface HunterShotEffect {
  readonly kind: 'hunterShot';
  readonly from: PlayerId;
}

/** Un effet a la mort qui attend une resolution (`R-41`, `R-42`). */
export type PendingEffect = HunterShotEffect | MayorSuccessionEffect;

/** Issue de la partie (`docs/01` §1, `R-03`). */
export type { Winner };

/** Etat vide, avant l'evenement `GameCreated`. */
export function emptyState(): GameState {
  return {
    gameId: '',
    phase: 'LOBBY',
    players: {},
    seats: [],
    options: gameOptionsSchema.parse({}),
    composition: {},
    seed: null,
    nightNumber: 0,
    mayor: null,
    electionHeld: false,
    night: null,
    dawn: null,
    election: null,
    vote: null,
    spyNights: {},
    lovers: null,
    potions: {},
    pending: [],
    deadline: null,
    pausedRemaining: null,
    winner: null,
    ceremonyTurn: null,
    journal: [],
  };
}

/** Joueurs dans l'ordre des places. */
export function seatedPlayers(state: GameState): PlayerState[] {
  return state.seats.map((id) => getPlayer(state, id));
}

/** Joueurs vivants, dans l'ordre des places. */
export function alivePlayers(state: GameState): PlayerState[] {
  return seatedPlayers(state).filter((player) => player.alive);
}

/** Un joueur dont on sait qu'il existe. Un identifiant inconnu est un bug. */
export function getPlayer(state: GameState, id: PlayerId): PlayerState {
  const player = state.players[id];

  if (player === undefined) {
    throw new Error(`Joueur inconnu dans l'etat : ${id}`);
  }

  return player;
}

/** Remplace un joueur sans muter l'etat (ADR 0007). */
export function updatePlayer(
  state: GameState,
  id: PlayerId,
  patch: Partial<Omit<PlayerState, 'id'>>,
): GameState {
  return { ...state, players: { ...state.players, [id]: { ...getPlayer(state, id), ...patch } } };
}

/** Retire une cle d'un dictionnaire sans le muter. */
export function omitKey<T>(record: Readonly<Record<string, T>>, key: string): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([entry]) => entry !== key));
}

/** Les vivants qui portent ce role, dans l'ordre des places. */
export function livingWithRole(state: GameState, role: RoleId): PlayerId[] {
  return alivePlayers(state)
    .filter((player) => player.role === role)
    .map((player) => player.id);
}
