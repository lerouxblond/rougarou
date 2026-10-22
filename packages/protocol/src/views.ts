import { z } from 'zod';

import { ballotSchema } from './commands.ts';
import {
  compositionSchema,
  phaseSchema,
  playerIdSchema,
  roleIdSchema,
  teamIdSchema,
} from './ids.ts';
import { gameOptionsSchema } from './options.ts';

/**
 * Vues projetees : ce qui part vers un client (`docs/04`, ADR 0008).
 *
 * Tous les objets sont stricts : une cle que la projection ajouterait par
 * erreur fait echouer la validation, donc les tests de non-fuite, au lieu de
 * partir en silence vers un joueur (`CLAUDE.md` regle 2).
 */

const playerIdList = z.array(playerIdSchema);

/** Issue publique d'un vote du village (`R-33`, `R-36`, `R-38`). */
export const voteOutcomeSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('execute'), playerId: playerIdSchema }),
  z.strictObject({
    kind: z.literal('nobody'),
    reason: z.enum(['spare', 'noBallots', 'tie']),
  }),
  z.strictObject({ kind: z.literal('tie'), tied: playerIdList }),
]);

export type VoteOutcome = z.infer<typeof voteOutcomeSchema>;

/** Un decompte : voix par joueur, et `@spare` pour « Epargner ». */
const tallySchema = z.record(z.string(), z.int().min(0));

/** Un effet a la mort en attente : public, puisque la mort l'est. */
const pendingSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('mayorSuccession'), from: playerIdSchema }),
]);

/** Ce qu'un spectateur de la partie sait du vainqueur. */
const winnerSchema = z.union([teamIdSchema, z.literal('nobody')]).nullable();

/**
 * Une action possible pour celui qui regarde : le client en tire ses boutons,
 * et le moteur l'accepterait (`availableActions`).
 */
export const actionDescriptorSchema = z.discriminatedUnion('type', [
  // Joueur
  z.strictObject({ type: z.literal('JoinGame') }),
  z.strictObject({ type: z.literal('LeaveGame') }),
  z.strictObject({ type: z.literal('ConfirmRoleSeen') }),
  z.strictObject({
    type: z.literal('SubmitNightAction'),
    kind: z.literal('wolfVote'),
    targets: playerIdList,
  }),
  z.strictObject({ type: z.literal('DeclareCandidacy') }),
  z.strictObject({ type: z.literal('WithdrawCandidacy') }),
  z.strictObject({
    type: z.literal('CastVote'),
    targets: playerIdList,
    spare: z.boolean(),
    abstain: z.boolean(),
  }),
  z.strictObject({ type: z.literal('BreakTie'), targets: playerIdList }),
  z.strictObject({ type: z.literal('DesignateSuccessor'), targets: playerIdList }),
  // Meneur
  z.strictObject({ type: z.literal('KickPlayer'), targets: playerIdList }),
  z.strictObject({ type: z.literal('ReorderSeats') }),
  z.strictObject({ type: z.literal('SetOptions') }),
  z.strictObject({ type: z.literal('SetComposition') }),
  z.strictObject({ type: z.literal('Deal'), issues: z.array(z.string()) }),
  z.strictObject({
    type: z.literal('AdvancePhase'),
    /** Des actions attendent : il faut forcer (`R-10`). */
    blocked: z.boolean(),
  }),
  z.strictObject({ type: z.literal('ResolveWolfTie'), targets: playerIdList }),
  z.strictObject({ type: z.literal('PauseTimer') }),
  z.strictObject({ type: z.literal('ResumeTimer') }),
  z.strictObject({ type: z.literal('ExtendTimer') }),
]);

export type ActionDescriptor = z.infer<typeof actionDescriptorSchema>;

// --- Vue d'un joueur -------------------------------------------------------

/** Un joueur tel qu'un autre le voit. `role` n'est rempli que si le lecteur a le droit de le connaitre. */
const seenPlayerSchema = z.strictObject({
  id: playerIdSchema,
  name: z.string(),
  alive: z.boolean(),
  mayor: z.boolean(),
  role: roleIdSchema.nullable(),
});

/** Ce que le lecteur sait de lui-meme. */
const selfSchema = z.strictObject({
  id: playerIdSchema,
  role: roleIdSchema.nullable(),
  alive: z.boolean(),
  roleSeen: z.boolean(),
});

/** L'etape de nuit, vue seulement par ceux qui y agissent. */
const playerNightSchema = z.strictObject({
  step: z.literal('wolves'),
  resolved: z.boolean(),
  /** Votes de la meute, visibles des seuls loups (`docs/12` #7). */
  wolfVotes: z.record(playerIdSchema, playerIdSchema),
});

const playerElectionSchema = z.strictObject({
  stage: z.enum(['candidacy', 'vote']),
  candidates: playerIdList,
  eligible: playerIdList,
  round: z.union([z.literal(1), z.literal(2)]),
  /** Tous les bulletins en vote public, le sien seul en vote secret (`R-30`). */
  ballots: z.record(playerIdSchema, playerIdSchema),
});

const playerVoteSchema = z.strictObject({
  candidates: playerIdList,
  spare: z.boolean(),
  round: z.union([z.literal(1), z.literal(2)]),
  tie: playerIdList.nullable(),
  closed: z.boolean(),
  ballots: z.record(playerIdSchema, ballotSchema),
  /** Le decompte n'est montre qu'en vote public ; l'issue l'est toujours. */
  tally: tallySchema.nullable(),
  outcome: voteOutcomeSchema.nullable(),
});

export const playerViewSchema = z.strictObject({
  kind: z.literal('player'),
  gameId: z.string(),
  /** Avant « Lever le jour », l'aube est encore la nuit pour les joueurs (`R-12`). */
  phase: phaseSchema,
  /** `null` pour quelqu'un qui n'est pas (ou plus) a la table. */
  me: selfSchema.nullable(),
  players: z.array(seenPlayerSchema),
  options: gameOptionsSchema,
  composition: compositionSchema,
  nightNumber: z.int().min(0),
  /** Echeance visible du lecteur : la nuit, seulement s'il agit (`docs/12` §4). */
  deadline: z.int().nullable(),
  /** Duree restante d'un minuteur en pause, en ms, visible aux memes conditions (`R-16`). */
  pausedRemaining: z.int().min(0).nullable(),
  night: playerNightSchema.nullable(),
  /** Morts de la nuit, une fois annoncees ; la cause n'est jamais publique. */
  deaths: playerIdList.nullable(),
  election: playerElectionSchema.nullable(),
  vote: playerVoteSchema.nullable(),
  pending: z.array(pendingSchema),
  winner: winnerSchema,
  actions: z.array(actionDescriptorSchema),
});

export type PlayerView = z.infer<typeof playerViewSchema>;

// --- Vue du meneur ---------------------------------------------------------

const narratorPlayerSchema = z.strictObject({
  id: playerIdSchema,
  name: z.string(),
  alive: z.boolean(),
  mayor: z.boolean(),
  role: roleIdSchema.nullable(),
  roleSeen: z.boolean(),
  roleRevealed: z.boolean(),
});

const narratorNightSchema = z.strictObject({
  number: z.int().min(1),
  steps: z.array(z.string()),
  current: z.int().min(0),
  stepResolved: z.boolean(),
  wolfVotes: z.record(playerIdSchema, playerIdSchema),
  wolfTie: playerIdList.nullable(),
  wolfVictim: playerIdSchema.nullable(),
});

const deathSchema = z.strictObject({
  playerId: playerIdSchema,
  cause: z.enum(['wolves', 'vote']),
});

export const narratorViewSchema = z.strictObject({
  kind: z.literal('narrator'),
  gameId: z.string(),
  phase: phaseSchema,
  players: z.array(narratorPlayerSchema),
  options: gameOptionsSchema,
  composition: compositionSchema,
  nightNumber: z.int().min(0),
  deadline: z.int().nullable(),
  pausedRemaining: z.int().min(0).nullable(),
  night: narratorNightSchema.nullable(),
  dawn: z.strictObject({ deaths: z.array(deathSchema), announced: z.boolean() }).nullable(),
  election: playerElectionSchema.nullable(),
  vote: playerVoteSchema.nullable(),
  pending: z.array(pendingSchema),
  winner: winnerSchema,
  /** Tous les votants ont vote : le bouton de cloture le signale (`R-37`). */
  everyoneVoted: z.boolean(),
  actions: z.array(actionDescriptorSchema),
});

export type NarratorView = z.infer<typeof narratorViewSchema>;
