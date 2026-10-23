import type { Actor, Ballot, Command, CommandEnvelope } from '@rougarou/protocol';

import { requireNarrator, requireSystem } from './auth.ts';
import { designateSuccessor, hunterShoot } from './deaths.ts';
import type { GameEvent } from './events.ts';
import { evolve } from './evolve.ts';
import { advanceNight, narratorResolveWolfTie, submitNightAction } from './night/flow.ts';
import { compositionIssues, deal, setComposition, setOptions } from './phases/config.ts';
import { advanceDawn } from './phases/dawn.ts';
import {
  advanceExecution,
  advanceVillageVote,
  breakTie,
  castVillageVote,
  openVillageVote,
} from './phases/day.ts';
import { advanceDeal, confirmRoleSeen } from './phases/deal.ts';
import { advanceElection, castElectionVote, setCandidacy } from './phases/election.ts';
import { joinGame, kickPlayer, leaveGame, openConfig, reorderSeats } from './phases/lobby.ts';
import { succeed, type EngineError, type Result } from './result.ts';
import { extendTimer, pauseTimer, resumeTimer } from './timers.ts';
import { emptyState, type GameState } from './state.ts';
import { createTx, engineError, type Context, type Push, type Tx } from './tx.ts';

/** Resultat d'une commande appliquee a une partie. */
export type ApplyResult = Result<GameState, GameEvent>;

/**
 * Cree une partie vide, dans le salon. C'est le premier evenement du journal.
 */
export function createGame(gameId: string): { state: GameState; events: GameEvent[] } {
  const event: GameEvent = { type: 'GameCreated', gameId };

  return { state: evolve(emptyState(), event), events: [event] };
}

/**
 * Applique une commande : `(state, command) => { state, events } | error`
 * (`CLAUDE.md` regle 3).
 *
 * Les erreurs metier sont renvoyees, jamais levees (`docs/09`). L'etat
 * d'entree n'est jamais modifie (ADR 0007).
 */
export function apply(state: GameState, envelope: CommandEnvelope, ctx: Context): ApplyResult {
  const tx = createTx(state, ctx);
  const error = dispatch(tx, envelope.actor, envelope.cmd);

  return error === null ? succeed(tx.state, [...tx.events]) : { ok: false, error };
}

function dispatch(tx: Tx, actor: Actor, cmd: Command): EngineError | null {
  if (tx.state.phase === 'ENDED') {
    return engineError('WRONG_PHASE');
  }

  switch (cmd.type) {
    case 'JoinGame':
      return joinGame(tx, actor, cmd.name);
    case 'LeaveGame':
      return leaveGame(tx, actor);
    case 'KickPlayer':
      return requireNarrator(actor) ?? kickPlayer(tx, cmd.playerId);
    case 'ReorderSeats':
      return requireNarrator(actor) ?? reorderSeats(tx, cmd.order);
    case 'SetOptions':
      return requireNarrator(actor) ?? setOptions(tx, cmd.options);
    case 'SetComposition':
      return requireNarrator(actor) ?? setComposition(tx, cmd.composition);
    case 'Deal':
      return requireNarrator(actor) ?? deal(tx);
    case 'ConfirmRoleSeen':
      return confirmRoleSeen(tx, actor);
    case 'AdvancePhase':
      return requireNarrator(actor) ?? advancePhase(tx, cmd.force ? 'force' : 'advance');
    case 'PauseTimer':
      return requireNarrator(actor) ?? pauseTimer(tx);
    case 'ResumeTimer':
      return requireNarrator(actor) ?? resumeTimer(tx);
    case 'ExtendTimer':
      return requireNarrator(actor) ?? extendTimer(tx);
    case 'Undo':
      // L'annulation reecrit le journal : elle passe par `GameRecord` (`R-11`).
      return engineError('INVALID_COMMAND', 'errors.undo_needs_record');
    case 'SubmitNightAction':
      return submitNightAction(tx, actor, cmd.action);
    case 'ResolveWolfTie':
      return requireNarrator(actor) ?? narratorResolveWolfTie(tx, cmd.target);
    case 'DeclareCandidacy':
      return inPhase(tx, 'MAYOR_ELECTION') ?? setCandidacy(tx, actor, true);
    case 'WithdrawCandidacy':
      return inPhase(tx, 'MAYOR_ELECTION') ?? setCandidacy(tx, actor, false);
    case 'DesignateSuccessor':
      return designateSuccessor(tx, actor, cmd.playerId);
    case 'HunterShoot':
      return hunterShoot(tx, actor, cmd.playerId);
    case 'CastVote':
      return castVote(tx, actor, cmd.ballot);
    case 'BreakTie':
      return inPhase(tx, 'DAY_VOTE') ?? breakTie(tx, actor, cmd.playerId);
    case 'Timeout':
      return requireSystem(actor) ?? timeout(tx);
  }
}

function inPhase(tx: Tx, phase: GameState['phase']): EngineError | null {
  return tx.state.phase === phase ? null : engineError('WRONG_PHASE');
}

function castVote(tx: Tx, actor: Actor, ballot: Ballot): EngineError | null {
  switch (tx.state.phase) {
    case 'DAY_VOTE':
      return castVillageVote(tx, actor, ballot);
    case 'MAYOR_ELECTION':
      return castElectionVote(tx, actor, ballot);
    default:
      return engineError('WRONG_PHASE');
  }
}

/** Le bouton principal du meneur (`docs/12` §1), le forcage, ou la fin d'un minuteur. */
function advancePhase(tx: Tx, push: Push): EngineError | null {
  switch (tx.state.phase) {
    case 'LOBBY':
      return openConfig(tx);
    case 'DEAL':
      return advanceDeal(tx, push);
    case 'NIGHT':
      return advanceNight(tx, push);
    case 'DAWN':
      return advanceDawn(tx, push);
    case 'MAYOR_ELECTION':
      return advanceElection(tx);
    case 'DAY_DEBATE':
      return openVillageVote(tx);
    case 'DAY_VOTE':
      return advanceVillageVote(tx, push);
    case 'EXECUTION':
      return advanceExecution(tx, push);
    default:
      // CONFIG : on en sort par « Distribuer ». PRESENTATIONS : role play (M5).
      return engineError('WRONG_PHASE');
  }
}

/**
 * Fin du minuteur en cours (`R-14`) : refusee avant l'echeance. L'action en
 * attente prend sa valeur par defaut (`R-13`).
 */
function timeout(tx: Tx): EngineError | null {
  const { deadline } = tx.state;

  if (deadline === null) {
    return engineError('INVALID_COMMAND', 'errors.nothing_to_expire');
  }

  if (tx.ctx.now < deadline) {
    return engineError('TOO_EARLY');
  }

  tx.emit({ type: 'TimerExpired', phase: tx.state.phase });
  return advancePhase(tx, 'timeout');
}

export { compositionIssues };
