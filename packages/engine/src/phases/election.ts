import type { Actor, Ballot, PlayerId } from '@rougarou/protocol';

import { isError, requireAlivePlayer } from '../auth.ts';
import type { EngineError } from '../result.ts';
import { alivePlayers } from '../state.ts';
import { clearTimer, engineError, startTimer, type Tx } from '../tx.ts';
import { leaders, tallyElection } from '../votes.ts';
import { startDebate } from './day.ts';

/**
 * Election du Maire (`R-35`, `R-50`) : candidatures facultatives, puis vote
 * des vivants, puis second tour entre ex aequo, puis tirage au sort.
 */
export function startElection(tx: Tx): void {
  clearTimer(tx);
  tx.emit({ type: 'PhaseChanged', phase: 'MAYOR_ELECTION' });
  tx.emit({ type: 'ElectionStarted' });
  startTimer(tx, 'mayorCandidacy');
}

/** Se porter candidat, ou retirer sa candidature. Repeter la meme demande ne change rien. */
export function setCandidacy(tx: Tx, actor: Actor, running: boolean): EngineError | null {
  const player = requireAlivePlayer(tx.state, actor);

  if (isError(player)) {
    return player;
  }

  const { election } = tx.state;

  if (election?.stage !== 'candidacy') {
    return engineError('WRONG_PHASE', 'errors.election.candidacy_closed');
  }

  const isCandidate = election.candidates.includes(player.id);

  if (running && !isCandidate) {
    tx.emit({ type: 'CandidacyDeclared', playerId: player.id });
  } else if (!running && isCandidate) {
    tx.emit({ type: 'CandidacyWithdrawn', playerId: player.id });
  }

  return null;
}

function openElectionVote(tx: Tx, eligible: readonly PlayerId[], round: 1 | 2): void {
  tx.emit({ type: 'ElectionVoteOpened', eligible, round });
  startTimer(tx, 'mayorVote');
}

/** Un vivant vote pour un eligible ; il peut voter pour lui-meme (`R-35`). */
export function castElectionVote(tx: Tx, actor: Actor, ballot: Ballot): EngineError | null {
  const voter = requireAlivePlayer(tx.state, actor);

  if (isError(voter)) {
    return voter;
  }

  const { election } = tx.state;

  if (election?.stage !== 'vote') {
    return engineError('WRONG_PHASE', 'errors.election.vote_closed');
  }

  if (ballot.kind !== 'player') {
    // Ni abstention ni « Epargner » a l'election (`R-35`).
    return engineError('INVALID_COMMAND', 'errors.election.player_only');
  }

  if (!election.eligible.includes(ballot.playerId)) {
    return engineError('INVALID_TARGET', 'errors.election.not_eligible');
  }

  tx.emit({ type: 'ElectionVoteCast', voter: voter.id, target: ballot.playerId });
  return null;
}

/**
 * Le meneur avance (ou le minuteur expire) : fin des candidatures, ou
 * cloture du vote (`R-37`). Sans candidat, tous les vivants sont eligibles.
 */
export function advanceElection(tx: Tx): EngineError | null {
  const { election } = tx.state;

  if (election === null) {
    throw new Error("Election du Maire sans etat d'election.");
  }

  if (election.stage === 'candidacy') {
    const living = alivePlayers(tx.state).map((player) => player.id);
    const candidates = election.candidates.filter((id) => living.includes(id));

    openElectionVote(tx, candidates.length > 0 ? candidates : living, 1);
    return null;
  }

  const tally = tallyElection(tx.state);
  const ranked = leaders(tx.state, tally);

  tx.emit({ type: 'ElectionVoteClosed', tally });

  if (ranked.length === 1 && ranked[0] !== undefined) {
    elect(tx, ranked[0], false);
  } else if (ranked.length > 1 && election.round === 1) {
    openElectionVote(tx, ranked, 2);
  } else {
    // Aucun bulletin, ou egalite au second tour : tirage au sort (`R-35`).
    elect(tx, tx.ctx.rng.pick(ranked.length > 0 ? ranked : election.eligible), true);
  }

  return null;
}

function elect(tx: Tx, playerId: PlayerId, drawn: boolean): void {
  clearTimer(tx);
  tx.emit({ type: 'MayorElected', playerId, drawn });
  startDebate(tx);
}
