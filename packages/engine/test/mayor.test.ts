import type { GameOptionsInput } from '@rougarou/protocol';
import { describe, expect, it } from 'vitest';

import { availableActions, projectView } from '../src/index.ts';
import {
  EIGHT_ROLES,
  electMayor,
  firstNight,
  NARRATOR,
  player,
  setup,
  T0,
  types,
  type GameDriver,
} from './dsl.ts';

/** Huit joueurs ; Hugo meurt la nuit 1 ; on ouvre l'election du jour 1. */
function election(options: GameOptionsInput = {}) {
  return firstNight(setup({ roles: EIGHT_ROLES, options }), 'Hugo')
    .advance()
    .advance();
}

function mayorEvents(game: GameDriver) {
  return game.last.filter((event) => event.type === 'MayorElected');
}

describe('Election du Maire (R-35, R-50)', () => {
  it('a lieu le premier jour qui suit une nuit, avec 60 s de candidatures (D-02)', () => {
    const game = election();

    expect(game.state.phase).toBe('MAYOR_ELECTION');
    expect(game.state.election).toMatchObject({ stage: 'candidacy', candidates: [] });
    expect(game.state.deadline).toBe(T0 + 60_000);
  });

  it('on se porte candidat et on se retire ; repeter ne change rien', () => {
    const game = election()
      .as('Chloe', { type: 'DeclareCandidacy' })
      .as('Chloe', { type: 'DeclareCandidacy' })
      .as('David', { type: 'DeclareCandidacy' })
      .as('David', { type: 'WithdrawCandidacy' })
      .as('Eve', { type: 'WithdrawCandidacy' });

    expect(game.state.election?.candidates).toEqual(['Chloe']);
  });

  it('un mort ne se porte pas candidat', () => {
    election().rejects(player('Hugo'), { type: 'DeclareCandidacy' }, 'FORBIDDEN');
  });

  it('on ne se porte candidat que pendant les candidatures', () => {
    election().advance().rejects(player('Chloe'), { type: 'DeclareCandidacy' }, 'WRONG_PHASE');
    setup({ roles: EIGHT_ROLES }).rejects(
      player('Chloe'),
      { type: 'DeclareCandidacy' },
      'WRONG_PHASE',
    );
  });

  it('avec des candidats, eux seuls sont eligibles', () => {
    const game = election()
      .as('Chloe', { type: 'DeclareCandidacy' })
      .as('David', { type: 'DeclareCandidacy' })
      .advance();

    expect(game.state.election).toMatchObject({
      stage: 'vote',
      eligible: ['Chloe', 'David'],
      round: 1,
    });
    expect(game.state.deadline).toBe(T0 + 90_000);
    game.rejects(
      player('Eve'),
      { type: 'CastVote', ballot: { kind: 'player', playerId: 'Eve' } },
      'INVALID_TARGET',
    );
  });

  it('sans candidat, tous les vivants sont eligibles', () => {
    const game = election().expire();

    expect(game.state.election?.eligible).toEqual([
      'Alice',
      'Bob',
      'Chloe',
      'David',
      'Eve',
      'Fanny',
      'Gaspard',
    ]);
  });

  it('on peut voter pour soi ; ni abstention ni « Epargner »', () => {
    const game = election({ allowAbstain: true }).advance().vote('Chloe', 'Chloe');

    game
      .rejects(
        player('David'),
        { type: 'CastVote', ballot: { kind: 'abstain' } },
        'INVALID_COMMAND',
      )
      .rejects(player('David'), { type: 'CastVote', ballot: { kind: 'spare' } }, 'INVALID_COMMAND');
    expect(game.state.election?.ballots).toEqual({ Chloe: 'Chloe' });
  });

  it('on ne vote pas pendant les candidatures', () => {
    election().rejects(
      player('Chloe'),
      { type: 'CastVote', ballot: { kind: 'player', playerId: 'Chloe' } },
      'WRONG_PHASE',
    );
  });

  it('le meneur clot le vote : le joueur en tete est elu, puis le debat commence', () => {
    const game = election().advance().votes({ Chloe: 'Eve', David: 'Eve', Eve: 'Chloe' }).advance();

    expect(game.state.mayor).toBe('Eve');
    expect(game.state.electionHeld).toBe(true);
    expect(game.state.phase).toBe('DAY_DEBATE');
    expect(mayorEvents(game)).toEqual([{ type: 'MayorElected', playerId: 'Eve', drawn: false }]);
  });

  it('une egalite donne un second tour entre ex aequo, puis un tirage au sort', () => {
    const game = election().advance().votes({ Chloe: 'Eve', David: 'Fanny' }).advance();

    expect(game.state.election).toMatchObject({
      stage: 'vote',
      eligible: ['Eve', 'Fanny'],
      round: 2,
    });
    game.votes({ Chloe: 'Eve', David: 'Fanny' }).advance();

    const [elected] = mayorEvents(game);

    expect(elected).toMatchObject({ drawn: true });
    expect(['Eve', 'Fanny']).toContain(game.state.mayor);
  });

  it('aucun bulletin : tirage au sort parmi les eligibles', () => {
    const game = election().as('Chloe', { type: 'DeclareCandidacy' }).advance().advance();

    expect(game.state.mayor).toBe('Chloe');
    expect(mayorEvents(game)).toEqual([{ type: 'MayorElected', playerId: 'Chloe', drawn: true }]);
  });

  it('pas de nouvelle election le jour 2 quand le Maire est en vie', () => {
    const game = electMayor(election(), 'Eve').advance().votes({ Chloe: 'Gaspard' }).advance();

    firstNight(game, 'Fanny').advance().advance();
    expect(game.state.phase).toBe('DAY_DEBATE');
  });
});

/** Election de Chloe, puis ouverture du vote du jour 1. */
function voteWithMayor(options: GameOptionsInput = {}) {
  return electMayor(election(options), 'Chloe').advance();
}

describe('Le Maire au vote du village (R-32, R-33, R-51)', () => {
  it('sa voix compte double', () => {
    const game = voteWithMayor().votes({ Chloe: 'Alice', David: 'Bob' }).advance();

    expect(game.last.find((event) => event.type === 'VoteClosed')).toMatchObject({
      tally: { Alice: 2, Bob: 1 },
    });
    expect(game.state.players.Alice?.alive).toBe(false);
  });

  it('il tranche une egalite parmi les ex aequo, en 30 s', () => {
    const game = voteWithMayor().votes({ David: 'Alice', Eve: 'Bob' }).advance();

    expect(game.state.vote?.tie).toEqual(['Alice', 'Bob']);
    expect(game.state.deadline).toBe(T0 + 30_000);
    // Le vote est clos, mais le Maire, et lui seul, recoit le choix (l'ecran n'affiche que ca).
    expect(availableActions(game.state, { kind: 'player', playerId: 'Chloe' })).toEqual([
      { type: 'BreakTie', targets: ['Alice', 'Bob'] },
    ]);
    expect(availableActions(game.state, { kind: 'player', playerId: 'David' })).toEqual([]);
    game
      .rejects(player('David'), { type: 'BreakTie', playerId: 'Alice' }, 'NOT_YOUR_TURN')
      .rejects(player('Chloe'), { type: 'BreakTie', playerId: 'Eve' }, 'INVALID_TARGET')
      .rejects(
        player('David'),
        { type: 'CastVote', ballot: { kind: 'player', playerId: 'Alice' } },
        'WRONG_PHASE',
      )
      .as('Chloe', { type: 'BreakTie', playerId: 'Bob' });

    expect(game.state.phase).toBe('EXECUTION');
    expect(game.state.players.Bob?.alive).toBe(false);
    // Tout le monde apprend ce que le Maire a decide, pas seulement qu'il y avait egalite.
    expect(projectView(game.state, { kind: 'player', playerId: 'David' }).vote).toMatchObject({
      outcome: { kind: 'tie', tied: ['Alice', 'Bob'] },
      tieBroken: { playerId: 'Bob' },
    });
  });

  it('sans decision du Maire a la fin du minuteur, personne n est execute (R-38)', () => {
    const game = voteWithMayor().votes({ David: 'Alice', Eve: 'Bob' }).advance().expire();

    expect(game.state.phase).toBe('EXECUTION');
    expect(types(game.last)).toContain('TieBroken');
    expect(game.state.players.Alice?.alive).toBe(true);
    expect(game.state.players.Bob?.alive).toBe(true);
    expect(projectView(game.state, { kind: 'player', playerId: 'David' }).vote?.tieBroken).toEqual({
      playerId: null,
    });
  });

  it('le meneur doit forcer pour passer l egalite ; personne n est execute', () => {
    const game = voteWithMayor()
      .votes({ David: 'Alice', Eve: 'Bob' })
      .advance()
      .rejects(NARRATOR, { type: 'AdvancePhase' }, 'PENDING_ACTIONS')
      .advance(true);

    expect(types(game.last)).toEqual([
      'PhaseForced',
      'TieBroken',
      'DeadlineSet',
      'PhaseChanged',
      'ExecutionStarted',
    ]);
  });
});

describe('Succession `designate` (R-52)', () => {
  /** Chloe est Maire ; les loups la tuent la nuit 2 ; l'aube est annoncee. */
  function mayorKilledAtNight() {
    const game = voteWithMayor().votes({ Chloe: 'Gaspard' }).advance();

    return firstNight(game, 'Chloe').advance();
  }

  it('le Maire mort designe un successeur parmi les vivants, en 30 s', () => {
    const game = mayorKilledAtNight();

    expect(game.state.pending).toEqual([{ kind: 'mayorSuccession', from: 'Chloe' }]);
    expect(game.state.deadline).toBe(T0 + 30_000);
    game
      .rejects(player('David'), { type: 'DesignateSuccessor', playerId: 'Eve' }, 'NOT_YOUR_TURN')
      .rejects(
        player('Chloe'),
        { type: 'DesignateSuccessor', playerId: 'Gaspard' },
        'INVALID_TARGET',
      )
      .rejects(NARRATOR, { type: 'AdvancePhase' }, 'PENDING_ACTIONS')
      .as('Chloe', { type: 'DesignateSuccessor', playerId: 'Eve' });

    expect(game.state.mayor).toBe('Eve');
    expect(game.state.pending).toEqual([]);
    expect(game.state.deadline).toBeNull();
  });

  it('pas de nouvelle election : le successeur garde le titre', () => {
    const game = mayorKilledAtNight()
      .as('Chloe', { type: 'DesignateSuccessor', playerId: 'Eve' })
      .advance();

    expect(game.state.phase).toBe('DAY_DEBATE');
  });

  it('sans designation a la fin du minuteur, le successeur est tire au sort parmi les vivants', () => {
    const game = mayorKilledAtNight().expire();
    const designated = game.last.find((event) => event.type === 'MayorDesignated');

    expect(designated).toMatchObject({ from: 'Chloe', drawn: true });
    expect(game.state.players[game.state.mayor ?? '']?.alive).toBe(true);
    expect(game.state.phase).toBe('DAWN');
  });

  it('en forcant, le meneur tire le successeur au sort et passe au jour', () => {
    const game = mayorKilledAtNight().advance(true);

    expect(types(game.last)).toContain('PhaseForced');
    expect(game.state.phase).toBe('DAY_DEBATE');
  });

  it('un Maire execute designe aussi son successeur avant la nuit', () => {
    const game = voteWithMayor().votes({ David: 'Chloe', Eve: 'Chloe' }).advance();

    expect(game.state.phase).toBe('EXECUTION');
    game.rejects(NARRATOR, { type: 'AdvancePhase' }, 'PENDING_ACTIONS');
    game.as('Chloe', { type: 'DesignateSuccessor', playerId: 'David' }).advance();
    expect(game.state.mayor).toBe('David');
    expect(game.state.phase).toBe('NIGHT');
  });

  it('R-44 : si la mort du Maire termine la partie, la succession est sautee', () => {
    const roles = {
      Alice: 'werewolf',
      Bob: 'villager',
      Chloe: 'villager',
      David: 'villager',
      Eve: 'villager',
    } as const;
    const game = firstNight(setup({ roles }), 'Bob').advance().advance();

    electMayor(game, 'Alice').advance().votes({ Chloe: 'Alice', David: 'Alice' }).advance();

    expect(game.state.winner).toBe('village');
    expect(types(game.last)).toEqual(
      expect.arrayContaining(['EffectQueued', 'EffectResolved', 'MayorRemoved', 'GameEnded']),
    );
    expect(types(game.last)).not.toContain('MayorDesignated');
  });
});

describe('Succession `reelect` (R-52)', () => {
  it('le titre disparait a la mort du Maire, et une election a lieu le jour suivant', () => {
    const game = voteWithMayor({ mayorSuccession: 'reelect' })
      .votes({ Chloe: 'Gaspard' })
      .advance();

    firstNight(game, 'Chloe').advance();
    expect(game.state.mayor).toBeNull();
    expect(game.state.pending).toEqual([]);

    game.advance();
    expect(game.state.phase).toBe('MAYOR_ELECTION');
  });

  it('un Maire execute laisse le village sans Maire jusqu a l election du lendemain', () => {
    const game = voteWithMayor({ mayorSuccession: 'reelect' })
      .votes({ David: 'Chloe', Eve: 'Chloe' })
      .advance();

    expect(game.state.mayor).toBeNull();
    firstNight(game, 'David').advance().advance();
    expect(game.state.phase).toBe('MAYOR_ELECTION');
  });
});
