import { z } from './zod.ts';

/**
 * Codes d'erreur metier du moteur. Ils sont stables : le client les traduit.
 * Le moteur en tire son type `EngineErrorCode`.
 */
export const ENGINE_ERROR_CODES = [
  'FORBIDDEN',
  'GAME_FULL',
  'INVALID_COMMAND',
  'INVALID_COMPOSITION',
  'INVALID_TARGET',
  'NAME_TAKEN',
  'NOT_YOUR_TURN',
  'NOTHING_TO_UNDO',
  'PENDING_ACTIONS',
  'TOO_EARLY',
  'UNDO_BLOCKED',
  'UNKNOWN_PLAYER',
  'UNSUPPORTED_OPTION',
  'WRONG_PHASE',
] as const;

export type EngineErrorCode = (typeof ENGINE_ERROR_CODES)[number];

/** Erreurs du transport et du serveur, qui ne viennent pas du moteur. */
export const TRANSPORT_ERROR_CODES = [
  /** Le client parle une version plus ancienne du protocole (`docs/04`). */
  'PROTOCOL_OUTDATED',
  /** Le message ne respecte pas son schema. */
  'INVALID_MESSAGE',
  /** Plus de 10 commandes par seconde sur ce socket (`docs/04` §Securite). */
  'RATE_LIMITED',
  /** L'utilisateur n'est pas membre de la partie. */
  'NOT_A_MEMBER',
  'UNAUTHENTICATED',
  'NOT_FOUND',
  'CONFLICT',
  'INTERNAL',
] as const;

export const ERROR_CODES = [...ENGINE_ERROR_CODES, ...TRANSPORT_ERROR_CODES] as const;

export const errorCodeSchema = z.enum(ERROR_CODES);

export type ErrorCode = z.infer<typeof errorCodeSchema>;

/**
 * Une erreur porte une cle i18n, jamais un texte : aucun texte en dur ne
 * sort du serveur (`CLAUDE.md` regle 6).
 */
export const messageKeySchema = z.string().regex(/^errors\.[a-z_.]+$/);
