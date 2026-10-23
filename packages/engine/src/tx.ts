import type { TimerKey } from '@rougarou/protocol';

import type { GameEvent } from './events.ts';
import { evolve } from './evolve.ts';
import { journalFact } from './journal.ts';
import type { EngineError, EngineErrorCode } from './result.ts';
import type { Rng } from './rng.ts';
import type { GameState } from './state.ts';

/**
 * Ce que le moteur recoit de l'exterieur : l'heure et l'alea sont injectes
 * (`CLAUDE.md` regle 3).
 */
export interface Context {
  /** Horloge du serveur, en millisecondes. */
  readonly now: number;
  readonly rng: Rng;
}

/**
 * Une transaction : la suite des evenements produits par une commande.
 *
 * Chaque evenement emis est applique aussitot par `evolve`, donc la suite de
 * la decision voit l'etat a jour, et l'etat final est par construction celui
 * que donnerait le rejeu du journal (ADR 0002). La transaction est locale a
 * `apply` : l'etat d'entree n'est jamais modifie.
 */
export interface Tx {
  readonly ctx: Context;
  readonly state: GameState;
  readonly events: readonly GameEvent[];
  emit(event: GameEvent): void;
}

export function createTx(initial: GameState, ctx: Context): Tx {
  let state = initial;
  const events: GameEvent[] = [];

  return {
    ctx,
    get state() {
      return state;
    },
    events,
    emit(event) {
      state = evolve(state, event);
      events.push(event);

      // Le journal suit le fait, dans le meme groupe : `Undo` retire les deux (`R-11`, `R-19`).
      const fact = journalFact(event);

      if (fact !== null) {
        const journaled: GameEvent = {
          type: 'Journaled',
          entry: { at: ctx.now, night: state.nightNumber, phase: state.phase, fact },
        };

        state = evolve(state, journaled);
        events.push(journaled);
      }
    },
  };
}

/**
 * Ce qui fait avancer une phase : le bouton du meneur (`advance`), un
 * forcage (`force`, journalise, `R-10`) ou la fin du minuteur (`timeout`,
 * `R-14`). Les deux derniers appliquent les valeurs par defaut de `R-13`.
 */
export type Push = 'advance' | 'force' | 'timeout';

/** Une erreur metier. Sans cle explicite, la cle i18n derive du code. */
export function engineError(code: EngineErrorCode, messageKey?: string): EngineError {
  return { code, messageKey: messageKey ?? `errors.${code.toLowerCase()}` };
}

/** Lance le minuteur `key` sur l'action en cours (`R-14`). */
export function startTimer(tx: Tx, key: TimerKey): void {
  const seconds = tx.state.options.timers[key];
  const deadline = seconds === null ? null : tx.ctx.now + seconds * 1000;

  if (deadline !== tx.state.deadline || tx.state.pausedRemaining !== null) {
    tx.emit({ type: 'DeadlineSet', deadline });
  }
}

/** Arrete le minuteur en cours, s'il y en a un, meme en pause. */
export function clearTimer(tx: Tx): void {
  if (tx.state.deadline !== null || tx.state.pausedRemaining !== null) {
    tx.emit({ type: 'DeadlineSet', deadline: null });
  }
}
