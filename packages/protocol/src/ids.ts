import { z } from './zod.ts';

/**
 * Identifiant d'un joueur dans une partie.
 *
 * C'est l'identifiant de l'utilisateur (compte ou invite, D-04). Le moteur ne
 * l'interprete pas : il ne sert qu'a designer un joueur. Le prefixe `@` est
 * reserve aux choix qui ne sont pas des joueurs (« Epargner » dans un decompte).
 */
export const playerIdSchema = z.string().min(1).max(64).regex(/^[^@]/);

export type PlayerId = z.infer<typeof playerIdSchema>;

/**
 * Tous les roles du catalogue (`docs/02`), y compris ceux qui ne sont pas
 * encore implementes : la composition peut les nommer, et c'est le moteur qui
 * refuse un role absent de son registre ou du mode choisi.
 */
export const ROLE_IDS = [
  'werewolf',
  'villager',
  'seer',
  'witch',
  'hunter',
  'cupid',
  'little-girl',
  'guardian',
  'elder',
  'village-idiot',
  'scapegoat',
  'white-werewolf',
  'infect-wolf',
  'big-bad-wolf',
  'wild-child',
  'wolf-hound',
  'fox',
  'raven',
  'sister',
  'brother',
  'bear-tamer',
  'rusty-knight',
  'piper',
  'angel',
  'devoted-servant',
  'thief',
  'vampire',
] as const;

export const roleIdSchema = z.enum(ROLE_IDS);

export type RoleId = z.infer<typeof roleIdSchema>;

/** Modes de jeu (`docs/11`). */
export const MODE_IDS = ['classic', 'white-night', 'vampire'] as const;

export const modeIdSchema = z.enum(MODE_IDS);

export type ModeId = z.infer<typeof modeIdSchema>;

/** Camps (`docs/01` §1, `docs/11`). */
export const TEAM_IDS = ['village', 'wolves', 'solo', 'vampires'] as const;

export const teamIdSchema = z.enum(TEAM_IDS);

export type TeamId = z.infer<typeof teamIdSchema>;

/** Phases d'une partie (`docs/01` §2). */
export const PHASES = [
  'LOBBY',
  'CONFIG',
  'DEAL',
  'PRESENTATIONS',
  'NIGHT',
  'DAWN',
  'MAYOR_ELECTION',
  'DAY_DEBATE',
  'DAY_VOTE',
  'EXECUTION',
  'ENDED',
] as const;

export const phaseSchema = z.enum(PHASES);

export type Phase = z.infer<typeof phaseSchema>;

/**
 * Composition : nombre d'exemplaires de chaque role. Un role absent vaut 0.
 */
export const compositionSchema = z.partialRecord(roleIdSchema, z.int().min(1).max(24));

export type Composition = z.infer<typeof compositionSchema>;
