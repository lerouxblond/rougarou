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

/**
 * Un effet a la mort en attente (`R-42`) : public, puisque la mort l'est. Le
 * tir du Chasseur revele donc son role (`R-45`).
 */
const pendingSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('hunterShot'), from: playerIdSchema }),
  z.strictObject({ kind: z.literal('mayorSuccession'), from: playerIdSchema }),
]);

/** Issue d'une partie (`docs/01` §1) : un camp, le couple mixte (`R-03`) ou personne. */
export const winnerSchema = z.union([teamIdSchema, z.literal('lovers'), z.literal('nobody')]);

export type Winner = z.infer<typeof winnerSchema>;

/** Numero d'une nuit. */
const nightNumberSchema = z.int().min(1);

/**
 * Un pseudo partiellement devoile (`docs/02`, Petite fille) : une case par
 * caractere, `null` quand il est cache. Les espaces restent visibles.
 */
export const maskSchema = z.array(z.string().min(1).max(2).nullable());

/**
 * Une information privee, rangee dans l'etat et envoyee a son seul
 * destinataire par sa vue (`me.knowledge`, ADR 0010).
 */
export const knowledgeSchema = z.discriminatedUnion('kind', [
  /** Voyante, `seerMode: 'role'` : le role du joueur sonde. */
  z.strictObject({
    kind: z.literal('seerRole'),
    night: nightNumberSchema,
    playerId: playerIdSchema,
    role: roleIdSchema,
  }),
  /** Voyante, `seerMode: 'team'` : son camp effectif. */
  z.strictObject({
    kind: z.literal('seerTeam'),
    night: nightNumberSchema,
    playerId: playerIdSchema,
    team: teamIdSchema,
  }),
  /** Cupidon : le couple qu'il a forme, sans les roles. */
  z.strictObject({ kind: z.literal('couple'), players: z.tuple([playerIdSchema, playerIdSchema]) }),
  /** Un amoureux : son partenaire et le role de celui-ci. */
  z.strictObject({ kind: z.literal('lover'), playerId: playerIdSchema, role: roleIdSchema }),
  /** Petite fille : les pseudos partiels des loups vus une nuit. */
  z.strictObject({
    kind: z.literal('wolfGlimpse'),
    night: nightNumberSchema,
    masks: z.array(maskSchema),
  }),
  /** Loups : la Petite fille, reperee, est l'un de ces joueurs. */
  z.strictObject({
    kind: z.literal('littleGirlSuspects'),
    night: nightNumberSchema,
    players: playerIdList,
  }),
]);

export type Knowledge = z.infer<typeof knowledgeSchema>;

/**
 * Une action de nuit proposee : son genre et ses choix possibles. Chaque role
 * qui agit la nuit ajoute son cas.
 */
const nightActionDescriptorSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    type: z.literal('SubmitNightAction'),
    kind: z.literal('wolfVote'),
    targets: playerIdList,
  }),
  z.strictObject({
    type: z.literal('SubmitNightAction'),
    kind: z.literal('seerProbe'),
    targets: playerIdList,
  }),
  z.strictObject({
    type: z.literal('SubmitNightAction'),
    kind: z.literal('witchPotions'),
    /** La potion de vie peut sauver la victime des loups. */
    canSave: z.boolean(),
    /** Cibles de la potion de mort, vide si elle est bue. */
    killTargets: playerIdList,
  }),
  z.strictObject({
    type: z.literal('SubmitNightAction'),
    kind: z.literal('cupidLink'),
    targets: playerIdList,
  }),
  z.strictObject({ type: z.literal('SubmitNightAction'), kind: z.literal('loversConfirm') }),
]);

/**
 * Une action possible pour celui qui regarde : le client en tire ses boutons,
 * et le moteur l'accepterait (`availableActions`).
 */
export const actionDescriptorSchema = z.discriminatedUnion('type', [
  // Joueur
  z.strictObject({ type: z.literal('JoinGame') }),
  z.strictObject({ type: z.literal('LeaveGame') }),
  z.strictObject({ type: z.literal('ConfirmRoleSeen') }),
  nightActionDescriptorSchema,
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
  z.strictObject({ type: z.literal('HunterShoot'), targets: playerIdList }),
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
  /** Ses infos privees, « Mes infos » (ADR 0010). */
  knowledge: z.array(knowledgeSchema),
});

/** Les potions qui restent a une Sorciere. */
const potionsSchema = z.strictObject({ life: z.boolean(), death: z.boolean() });

/**
 * L'etape de nuit, vue seulement par ceux qui y agissent ou la regardent.
 * Chaque etape a sa forme.
 */
const playerNightSchema = z.discriminatedUnion('step', [
  z.strictObject({
    step: z.literal('wolves'),
    resolved: z.boolean(),
    /** Votes de la meute, visibles des seuls loups (`docs/12` #7). */
    wolfVotes: z.record(playerIdSchema, playerIdSchema),
  }),
  /** La Voyante : son resultat entre dans ses infos. */
  z.strictObject({ step: z.literal('seer'), resolved: z.boolean() }),
  /** La Sorciere : la victime des loups (ou personne) et ses potions restantes. */
  z.strictObject({
    step: z.literal('witch'),
    resolved: z.boolean(),
    victim: playerIdSchema.nullable(),
    potions: potionsSchema,
  }),
  /** Cupidon : le couple entre dans ses infos. */
  z.strictObject({ step: z.literal('cupid'), resolved: z.boolean() }),
  /** Un amoureux decouvre l'autre et confirme. */
  z.strictObject({
    step: z.literal('lovers'),
    resolved: z.boolean(),
    partner: playerIdSchema,
    confirmed: z.boolean(),
  }),
]);

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
  winner: winnerSchema.nullable(),
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
  knowledge: z.array(knowledgeSchema),
});

const narratorNightSchema = z.strictObject({
  number: z.int().min(1),
  steps: z.array(z.string()),
  current: z.int().min(0),
  stepResolved: z.boolean(),
  wolfVotes: z.record(playerIdSchema, playerIdSchema),
  wolfTie: playerIdList.nullable(),
  wolfVictim: playerIdSchema.nullable(),
  /** Le choix de la Sorciere cette nuit, une fois fait. */
  witch: z.strictObject({ save: z.boolean(), kill: playerIdSchema.nullable() }).nullable(),
});

const deathSchema = z.strictObject({
  playerId: playerIdSchema,
  cause: z.enum(['wolves', 'witch', 'vote', 'hunter', 'grief']),
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
  /** Le couple forme par Cupidon (`R-03`). */
  lovers: z.tuple([playerIdSchema, playerIdSchema]).nullable(),
  /** Potions restantes de chaque Sorciere. */
  potions: z.record(playerIdSchema, potionsSchema),
  dawn: z.strictObject({ deaths: z.array(deathSchema), announced: z.boolean() }).nullable(),
  election: playerElectionSchema.nullable(),
  vote: playerVoteSchema.nullable(),
  pending: z.array(pendingSchema),
  winner: winnerSchema.nullable(),
  /** Tous les votants ont vote : le bouton de cloture le signale (`R-37`). */
  everyoneVoted: z.boolean(),
  actions: z.array(actionDescriptorSchema),
});

export type NarratorView = z.infer<typeof narratorViewSchema>;
