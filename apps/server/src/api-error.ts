import { apiErrorSchema, type ApiError, type ErrorCode } from '@rougarou/protocol';

/**
 * Corps d'une reponse d'erreur : un code et sa cle i18n, jamais un texte
 * (`CLAUDE.md` regle 6). Il est valide par le schema partage avant de partir.
 */
export function apiError(code: ErrorCode): ApiError {
  return apiErrorSchema.parse({ code, messageKey: `errors.${code.toLowerCase()}` });
}
