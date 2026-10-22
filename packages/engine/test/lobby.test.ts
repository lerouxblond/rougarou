import { describe, expect, it } from 'vitest';

import { NARRATOR, newGame, player, types } from './dsl.ts';

function lobby(names: readonly string[]) {
  const game = newGame();

  for (const name of names) {
    game.as(name, { type: 'JoinGame', name });
  }

  return game;
}

describe('Salon', () => {
  it('cree une partie dans le salon', () => {
    const game = newGame(1, 'abc');

    expect(game.state.gameId).toBe('abc');
    expect(game.state.phase).toBe('LOBBY');
    expect(types(game.log)).toEqual(['GameCreated']);
  });

  it('place les joueurs dans l ordre d arrivee', () => {
    const game = lobby(['Alice', 'Bob', 'Chloe']);

    expect(game.state.seats).toEqual(['Alice', 'Bob', 'Chloe']);
    expect(game.state.players.Bob).toMatchObject({ name: 'Bob', alive: true, role: null });
  });

  it('refuse de rejoindre deux fois', () => {
    lobby(['Alice']).rejects(
      player('Alice'),
      { type: 'JoinGame', name: 'Alice' },
      'INVALID_COMMAND',
    );
  });

  it('R-63 : refuse un pseudo deja pris, sans tenir compte de la casse ni des espaces', () => {
    lobby(['Alice'])
      .rejects(player('Bob'), { type: 'JoinGame', name: ' alice ' }, 'NAME_TAKEN')
      .rejects(player('Bob'), { type: 'JoinGame', name: 'ALICE' }, 'NAME_TAKEN')
      .as('Bob', { type: 'JoinGame', name: 'Alicia' });
  });

  it('R-63 : un pseudo libere par un depart peut etre repris', () => {
    lobby(['Alice'])
      .as('Alice', { type: 'LeaveGame' })
      .as('Bob', { type: 'JoinGame', name: 'Alice' });
  });

  it('refuse un 25e joueur (D-07)', () => {
    const game = lobby(Array.from({ length: 24 }, (_, index) => `p${index}`));

    game.rejects(player('p24'), { type: 'JoinGame', name: 'p24' }, 'GAME_FULL');
  });

  it('seul un joueur peut rejoindre : ni le meneur (D-06) ni le systeme', () => {
    newGame()
      .rejects(NARRATOR, { type: 'JoinGame', name: 'Meneur' }, 'FORBIDDEN')
      .rejects({ kind: 'system' }, { type: 'JoinGame', name: 'Robot' }, 'FORBIDDEN');
  });

  it('un joueur peut partir, et sa place disparait', () => {
    const game = lobby(['Alice', 'Bob']).as('Alice', { type: 'LeaveGame' });

    expect(game.state.seats).toEqual(['Bob']);
    expect(game.state.players.Alice).toBeUndefined();
  });

  it('un inconnu ne peut pas partir', () => {
    lobby(['Alice']).rejects(player('Zoe'), { type: 'LeaveGame' }, 'UNKNOWN_PLAYER');
  });

  it('le meneur expulse un joueur ; un joueur ne le peut pas', () => {
    const game = lobby(['Alice', 'Bob']);

    game.rejects(player('Alice'), { type: 'KickPlayer', playerId: 'Bob' }, 'FORBIDDEN');
    game.narrator({ type: 'KickPlayer', playerId: 'Bob' });

    expect(game.state.seats).toEqual(['Alice']);
    expect(game.last).toEqual([{ type: 'PlayerLeft', playerId: 'Bob', kicked: true }]);
  });

  it('refuse d expulser un joueur inconnu', () => {
    lobby(['Alice']).rejects(NARRATOR, { type: 'KickPlayer', playerId: 'Zoe' }, 'UNKNOWN_PLAYER');
  });

  it('le meneur reordonne les places', () => {
    const game = lobby(['Alice', 'Bob', 'Chloe']).narrator({
      type: 'ReorderSeats',
      order: ['Chloe', 'Alice', 'Bob'],
    });

    expect(game.state.seats).toEqual(['Chloe', 'Alice', 'Bob']);
  });

  it.each([[['Alice', 'Bob']], [['Alice', 'Bob', 'Bob']], [['Alice', 'Bob', 'Zoe']]])(
    'refuse un ordre qui n est pas une permutation : %j',
    (order) => {
      lobby(['Alice', 'Bob', 'Chloe']).rejects(
        NARRATOR,
        { type: 'ReorderSeats', order },
        'INVALID_COMMAND',
      );
    },
  );

  it('« Configurer » fait passer en CONFIG, ou l on peut encore rejoindre', () => {
    const game = lobby(['Alice']).advance();

    expect(game.state.phase).toBe('CONFIG');
    game.as('Bob', { type: 'JoinGame', name: 'Bob' });
    expect(game.state.seats).toEqual(['Alice', 'Bob']);
  });

  it('seul le meneur avance la partie', () => {
    lobby(['Alice']).rejects(player('Alice'), { type: 'AdvancePhase' }, 'FORBIDDEN');
  });
});
