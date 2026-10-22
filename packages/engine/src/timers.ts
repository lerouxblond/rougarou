import type { EngineError } from './result.ts';
import { engineError, type Tx } from './tx.ts';

/** Ce que « +30 s » ajoute au minuteur en cours (`R-16`). */
export const TIMER_EXTENSION_MS = 30_000;

/**
 * Pause, reprise et +30 s du minuteur en cours (`R-16`). Le moteur n'a pas
 * d'horloge : la pause range la duree restante, la reprise en tire une
 * nouvelle echeance a partir de `now`.
 */

export function pauseTimer(tx: Tx): EngineError | null {
  const { deadline, pausedRemaining } = tx.state;

  if (pausedRemaining !== null) {
    return engineError('INVALID_COMMAND', 'errors.timer_paused');
  }

  if (deadline === null) {
    return engineError('INVALID_COMMAND', 'errors.nothing_to_expire');
  }

  tx.emit({ type: 'TimerPaused', remaining: Math.max(0, deadline - tx.ctx.now) });
  return null;
}

export function resumeTimer(tx: Tx): EngineError | null {
  const { pausedRemaining } = tx.state;

  if (pausedRemaining === null) {
    return engineError('INVALID_COMMAND', 'errors.timer_not_paused');
  }

  tx.emit({ type: 'TimerResumed', deadline: tx.ctx.now + pausedRemaining });
  return null;
}

export function extendTimer(tx: Tx): EngineError | null {
  if (tx.state.deadline === null && tx.state.pausedRemaining === null) {
    return engineError('INVALID_COMMAND', 'errors.nothing_to_expire');
  }

  tx.emit({ type: 'TimerExtended', by: TIMER_EXTENSION_MS });
  return null;
}
