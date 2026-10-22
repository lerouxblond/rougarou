import type { GameOptionsInput, PlayerView } from '@rougarou/protocol';
import { describe, expect, it } from 'vitest';

import { availableActions, projectView } from '../../src/index.ts';
import { firstNight, NARRATOR, player, setup, T0, types, type GameDriver } from '../dsl.ts';

/** Chasseur (`docs/02`, P20) : David ; les loups sont Alice et Bob. */
const ROLES = {
  Alice: 'werewolf',
  Bob: 'werewolf',
  Chloe: 'villager',
  David: 'hunter',
  Eve: 'villager',
  Fanny: 'villager',
  Gaspard: 'villager',
  Hugo: 'villager',
} as const;

/** Les loups tuent `victim` la nuit 1, puis le meneur leve le jour. */
function dawnKill(victim: string, options: GameOptionsInput = {}): GameDriver {
  return firstNight(setup({ roles: ROLES, options }), victim).advance();
}

function roleSeenBy(game: GameDriver, viewer: string, target: string) {
  const view = projectView(game.state, { kind: 'player', playerId: viewer }) as PlayerView;

  return view.players.find((seen) => seen.id === target)?.role ?? null;
}

describe('Chasseur : tir a sa mort (docs/02, R-42)', () => {
  it('mort la nuit, il tire a l aube, une fois les morts annoncees', () => {
    const night = firstNight(setup({ roles: ROLES }), 'David');

    expect(night.state.pending).toEqual([]);
    night.advance();
    expect(night.state.pending).toEqual([{ kind: 'hunterShot', from: 'David' }]);
    expect(night.state.deadline).toBe(T0 + 30_000);
    expect(availableActions(night.state, { kind: 'player', playerId: 'David' })).toEqual([
      {
        type: 'HunterShoot',
        targets: ['Alice', 'Bob', 'Chloe', 'Eve', 'Fanny', 'Gaspard', 'Hugo'],
      },
    ]);

    night.shoot('David', 'Alice');
    expect(night.state.players.Alice?.alive).toBe(false);
    expect(night.last).toContainEqual(
      expect.objectContaining({ type: 'PlayerKilled', playerId: 'Alice', cause: 'hunter' }),
    );
    expect(night.state.pending).toEqual([]);
  });

  it('execute, il tire aussi', () => {
    const game = dawnKill('Hugo', { mayor: false }).advance().advance();

    game.votes({ Alice: 'David', Bob: 'David', Chloe: 'David', David: 'Alice' }).advance();
    expect(game.state.phase).toBe('EXECUTION');
    expect(game.state.pending).toEqual([{ kind: 'hunterShot', from: 'David' }]);
    game
      .rejects(NARRATOR, { type: 'AdvancePhase' }, 'PENDING_ACTIONS')
      .shoot('David', 'Bob')
      .advance();
    expect(game.state.players.Bob?.alive).toBe(false);
    expect(game.state.phase).toBe('NIGHT');
  });

  it('a la fin du minuteur ou en forcant, il ne tire pas', () => {
    const expired = dawnKill('David').expire();
    const forced = dawnKill('David').advance(true);

    for (const game of [expired, forced]) {
      expect(types(game.last)).not.toContain('HunterShot');
      expect(game.state.pending).toEqual([]);
      expect(game.state.players.Alice?.alive).toBe(true);
    }

    // A l'expiration, c'est le meneur qui passe au jour (R-14).
    expect(expired.state.phase).toBe('DAWN');
    expect(forced.state.phase).toBe('MAYOR_ELECTION');
  });

  it('seul le Chasseur tire, une seule fois, et sur un vivant', () => {
    dawnKill('David')
      .rejects(player('Chloe'), { type: 'HunterShoot', playerId: 'Alice' }, 'NOT_YOUR_TURN')
      .rejects(player('David'), { type: 'HunterShoot', playerId: 'David' }, 'INVALID_TARGET')
      .shoot('David', 'Alice')
      .rejects(player('David'), { type: 'HunterShoot', playerId: 'Bob' }, 'NOT_YOUR_TURN');
  });

  it('Chasseur et Maire : il tire, puis designe son successeur', () => {
    const game = setup({ roles: ROLES })
      .replay({ type: 'MayorElected', playerId: 'David', drawn: false })
      .advance()
      .wolfVote('Alice', 'David')
      .wolfVote('Bob', 'David')
      .advance();

    expect(game.state.pending).toEqual([
      { kind: 'hunterShot', from: 'David' },
      { kind: 'mayorSuccession', from: 'David' },
    ]);
    game
      .rejects(player('David'), { type: 'DesignateSuccessor', playerId: 'Chloe' }, 'NOT_YOUR_TURN')
      .shoot('David', 'Alice');
    expect(availableActions(game.state, { kind: 'player', playerId: 'David' })[0]?.type).toBe(
      'DesignateSuccessor',
    );
    game.as('David', { type: 'DesignateSuccessor', playerId: 'Chloe' });
    expect(game.state.mayor).toBe('Chloe');
  });

  it('un tir sur le dernier loup donne la victoire au village', () => {
    const roles = {
      Alice: 'werewolf',
      Bob: 'hunter',
      Chloe: 'villager',
      David: 'villager',
      Eve: 'villager',
    } as const;
    const game = firstNight(setup({ roles }), 'Bob').advance().shoot('Bob', 'Alice');

    expect(game.state.phase).toBe('ENDED');
    expect(game.state.winner).toBe('village');
  });

  it('il tire meme si sa mort donnait deja la victoire (R-44)', () => {
    const roles = {
      Alice: 'werewolf',
      Bob: 'werewolf',
      Chloe: 'hunter',
      David: 'villager',
      Eve: 'villager',
    } as const;
    const game = firstNight(
      setup({ roles, options: { wolvesWinOnParity: true } }),
      'Chloe',
    ).advance();

    expect(game.state.phase).toBe('DAWN');
    game.shoot('Chloe', 'Alice');
    expect(game.state.phase).toBe('DAWN');
    expect(game.state.winner).toBeNull();
  });
});

describe('Chasseur : revelation (R-45)', () => {
  it('son role est public des que son tir est attendu, meme sans revealRoleOnDeath', () => {
    const night = firstNight(
      setup({ roles: ROLES, options: { revealRoleOnDeath: false } }),
      'David',
    );

    expect(roleSeenBy(night, 'Chloe', 'David')).toBeNull();
    night.advance();
    expect(roleSeenBy(night, 'Chloe', 'David')).toBe('hunter');
    expect(types(night.last)).toContain('RoleRevealed');
  });

  it('sa victime, elle, garde son secret sans revealRoleOnDeath', () => {
    const game = dawnKill('David', { revealRoleOnDeath: false }).shoot('David', 'Chloe');

    expect(roleSeenBy(game, 'Eve', 'Chloe')).toBeNull();
  });
});
