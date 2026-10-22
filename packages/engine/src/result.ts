/**
 * Resultat d'une commande du moteur.
 *
 * Le moteur suit le schema `(state, command) => { state, events } | error`
 * (`CLAUDE.md` regle 3). Les erreurs metier sont **renvoyees** sous cette
 * forme, jamais levees : on ne leve que sur un invariant viole (`docs/09`).
 *
 * `GameState` et `GameEvent` arrivent au jalon M1 ; ce type est deja generique
 * pour que `apply` n'ait pas a changer de forme a ce moment-la.
 */
export type Result<TState, TEvent> =
  { ok: true; state: TState; events: TEvent[] } | { ok: false; error: EngineError };

/** Codes d'erreur du moteur. Ils sont stables : le client les traduit. */
export type EngineErrorCode =
  | 'FORBIDDEN'
  | 'GAME_FULL'
  | 'INVALID_COMMAND'
  | 'INVALID_COMPOSITION'
  | 'INVALID_TARGET'
  | 'NOT_YOUR_TURN'
  | 'NOTHING_TO_UNDO'
  | 'PENDING_ACTIONS'
  | 'TOO_EARLY'
  | 'UNDO_BLOCKED'
  | 'UNKNOWN_PLAYER'
  | 'UNSUPPORTED_OPTION'
  | 'WRONG_PHASE';

/** Une erreur metier, destinee a etre renvoyee puis traduite par le client. */
export interface EngineError {
  code: EngineErrorCode;
  /**
   * Cle i18n du message affiche. Aucun texte en dur ne sort du moteur
   * (`CLAUDE.md` regle 6).
   */
  messageKey: string;
}

/** Construit un resultat d'echec. */
export function fail(code: EngineErrorCode, messageKey: string): { ok: false; error: EngineError } {
  return { ok: false, error: { code, messageKey } };
}

/** Construit un resultat de succes. */
export function succeed<TState, TEvent>(
  state: TState,
  events: TEvent[],
): { ok: true; state: TState; events: TEvent[] } {
  return { ok: true, state, events };
}
