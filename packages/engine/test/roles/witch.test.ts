import type { GameOptionsInput, PlayerView } from '@rougarou/protocol';
import { describe, expect, it } from 'vitest';

import { availableActions, projectView } from '../../src/index.ts';
import { player, setup, toNextNight, types, type GameDriver } from '../dsl.ts';

/** Sorciere (`docs/02`, P19) : Chloe ; les loups sont Alice et Bob. */
const ROLES = {
  Alice: 'werewolf',
  Bob: 'werewolf',
  Chloe: 'witch',
  David: 'villager',
  Eve: 'villager',
  Fanny: 'villager',
  Gaspard: 'villager',
  Hugo: 'villager',
} as const;

/** Nuit 1 : les loups designent `victim` ; on arrive a l'etape de la Sorciere. */
function witchStep(victim: string | null, options: GameOptionsInput = {}): GameDriver {
  const game = setup({ roles: ROLES, options }).advance();

  if (victim === null) {
    return game.advance(true);
  }

  return game.wolfVote('Alice', victim).wolfVote('Bob', victim);
}

function potion(save: boolean, kill: string | null) {
  return { type: 'SubmitNightAction', action: { kind: 'witchPotions', save, kill } } as const;
}

function witchView(game: GameDriver): PlayerView {
  return projectView(game.state, { kind: 'player', playerId: 'Chloe' }) as PlayerView;
}

describe('Sorciere : son reveil (docs/02, P19)', () => {
  it('se reveille apres les loups (ordre 50) et voit leur victime et ses potions', () => {
    const game = witchStep('David');

    expect(game.state.night?.steps).toEqual(['wolves', 'witch']);
    expect(witchView(game).night).toEqual({
      step: 'witch',
      resolved: false,
      victim: 'David',
      potions: { life: true, death: true },
    });
    expect(availableActions(game.state, { kind: 'player', playerId: 'Chloe' })).toEqual([
      {
        type: 'SubmitNightAction',
        kind: 'witchPotions',
        canSave: true,
        killTargets: ['Alice', 'Bob', 'David', 'Eve', 'Fanny', 'Gaspard', 'Hugo'],
      },
    ]);
  });

  it('sans victime, elle voit « personne » et ne peut pas sauver', () => {
    const game = witchStep(null);

    expect(witchView(game).night).toMatchObject({ victim: null });
    expect(availableActions(game.state, { kind: 'player', playerId: 'Chloe' })[0]).toMatchObject({
      canSave: false,
    });
    game.rejects(player('Chloe'), potion(true, null), 'INVALID_COMMAND');
  });

  it('ne rien faire resout l etape, sans mort de plus', () => {
    const game = witchStep('David').witch('Chloe');

    expect(game.state.phase).toBe('DAWN');
    expect(game.state.dawn?.deaths).toEqual([{ playerId: 'David', cause: 'wolves' }]);
  });

  it('a la fin du minuteur ou en forcant, elle ne fait rien', () => {
    for (const game of [witchStep('David').expire(), witchStep('David').advance(true)]) {
      expect(game.state.dawn?.deaths).toEqual([{ playerId: 'David', cause: 'wolves' }]);
      expect(game.state.potions.Chloe).toBeUndefined();
    }
  });
});

describe('Sorciere : potions (R-40)', () => {
  it('la potion de vie sauve la victime des loups et se consomme', () => {
    const game = witchStep('David').witch('Chloe', { save: true });

    expect(game.state.dawn?.deaths).toEqual([]);
    expect(game.state.potions.Chloe).toEqual({ life: false, death: true });
  });

  it('la potion de mort tue sa cible a l aube, apres la victime des loups', () => {
    const game = witchStep('David').witch('Chloe', { kill: 'Alice' });

    expect(game.state.dawn?.deaths).toEqual([
      { playerId: 'David', cause: 'wolves' },
      { playerId: 'Alice', cause: 'witch' },
    ]);
    expect(game.state.potions.Chloe).toEqual({ life: true, death: false });
  });

  it('les deux potions la meme nuit', () => {
    const game = witchStep('David').witch('Chloe', { save: true, kill: 'Bob' });

    expect(game.state.dawn?.deaths).toEqual([{ playerId: 'Bob', cause: 'witch' }]);
    expect(game.state.potions.Chloe).toEqual({ life: false, death: false });
  });

  it('empoisonner la victime des loups ne la tue qu une fois, par les loups', () => {
    const game = witchStep('David').witch('Chloe', { kill: 'David' });

    expect(game.state.dawn?.deaths).toEqual([{ playerId: 'David', cause: 'wolves' }]);
  });

  it('une potion epuisee est refusee les nuits suivantes, mais elle se reveille', () => {
    const game = toNextNight(witchStep('David').witch('Chloe', { save: true, kill: 'Hugo' }));

    game.wolfVote('Alice', 'Eve').wolfVote('Bob', 'Eve');
    expect(game.state.night?.steps[game.state.night.current]).toBe('witch');
    expect(witchView(game).night).toMatchObject({
      victim: 'Eve',
      potions: { life: false, death: false },
    });
    expect(availableActions(game.state, { kind: 'player', playerId: 'Chloe' })[0]).toEqual({
      type: 'SubmitNightAction',
      kind: 'witchPotions',
      canSave: false,
      killTargets: [],
    });
    game
      .rejects(player('Chloe'), potion(true, null), 'INVALID_COMMAND')
      .rejects(player('Chloe'), potion(false, 'Alice'), 'INVALID_COMMAND')
      .witch('Chloe');
    expect(game.state.dawn?.deaths).toEqual([{ playerId: 'Eve', cause: 'wolves' }]);
  });

  it('refuse de s empoisonner, un mort, un inconnu et une seconde reponse', () => {
    const game = witchStep('David', { pilotMode: 'manual' });

    game.advance();
    game
      .rejects(player('Chloe'), potion(false, 'Chloe'), 'INVALID_TARGET')
      .rejects(player('Chloe'), potion(false, 'Zoe'), 'UNKNOWN_PLAYER')
      .rejects(
        player('Chloe'),
        { type: 'SubmitNightAction', action: { kind: 'seerProbe', target: 'Alice' } },
        'INVALID_COMMAND',
      )
      .witch('Chloe')
      .rejects(player('Chloe'), potion(false, 'Alice'), 'WRONG_PHASE');
  });

  it('un autre joueur ne joue pas a sa place', () => {
    witchStep('David').rejects(player('David'), potion(true, null), 'NOT_YOUR_TURN');
  });
});

describe('Sorciere : se sauver elle-meme (witchSelfSave)', () => {
  function selfSave(witchSelfSave: 'never' | 'firstNightOnly' | 'always', night: 1 | 2) {
    let game = witchStep(night === 1 ? 'Chloe' : 'Hugo', { witchSelfSave });

    if (night === 2) {
      game = toNextNight(game.witch('Chloe')).wolfVote('Alice', 'Chloe').wolfVote('Bob', 'Chloe');
    }

    return game;
  }

  it.each([
    ['never', 1, false],
    ['never', 2, false],
    ['firstNightOnly', 1, true],
    ['firstNightOnly', 2, false],
    ['always', 1, true],
    ['always', 2, true],
  ] as const)('%s, nuit %i : se sauver est permis ? %s', (option, night, allowed) => {
    const game = selfSave(option, night);

    expect(availableActions(game.state, { kind: 'player', playerId: 'Chloe' })[0]).toMatchObject({
      canSave: allowed,
    });

    if (allowed) {
      game.witch('Chloe', { save: true });
      expect(game.state.dawn?.deaths).toEqual([]);
    } else {
      game.rejects(player('Chloe'), potion(true, null), 'INVALID_COMMAND');
    }
  });
});

describe('Sorciere : causes et trace', () => {
  it('le meneur voit la cause witch et le choix de la nuit, pas les joueurs', () => {
    const game = witchStep('David').witch('Chloe', { kill: 'Alice' });
    const narrator = projectView(game.state, { kind: 'narrator' });

    expect(narrator.kind === 'narrator' && narrator.dawn?.deaths).toContainEqual({
      playerId: 'Alice',
      cause: 'witch',
    });
    expect(types(game.log)).toContain('WitchActed');

    game.advance();
    const view = projectView(game.state, { kind: 'player', playerId: 'Eve' }) as PlayerView;

    expect(view.deaths).toEqual(['David', 'Alice']);
  });

  it('morte, elle est appelee pour rien en presentiel (R-20)', () => {
    const game = toNextNight(witchStep('Chloe').witch('Chloe'));

    expect(game.state.night?.steps).toEqual(['wolves', 'witch']);
    game.wolfVote('Alice', 'Eve').wolfVote('Bob', 'Eve');
    expect(game.state.phase).toBe('DAWN');
  });
});
