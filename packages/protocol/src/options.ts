import { z } from 'zod';

import { modeIdSchema } from './ids.ts';

/**
 * Une duree de minuteur en secondes, ou `null` pour « pas de minuteur » : le
 * meneur avance alors lui-meme (`docs/12` §4).
 */
const timerSchema = z.int().min(5).max(3600).nullable();

/**
 * Minuteurs de la partie, avec les valeurs par defaut de D-02 (`docs/12` §4) :
 * actifs seulement sur les actions, jamais sur le debat ni les presentations.
 */
export const timersSchema = z.strictObject({
  roleReveal: timerSchema.default(null),
  characterSheet: timerSchema.default(null),
  presentation: timerSchema.default(null),
  nightAction: timerSchema.default(45),
  wolfVote: timerSchema.default(90),
  hunterShot: timerSchema.default(30),
  mayorSuccessor: timerSchema.default(30),
  tieBreak: timerSchema.default(30),
  mayorCandidacy: timerSchema.default(60),
  mayorVote: timerSchema.default(90),
  debate: timerSchema.default(null),
  dayVote: timerSchema.default(60),
});

export type Timers = z.infer<typeof timersSchema>;

/** Nom d'un minuteur. */
export type TimerKey = keyof Timers;

/**
 * Risque pour la Petite fille d'etre reperee (`docs/02`), en points de % : la
 * n-ieme nuit ou elle espionne, `min(base + (n - 1) * increase, 75)`.
 */
export const littleGirlRiskSchema = z.strictObject({
  base: z.int().min(0).max(50).default(10),
  increase: z.int().min(0).max(25).default(10),
});

export type LittleGirlRisk = z.infer<typeof littleGirlRiskSchema>;

/**
 * Options d'une partie (`docs/01` §8), source unique pour le moteur et l'ecran
 * de configuration (ADR 0008).
 *
 * Chaque cle a une valeur par defaut : `{}` donne une configuration complete.
 * Une cle inconnue est refusee.
 */
export const gameOptionsSchema = z.strictObject({
  playMode: z.enum(['inPerson', 'remote']).default('inPerson'),
  gameMode: modeIdSchema.default('classic'),
  mayor: z.boolean().default(true),
  dealMode: z.enum(['simultaneous', 'ceremony']).default('simultaneous'),
  pilotMode: z.enum(['manual', 'assisted']).default('assisted'),
  roleplay: z.boolean().default(false),
  mayorSuccession: z.enum(['designate', 'reelect']).default('designate'),
  revealRoleOnDeath: z.boolean().default(true),
  deadSeeRoles: z.boolean().default(true),
  voteVisibility: z.enum(['public', 'secret']).default('public'),
  allowAbstain: z.boolean().default(false),
  allowSpare: z.boolean().default(true),
  tieBreak: z.enum(['mayor', 'revote', 'nobody']).default('mayor'),
  wolfVoteMode: z.enum(['unanimous', 'majority']).default('unanimous'),
  wolvesWinOnParity: z.boolean().default(false),
  seerMode: z.enum(['role', 'team']).default('role'),
  littleGirlRisk: littleGirlRiskSchema.prefault({}),
  witchSelfSave: z.enum(['never', 'firstNightOnly', 'always']).default('firstNightOnly'),
  /**
   * `true` par defaut en presentiel, `false` a distance (`R-20`). Absente,
   * elle suit `playMode` : voir `resolveFakeWake`.
   */
  fakeWakeForDeadRoles: z.boolean().optional(),
  parallelNight: z.boolean().default(false),
  timers: timersSchema.prefault({}),
});

/** Options completes, une fois les valeurs par defaut appliquees. */
export type GameOptions = z.infer<typeof gameOptionsSchema>;

/** Options telles que le meneur les envoie : toutes facultatives. */
export type GameOptionsInput = z.input<typeof gameOptionsSchema>;

/** Valeur effective de `fakeWakeForDeadRoles` (`R-20`). */
export function resolveFakeWake(options: GameOptions): boolean {
  return options.fakeWakeForDeadRoles ?? options.playMode === 'inPerson';
}
