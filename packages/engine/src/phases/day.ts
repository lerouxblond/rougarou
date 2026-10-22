import type { Actor, Ballot, PlayerId, VoteOutcome } from '@rougarou/protocol';

import { isError, requireAlivePlayer } from '../auth.ts';
import { killPlayers, settlePendingEffects } from '../deaths.ts';
import { startNight } from '../night/flow.ts';
import type { EngineError } from '../result.ts';
import { alivePlayers, type GameState } from '../state.ts';
import { clearTimer, engineError, startTimer, type Push, type Tx } from '../tx.ts';
import { leaders, SPARE, tallyVillage } from '../votes.ts';
import { startElection } from './election.ts';

/**
 * Debut du jour : election du Maire si elle est due (`R-50`, `R-52`), sinon
 * le debat.
 */
export function startDay(tx: Tx): void {
  const { options, mayor, electionHeld } = tx.state;
  const electionDue =
    options.mayor && mayor === null && (!electionHeld || options.mayorSuccession === 'reelect');

  if (electionDue) {
    startElection(tx);
  } else {
    startDebate(tx);
  }
}

/** Le debat libre, sans minuteur par defaut (D-02). */
export function startDebate(tx: Tx): void {
  clearTimer(tx);
  tx.emit({ type: 'PhaseChanged', phase: 'DAY_DEBATE' });
  startTimer(tx, 'debate');
}

/** « Ouvrir le vote » : tous les vivants sont candidats, avec « Epargner » selon l'option. */
export function openVillageVote(tx: Tx): EngineError | null {
  const candidates = alivePlayers(tx.state).map((player) => player.id);

  tx.emit({ type: 'PhaseChanged', phase: 'DAY_VOTE' });
  tx.emit({ type: 'VoteOpened', candidates, spare: tx.state.options.allowSpare, round: 1 });
  startTimer(tx, 'dayVote');
  return null;
}

/** Un vivant vote, ou change son vote tant que le vote n'est pas clos (`R-30`, `R-31`). */
export function castVillageVote(tx: Tx, actor: Actor, ballot: Ballot): EngineError | null {
  const voter = requireAlivePlayer(tx.state, actor);

  if (isError(voter)) {
    return voter;
  }

  const { vote } = tx.state;

  if (vote === null || vote.closed || vote.tie !== null) {
    return engineError('WRONG_PHASE', 'errors.vote.closed');
  }

  const invalid = ballotError(tx.state, voter.id, ballot);

  if (invalid !== null) {
    return invalid;
  }

  tx.emit({ type: 'VoteCast', voter: voter.id, ballot });
  return null;
}

function ballotError(state: GameState, voter: PlayerId, ballot: Ballot): EngineError | null {
  const vote = state.vote;

  switch (ballot.kind) {
    case 'player':
      if (ballot.playerId === voter) {
        // D-08 : pas de vote contre soi-meme.
        return engineError('INVALID_TARGET', 'errors.vote.self');
      }

      return vote?.candidates.includes(ballot.playerId) === true
        ? null
        : engineError('INVALID_TARGET', 'errors.vote.not_candidate');
    case 'spare':
      return vote?.spare === true ? null : engineError('INVALID_TARGET', 'errors.vote.no_spare');
    case 'abstain':
      return state.options.allowAbstain
        ? null
        : engineError('INVALID_COMMAND', 'errors.vote.no_abstain');
  }
}

/** Issue du vote clos (`R-33`, `R-36`, `R-38`). */
function outcomeOf(state: GameState, ranked: readonly string[]): VoteOutcome {
  if (ranked.length === 0) {
    return { kind: 'nobody', reason: 'noBallots' };
  }

  if (ranked.includes(SPARE)) {
    return { kind: 'nobody', reason: 'spare' };
  }

  const [single] = ranked;

  if (ranked.length === 1 && single !== undefined) {
    return { kind: 'execute', playerId: single };
  }

  if (state.options.tieBreak === 'nobody' || state.vote?.round === 2) {
    return { kind: 'nobody', reason: 'tie' };
  }

  return { kind: 'tie', tied: [...ranked] };
}

/** Le Maire vivant, s'il y en a un. */
function livingMayor(state: GameState): PlayerId | null {
  const { mayor } = state;

  return mayor !== null && state.players[mayor]?.alive === true ? mayor : null;
}

/** Clot le vote et enchaine : execution, egalite tranchee par le Maire, ou second tour. */
function closeVillageVote(tx: Tx): void {
  const tally = tallyVillage(tx.state);
  const outcome = outcomeOf(tx.state, leaders(tx.state, tally));

  clearTimer(tx);
  tx.emit({ type: 'VoteClosed', tally, outcome });

  switch (outcome.kind) {
    case 'execute':
      startExecution(tx, outcome.playerId);
      return;
    case 'nobody':
      startExecution(tx, null);
      return;
    case 'tie':
      if (tx.state.options.tieBreak === 'mayor' && livingMayor(tx.state) !== null) {
        tx.emit({ type: 'TieBreakRequested', tied: outcome.tied });
        startTimer(tx, 'tieBreak');
      } else {
        // `revote`, ou `mayor` sans Maire (`R-33`) : second tour entre ex aequo, sans « Epargner ».
        tx.emit({ type: 'VoteOpened', candidates: outcome.tied, spare: false, round: 2 });
        startTimer(tx, 'dayVote');
      }
  }
}

/**
 * « Clore le vote » (`R-37`) : jamais automatique. Si le Maire doit trancher
 * une egalite, il faut forcer, et personne n'est execute (`R-38`).
 */
export function advanceVillageVote(tx: Tx, push: Push): EngineError | null {
  if (tx.state.vote?.tie === null) {
    closeVillageVote(tx);
    return null;
  }

  if (push === 'advance') {
    return engineError('PENDING_ACTIONS');
  }

  if (push === 'force') {
    tx.emit({ type: 'PhaseForced', phase: 'DAY_VOTE' });
  }

  tx.emit({ type: 'TieBroken', playerId: null });
  startExecution(tx, null);
  return null;
}

/** Le Maire choisit parmi les ex aequo (`R-33`, `R-51`). */
export function breakTie(tx: Tx, actor: Actor, target: PlayerId): EngineError | null {
  const tie = tx.state.vote?.tie ?? null;

  if (tie === null) {
    return engineError('WRONG_PHASE', 'errors.vote.no_tie');
  }

  if (actor.kind !== 'player' || actor.playerId !== livingMayor(tx.state)) {
    return engineError('NOT_YOUR_TURN');
  }

  if (!tie.includes(target)) {
    return engineError('INVALID_TARGET', 'errors.vote.not_tied');
  }

  tx.emit({ type: 'TieBroken', playerId: target });
  startExecution(tx, target);
  return null;
}

/** L'execution : mort du designe, effets a la mort, verification de victoire (`docs/01` §2). */
function startExecution(tx: Tx, target: PlayerId | null): void {
  clearTimer(tx);
  tx.emit({ type: 'PhaseChanged', phase: 'EXECUTION' });
  tx.emit({ type: 'ExecutionStarted', target });

  if (target !== null) {
    killPlayers(tx, [{ playerId: target, cause: 'vote' }]);
  }
}

/** Fin de l'execution : la nuit suivante tombe, une fois les effets resolus. */
export function advanceExecution(tx: Tx, push: Push): EngineError | null {
  const blocked = settlePendingEffects(tx, push);

  // Un minuteur expire resout l'effet en attente ; la nuit, c'est le meneur qui la lance.
  if (blocked !== null || push === 'timeout' || tx.state.phase === 'ENDED') {
    return blocked;
  }

  startNight(tx);
  return null;
}

/** Tous les votants ont vote : le meneur le voit, sans que rien ne se close (`R-37`). */
export function everyoneVoted(state: GameState): boolean {
  const ballots = state.vote?.ballots ?? state.election?.ballots ?? {};

  return alivePlayers(state).every((player) => ballots[player.id] !== undefined);
}
