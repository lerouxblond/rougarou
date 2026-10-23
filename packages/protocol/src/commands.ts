import { z } from 'zod';

import { compositionSchema, playerIdSchema, roleIdSchema } from './ids.ts';
import { gameOptionsSchema } from './options.ts';
import { displayNameSchema } from './rest.ts';

/**
 * Qui envoie la commande.
 *
 * Le serveur le deduit du socket authentifie, jamais du message du client
 * (`docs/04` §Securite) : l'enveloppe est construite par le Durable Object.
 * `system` designe le serveur lui-meme (fin d'un minuteur, `R-14`).
 */
export const actorSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('narrator') }),
  z.strictObject({ kind: z.literal('player'), playerId: playerIdSchema }),
  z.strictObject({ kind: z.literal('system') }),
]);

export type Actor = z.infer<typeof actorSchema>;

/** Une action de nuit. Chaque role qui agit la nuit ajoute son cas. */
export const nightActionSchema = z.discriminatedUnion('kind', [
  /** Vote d'un loup pour la victime de la nuit (`R-34`). */
  z.strictObject({ kind: z.literal('wolfVote'), target: playerIdSchema }),
  /** La Voyante sonde un joueur (`docs/02`). */
  z.strictObject({ kind: z.literal('seerProbe'), target: playerIdSchema }),
  /**
   * La Sorciere repond en une fois (`docs/02`) : potion de vie sur la victime
   * des loups, potion de mort sur `kill`. Ne rien faire : `false` et `null`.
   */
  z.strictObject({
    kind: z.literal('witchPotions'),
    save: z.boolean(),
    kill: playerIdSchema.nullable(),
  }),
  /** Cupidon designe deux amoureux distincts, lui compris (`docs/02`). */
  z.strictObject({
    kind: z.literal('cupidLink'),
    lovers: z.tuple([playerIdSchema, playerIdSchema]),
  }),
  /** Un amoureux confirme avoir decouvert l'autre. */
  z.strictObject({ kind: z.literal('loversConfirm') }),
  /** La Petite fille espionne la meute (`docs/02`) : elle prend le risque d'etre reperee. */
  z.strictObject({ kind: z.literal('spy') }),
]);

export type NightAction = z.infer<typeof nightActionSchema>;

/**
 * Un bulletin : un joueur, « Epargner » (`R-36`) ou l'abstention (`R-30`,
 * option `allowAbstain`).
 */
export const ballotSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('player'), playerId: playerIdSchema }),
  z.strictObject({ kind: z.literal('spare') }),
  z.strictObject({ kind: z.literal('abstain') }),
]);

export type Ballot = z.infer<typeof ballotSchema>;

/**
 * Les commandes du moteur : des intentions, a l'imperatif (`docs/09`).
 * Le moteur verifie ensuite que l'acteur a le droit de les envoyer.
 */
export const commandSchema = z.discriminatedUnion('type', [
  // Salon
  z.strictObject({ type: z.literal('JoinGame'), name: displayNameSchema }),
  z.strictObject({ type: z.literal('LeaveGame') }),
  z.strictObject({ type: z.literal('KickPlayer'), playerId: playerIdSchema }),
  z.strictObject({ type: z.literal('ReorderSeats'), order: z.array(playerIdSchema).max(24) }),
  // Configuration et distribution
  z.strictObject({ type: z.literal('SetOptions'), options: gameOptionsSchema }),
  z.strictObject({ type: z.literal('SetComposition'), composition: compositionSchema }),
  z.strictObject({ type: z.literal('Deal') }),
  z.strictObject({ type: z.literal('ConfirmRoleSeen') }),
  // Pilotage du meneur
  z.strictObject({ type: z.literal('AdvancePhase'), force: z.boolean().default(false) }),
  z.strictObject({ type: z.literal('Undo') }),
  // Minuteur en cours (`R-16`)
  z.strictObject({ type: z.literal('PauseTimer') }),
  z.strictObject({ type: z.literal('ResumeTimer') }),
  z.strictObject({ type: z.literal('ExtendTimer') }),
  // Nuit
  z.strictObject({ type: z.literal('SubmitNightAction'), action: nightActionSchema }),
  z.strictObject({ type: z.literal('ResolveWolfTie'), target: playerIdSchema }),
  // Maire
  z.strictObject({ type: z.literal('DeclareCandidacy') }),
  z.strictObject({ type: z.literal('WithdrawCandidacy') }),
  z.strictObject({ type: z.literal('DesignateSuccessor'), playerId: playerIdSchema }),
  // Effets a la mort (`R-42`)
  z.strictObject({ type: z.literal('HunterShoot'), playerId: playerIdSchema }),
  // Mode correction du meneur (`R-18`)
  z.strictObject({ type: z.literal('CorrectKill'), playerId: playerIdSchema }),
  z.strictObject({ type: z.literal('CorrectRevive'), playerId: playerIdSchema }),
  z.strictObject({ type: z.literal('CorrectRole'), playerId: playerIdSchema, role: roleIdSchema }),
  // Votes
  z.strictObject({ type: z.literal('CastVote'), ballot: ballotSchema }),
  z.strictObject({ type: z.literal('BreakTie'), playerId: playerIdSchema }),
  // Serveur
  z.strictObject({ type: z.literal('Timeout') }),
]);

export type Command = z.infer<typeof commandSchema>;

/** Une commande avant validation : les champs qui ont un defaut sont facultatifs. */
export type CommandInput = z.input<typeof commandSchema>;

/** Le type d'une commande. */
export type CommandType = Command['type'];

/** Une commande et son auteur, telles que le moteur les recoit. */
export const commandEnvelopeSchema = z.strictObject({
  actor: actorSchema,
  cmd: commandSchema,
});

export type CommandEnvelope = z.infer<typeof commandEnvelopeSchema>;
