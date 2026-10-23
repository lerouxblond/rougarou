import type { JournalFact } from '@rougarou/protocol';

import type { GameEvent } from './events.ts';

/**
 * Le fait journalise que decrit `event`, s'il y en a un (`R-19`). Le journal
 * garde ce qui s'est passe, pas comment le moteur y est arrive : un vote
 * depose ou une etape qui commence n'y entrent pas, la cloture du vote oui.
 */
export function journalFact(event: GameEvent): JournalFact | null {
  switch (event.type) {
    case 'NightStarted':
      return { kind: 'nightStarted' };
    case 'WolvesResolved':
      return { kind: 'wolvesChose', victim: event.victim };
    case 'KnowledgeGained': {
      const { knowledge } = event;

      return knowledge.kind === 'seerRole' || knowledge.kind === 'seerTeam'
        ? { kind: 'seerProbed', seer: event.playerId, target: knowledge.playerId }
        : null;
    }
    case 'WitchActed':
      return { kind: 'witchActed', witch: event.witch, save: event.save, kill: event.kill };
    case 'LoversLinked':
      return { kind: 'loversLinked', cupid: event.cupid, lovers: [...event.lovers] };
    case 'LittleGirlSpied':
      return { kind: 'littleGirlSpied', playerId: event.playerId, caught: event.caught };
    case 'PlayerKilled':
      return { kind: 'playerKilled', playerId: event.playerId, cause: event.cause };
    case 'HunterShot':
      return { kind: 'hunterShot', hunter: event.from, target: event.target };
    case 'MayorElected':
      return { kind: 'mayorElected', playerId: event.playerId, drawn: event.drawn };
    case 'MayorDesignated':
      return { kind: 'mayorDesignated', from: event.from, to: event.to, drawn: event.drawn };
    case 'VoteClosed':
      return { kind: 'voteClosed', outcome: event.outcome };
    case 'PhaseForced':
      return { kind: 'phaseForced', phase: event.phase };
    case 'TimerExpired':
      return { kind: 'timerExpired', phase: event.phase };
    case 'GameEnded':
      return { kind: 'gameEnded', winner: event.winner };
    default:
      return null;
  }
}
