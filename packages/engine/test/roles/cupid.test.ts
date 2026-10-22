import type { GameOptionsInput, PlayerView } from '@rougarou/protocol';
import { describe, expect, it } from 'vitest';

import { availableActions, projectView } from '../../src/index.ts';
import { player, setup, T0, toNextNight, types, type GameDriver } from '../dsl.ts';

/** Cupidon (`docs/02`, P22 a P24) : Chloe ; les loups sont Alice et Bob ; David est Chasseur. */
const ROLES = {
  Alice: 'werewolf',
  Bob: 'werewolf',
  Chloe: 'cupid',
  David: 'hunter',
  Eve: 'villager',
  Fanny: 'villager',
  Gaspard: 'villager',
  Hugo: 'villager',
} as const;

/** Nuit 1, etape de Cupidon. */
function cupidNight(options: GameOptionsInput = {}): GameDriver {
  return setup({ roles: ROLES, options }).advance();
}

/** Cupidon lie `first` et `second`, qui confirment ; on arrive aux loups. */
function linked(first: string, second: string, options: GameOptionsInput = {}): GameDriver {
  return cupidNight(options).link('Chloe', first, second).confirmLove(first).confirmLove(second);
}

function viewOf(game: GameDriver, id: string): PlayerView {
  return projectView(game.state, { kind: 'player', playerId: id }) as PlayerView;
}

describe('Cupidon : former le couple (docs/02, P22)', () => {
  it('nuit 1 seulement : Cupidon (10), puis les amoureux (12), puis les loups', () => {
    const game = cupidNight();

    expect(game.state.night?.steps).toEqual(['cupid', 'lovers', 'wolves']);
    expect(game.state.deadline).toBe(T0 + 45_000);
    expect(availableActions(game.state, { kind: 'player', playerId: 'Chloe' })).toEqual([
      {
        type: 'SubmitNightAction',
        kind: 'cupidLink',
        targets: ['Alice', 'Bob', 'Chloe', 'David', 'Eve', 'Fanny', 'Gaspard', 'Hugo'],
      },
    ]);
    expect(
      toNextNight(linked('Eve', 'Fanny').wolfVote('Alice', 'Hugo').wolfVote('Bob', 'Hugo')).state
        .night?.steps,
    ).toEqual(['wolves']);
  });

  it('il designe deux vivants distincts, lui compris, et connait le couple', () => {
    const game = cupidNight().link('Chloe', 'Chloe', 'Alice');

    expect(game.state.lovers).toEqual(['Chloe', 'Alice']);
    expect(game.state.players.Chloe?.knowledge).toEqual([
      { kind: 'couple', players: ['Chloe', 'Alice'] },
      // Amoureux lui-meme, il decouvre aussi le role de l'autre.
      { kind: 'lover', playerId: 'Alice', role: 'werewolf' },
    ]);
  });

  it('refuse un couple d un seul joueur, un inconnu, et un second choix', () => {
    const link = (first: string, second: string) => ({
      type: 'SubmitNightAction' as const,
      action: { kind: 'cupidLink' as const, lovers: [first, second] as [string, string] },
    });

    cupidNight({ pilotMode: 'manual' })
      .rejects(player('Chloe'), link('Eve', 'Eve'), 'INVALID_TARGET')
      .rejects(player('Chloe'), link('Eve', 'Zoe'), 'UNKNOWN_PLAYER')
      .rejects(player('Eve'), link('Eve', 'Fanny'), 'NOT_YOUR_TURN')
      .link('Chloe', 'Eve', 'Fanny')
      .rejects(player('Chloe'), link('Eve', 'Gaspard'), 'WRONG_PHASE');
  });

  it('a la fin du minuteur, pas d amoureux, et l etape des amoureux passe d elle-meme', () => {
    const game = cupidNight().expire();

    expect(game.state.lovers).toBeNull();
    expect(game.state.night?.steps[game.state.night.current]).toBe('wolves');
  });
});

describe('Amoureux : se decouvrir (P22)', () => {
  it('chacun decouvre l autre, pseudo et role, a l entree de leur etape', () => {
    const game = cupidNight().link('Chloe', 'Alice', 'Eve');

    expect(game.state.players.Eve?.knowledge).toEqual([
      { kind: 'lover', playerId: 'Alice', role: 'werewolf' },
    ]);
    expect(game.state.players.Alice?.knowledge).toEqual([
      { kind: 'lover', playerId: 'Eve', role: 'villager' },
    ]);
    expect(viewOf(game, 'Eve').night).toEqual({
      step: 'lovers',
      resolved: false,
      partner: 'Alice',
      confirmed: false,
    });
    expect(viewOf(game, 'Eve').players.find((seen) => seen.id === 'Alice')?.role).toBe('werewolf');
  });

  it('l etape se resout quand les deux ont confirme', () => {
    const game = cupidNight().link('Chloe', 'Eve', 'Fanny').confirmLove('Eve');

    expect(game.state.night?.steps[game.state.night.current]).toBe('lovers');
    expect(availableActions(game.state, { kind: 'player', playerId: 'Eve' })).toEqual([]);
    game.confirmLove('Fanny');
    expect(game.state.night?.steps[game.state.night.current]).toBe('wolves');
  });

  it('a la fin du minuteur, ils sont confirmes d office', () => {
    const game = cupidNight().link('Chloe', 'Eve', 'Fanny').expire();

    expect(game.state.night?.steps[game.state.night.current]).toBe('wolves');
    expect(types(game.last)).toContain('NightStepResolved');
  });

  it('un amoureux ne confirme qu une fois, et seuls les amoureux confirment', () => {
    cupidNight()
      .link('Chloe', 'Eve', 'Fanny')
      .confirmLove('Eve')
      .rejects(
        player('Eve'),
        { type: 'SubmitNightAction', action: { kind: 'loversConfirm' } },
        'WRONG_PHASE',
      )
      .rejects(
        player('Hugo'),
        { type: 'SubmitNightAction', action: { kind: 'loversConfirm' } },
        'NOT_YOUR_TURN',
      );
  });
});

describe('Chagrin (R-41, R-42, P24)', () => {
  it('si un amoureux meurt, l autre meurt de chagrin aussitot', () => {
    const game = linked('Eve', 'Fanny').wolfVote('Alice', 'Eve').wolfVote('Bob', 'Eve').advance();

    expect(game.state.players.Fanny?.alive).toBe(false);
    expect(game.last).toContainEqual(
      expect.objectContaining({ type: 'PlayerKilled', playerId: 'Fanny', cause: 'grief' }),
    );
  });

  it('cas limite 3 : le Chasseur meurt de chagrin et tire quand meme', () => {
    const game = linked('David', 'Eve').wolfVote('Alice', 'Eve').wolfVote('Bob', 'Eve').advance();

    expect(game.state.players.David?.alive).toBe(false);
    expect(game.state.pending).toEqual([{ kind: 'hunterShot', from: 'David' }]);
    game.shoot('David', 'Alice');
    expect(game.state.players.Alice?.alive).toBe(false);
  });

  it('une vague : chagrins, puis tirs, puis succession du Maire (P24)', () => {
    const game = linked('David', 'Eve')
      .replay({ type: 'MayorElected', playerId: 'Eve', drawn: false })
      .wolfVote('Alice', 'Eve')
      .wolfVote('Bob', 'Eve')
      .advance();

    expect(game.state.pending).toEqual([
      { kind: 'hunterShot', from: 'David' },
      { kind: 'mayorSuccession', from: 'Eve' },
    ]);
  });

  it('un Maire designe qui meurt de chagrin designe a son tour', () => {
    const game = linked('Eve', 'Fanny')
      .replay({ type: 'MayorElected', playerId: 'Gaspard', drawn: false })
      .wolfVote('Alice', 'Gaspard')
      .wolfVote('Bob', 'Gaspard')
      .advance()
      .as('Gaspard', { type: 'DesignateSuccessor', playerId: 'Eve' });

    expect(game.state.mayor).toBe('Eve');
    // Le Chasseur tire sur Fanny : Eve, Maire, meurt de chagrin et designe a son tour.
    toNextNight(game);
    expect(game.state.phase).toBe('NIGHT');
    game.wolfVote('Alice', 'David').wolfVote('Bob', 'David').advance().shoot('David', 'Fanny');
    expect(game.state.players.Eve?.alive).toBe(false);
    expect(game.state.pending).toEqual([{ kind: 'mayorSuccession', from: 'Eve' }]);
  });
});

describe('Amoureux mixtes (R-03, R-06, cas limite 1)', () => {
  /** Alice (loup) et Eve (villageoise) s'aiment ; il reste Alice, Bob, Eve et Hugo. */
  function mixedCouple(): GameDriver {
    const game = linked('Alice', 'Eve').wolfVote('Alice', 'Hugo').wolfVote('Bob', 'Hugo');

    return game;
  }

  it('le loup amoureux vote toujours avec la meute, contre son aimee aussi', () => {
    expect(availableActions(mixedCouple().state, { kind: 'player', playerId: 'Alice' })).toEqual(
      [],
    );
    const game = linked('Alice', 'Eve');

    expect(availableActions(game.state, { kind: 'player', playerId: 'Alice' })[0]).toMatchObject({
      kind: 'wolfVote',
      targets: expect.arrayContaining(['Eve']),
    });
  });

  it('le couple gagne quand ils sont les deux seuls vivants, avant les loups', () => {
    const roles = {
      Alice: 'werewolf',
      Bob: 'cupid',
      Chloe: 'villager',
      David: 'villager',
      Eve: 'villager',
    } as const;
    const game = setup({ roles, options: { mayor: false } })
      .advance()
      .link('Bob', 'Alice', 'Chloe')
      .confirmLove('Alice')
      .confirmLove('Chloe')
      .wolfVote('Alice', 'Bob')
      .advance()
      .advance()
      .advance()
      .votes({ Alice: 'David', Chloe: 'David', Eve: 'David' })
      .advance();

    expect(game.state.winner).toBeNull();
    toNextNight(game).wolfVote('Alice', 'Eve').advance();
    expect(game.state.phase).toBe('ENDED');
    expect(game.state.winner).toBe('lovers');
  });

  it('un couple du meme camp n est pas un vainqueur a part', () => {
    const roles = {
      Alice: 'werewolf',
      Bob: 'cupid',
      Chloe: 'villager',
      David: 'villager',
      Eve: 'villager',
    } as const;
    const game = setup({ roles, options: { mayor: false } })
      .advance()
      .link('Bob', 'Chloe', 'David')
      .confirmLove('Chloe')
      .confirmLove('David')
      .wolfVote('Alice', 'Eve')
      .advance()
      .advance()
      .advance()
      .votes({ Bob: 'Alice', Chloe: 'Alice', David: 'Alice' })
      .advance();

    expect(game.state.winner).toBe('village');
  });
});
