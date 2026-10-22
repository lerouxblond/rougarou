import type { GameOptionsInput } from '@rougarou/protocol';
import { describe, expect, it } from 'vitest';

import { everyoneVoted } from '../src/phases/day.ts';
import { EIGHT_ROLES, firstNight, NARRATOR, newGame, player, setup, T0, types } from './dsl.ts';

/**
 * Huit joueurs, sans Maire : Hugo est mort la nuit 1, on est au vote du
 * jour 1. Restent Alice et Bob (loups), Chloe, David, Eve, Fanny, Gaspard.
 */
function dayVote(options: GameOptionsInput = {}) {
  return firstNight(setup({ roles: EIGHT_ROLES, options: { mayor: false, ...options } }), 'Hugo')
    .advance()
    .advance()
    .advance();
}

const vote = (target: string) =>
  ({ type: 'CastVote', ballot: { kind: 'player', playerId: target } }) as const;

describe('Ouverture du vote (R-30)', () => {
  it('« Ouvrir le vote » passe du debat au vote : tous les vivants sont candidats, avec « Epargner »', () => {
    const game = dayVote();

    expect(game.state.phase).toBe('DAY_VOTE');
    expect(game.state.vote).toMatchObject({
      candidates: ['Alice', 'Bob', 'Chloe', 'David', 'Eve', 'Fanny', 'Gaspard'],
      spare: true,
      round: 1,
    });
    expect(game.state.deadline).toBe(T0 + 60_000);
  });

  it('sans allowSpare, « Epargner » n est pas propose', () => {
    const game = dayVote({ allowSpare: false });

    expect(game.state.vote?.spare).toBe(false);
    game.rejects(
      player('Chloe'),
      { type: 'CastVote', ballot: { kind: 'spare' } },
      'INVALID_TARGET',
    );
  });

  it('on ne vote pas pendant le debat', () => {
    firstNight(setup({ roles: EIGHT_ROLES, options: { mayor: false } }), 'Hugo')
      .advance()
      .advance()
      .rejects(player('Chloe'), vote('Alice'), 'WRONG_PHASE');
  });
});

describe('Bulletins (R-30, R-31, D-08)', () => {
  it('pas de vote contre soi-meme (D-08)', () => {
    dayVote().rejects(player('Chloe'), vote('Chloe'), 'INVALID_TARGET');
  });

  it('un mort ne vote pas, et on ne vote pas contre un mort', () => {
    dayVote()
      .rejects(player('Hugo'), vote('Alice'), 'FORBIDDEN')
      .rejects(player('Chloe'), vote('Hugo'), 'INVALID_TARGET');
  });

  it('l abstention est refusee par defaut, et ne compte pas quand l option l autorise', () => {
    dayVote().rejects(
      player('Chloe'),
      { type: 'CastVote', ballot: { kind: 'abstain' } },
      'INVALID_COMMAND',
    );

    const game = dayVote({ allowAbstain: true })
      .vote('Chloe', 'abstain')
      .votes({ David: 'Alice' })
      .advance();

    expect(game.last.find((event) => event.type === 'VoteClosed')).toMatchObject({
      tally: { Alice: 1 },
      outcome: { kind: 'execute', playerId: 'Alice' },
    });
  });

  it('R-31 : on peut changer son vote tant que le vote n est pas clos', () => {
    const game = dayVote().vote('Chloe', 'Alice').vote('Chloe', 'Bob').advance();

    expect(game.state.players.Bob?.alive).toBe(false);
    expect(game.state.players.Alice?.alive).toBe(true);
  });
});

describe('Cloture et execution (R-37)', () => {
  it('le vote ne se clot jamais seul, meme quand tout le monde a vote', () => {
    const game = dayVote().votes({
      Alice: 'Chloe',
      Bob: 'Chloe',
      Chloe: 'Alice',
      David: 'Alice',
      Eve: 'Alice',
      Fanny: 'Alice',
      Gaspard: 'Alice',
    });

    expect(game.state.phase).toBe('DAY_VOTE');
    expect(everyoneVoted(game.state)).toBe(true);
  });

  it('« Clore le vote » execute le joueur en tete', () => {
    const game = dayVote().votes({ Chloe: 'Alice', David: 'Alice', Alice: 'Chloe' }).advance();

    expect(game.state.phase).toBe('EXECUTION');
    expect(game.state.players.Alice?.alive).toBe(false);
    expect(types(game.last)).toEqual([
      'DeadlineSet',
      'VoteClosed',
      'PhaseChanged',
      'ExecutionStarted',
      'PlayerKilled',
    ]);
  });

  it('a la fin du minuteur, le vote se clot avec les bulletins deposes', () => {
    const game = dayVote().votes({ Chloe: 'Bob' }).expire();

    expect(everyoneVoted(game.state)).toBe(false);
    expect(game.state.players.Bob?.alive).toBe(false);
  });

  it('aucun bulletin : personne n est execute (R-38)', () => {
    const game = dayVote().advance();

    expect(game.last.find((event) => event.type === 'VoteClosed')).toMatchObject({
      outcome: { kind: 'nobody', reason: 'noBallots' },
    });
    expect(game.state.phase).toBe('EXECUTION');
  });

  it('on ne vote plus une fois le vote clos', () => {
    dayVote().advance().rejects(player('Chloe'), vote('Alice'), 'WRONG_PHASE');
  });

  it('apres l execution, la nuit suivante tombe', () => {
    const game = dayVote().votes({ Chloe: 'Alice' }).advance().advance();

    expect(game.state.phase).toBe('NIGHT');
    expect(game.state.nightNumber).toBe(2);
    expect(game.state.vote).toBeNull();
  });
});

describe('« Epargner » (R-36)', () => {
  it('en tete, personne n est execute', () => {
    const game = dayVote().votes({ Chloe: 'spare', David: 'spare', Eve: 'Alice' }).advance();

    expect(game.last.find((event) => event.type === 'VoteClosed')).toMatchObject({
      outcome: { kind: 'nobody', reason: 'spare' },
    });
  });

  it('a egalite avec un joueur, personne n est execute', () => {
    const game = dayVote().votes({ Chloe: 'spare', David: 'Alice' }).advance();

    expect(game.state.players.Alice?.alive).toBe(true);
  });
});

describe('Egalite (R-33, R-38)', () => {
  it('tieBreak = nobody : personne n est execute', () => {
    const game = dayVote({ tieBreak: 'nobody' }).votes({ Chloe: 'Alice', David: 'Bob' }).advance();

    expect(game.last.find((event) => event.type === 'VoteClosed')).toMatchObject({
      outcome: { kind: 'nobody', reason: 'tie' },
    });
  });

  it('tieBreak = revote : second tour entre les seuls ex aequo, sans « Epargner »', () => {
    const game = dayVote({ tieBreak: 'revote' }).votes({ Chloe: 'Alice', David: 'Bob' }).advance();

    expect(game.state.phase).toBe('DAY_VOTE');
    expect(game.state.vote).toMatchObject({
      candidates: ['Alice', 'Bob'],
      spare: false,
      round: 2,
      ballots: {},
    });
    game.rejects(player('Eve'), vote('Chloe'), 'INVALID_TARGET');

    game.votes({ Eve: 'Bob' }).advance();
    expect(game.state.players.Bob?.alive).toBe(false);
  });

  it('tieBreak = revote : une seconde egalite, et personne n est execute', () => {
    const game = dayVote({ tieBreak: 'revote' })
      .votes({ Chloe: 'Alice', David: 'Bob' })
      .advance()
      .votes({ Chloe: 'Alice', David: 'Bob' })
      .advance();

    expect(game.state.phase).toBe('EXECUTION');
    expect(game.last.find((event) => event.type === 'VoteClosed')).toMatchObject({
      outcome: { kind: 'nobody', reason: 'tie' },
    });
  });

  it('tieBreak = mayor sans Maire : on passe au second tour (R-33)', () => {
    const game = dayVote({ tieBreak: 'mayor' }).votes({ Chloe: 'Alice', David: 'Bob' }).advance();

    expect(game.state.vote?.round).toBe(2);
  });

  it('BreakTie n est possible que pendant le vote, et seulement s il y a une egalite', () => {
    dayVote()
      .rejects(player('Chloe'), { type: 'BreakTie', playerId: 'Alice' }, 'WRONG_PHASE')
      .advance()
      .rejects(player('Chloe'), { type: 'BreakTie', playerId: 'Alice' }, 'WRONG_PHASE');
  });
});

describe('Bouton du meneur en CONFIG', () => {
  it('on ne sort de CONFIG que par « Distribuer », pas par AdvancePhase', () => {
    newGame().advance().rejects(NARRATOR, { type: 'AdvancePhase' }, 'WRONG_PHASE');
  });
});
