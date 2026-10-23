import type { PlayerView } from '@rougarou/protocol';
import { describe, expect, it } from 'vitest';

import { availableActions, projectView, REVEALING_EVENTS } from '../src/index.ts';
import {
  EIGHT_ROLES,
  firstNight,
  NARRATOR,
  player,
  setup,
  T0,
  types,
  type GameDriver,
} from './dsl.ts';

/**
 * File des effets a la mort (`R-42`, `R-44`, `R-46`), independamment des
 * roles : les effets sont mis en file par des evenements rejoues. Le
 * declenchement par le Chasseur et les amoureux est teste avec leurs roles.
 */

/** Aube du jour 1, morts annoncees : Hugo est mort, Chloe est Maire. */
function announcedDawn(): GameDriver {
  return firstNight(setup({ roles: EIGHT_ROLES }), 'Hugo')
    .replay({ type: 'MayorElected', playerId: 'Chloe', drawn: false })
    .advance();
}

function queueShot(game: GameDriver, from: string): GameDriver {
  return game.replay({ type: 'EffectQueued', effect: { kind: 'hunterShot', from } });
}

function shoot(game: GameDriver, from: string, target: string): GameDriver {
  return game.as(from, { type: 'HunterShoot', playerId: target });
}

describe('Tir en attente (R-42)', () => {
  it('seul le tireur en tete de file a une action : tirer sur un vivant', () => {
    const game = queueShot(announcedDawn(), 'Hugo');
    const [action] = availableActions(game.state, { kind: 'player', playerId: 'Hugo' });

    expect(action).toEqual({
      type: 'HunterShoot',
      targets: ['Alice', 'Bob', 'Chloe', 'David', 'Eve', 'Fanny', 'Gaspard'],
    });
    expect(availableActions(game.state, { kind: 'player', playerId: 'Chloe' })).toEqual([]);
  });

  it('la cible meurt avec la cause hunter', () => {
    const game = shoot(queueShot(announcedDawn(), 'Hugo'), 'Hugo', 'Alice');

    expect(types(game.last)).toEqual(['HunterShot', 'EffectResolved', 'PlayerKilled']);
    expect(game.last).toContainEqual(
      expect.objectContaining({ type: 'PlayerKilled', playerId: 'Alice', cause: 'hunter' }),
    );
    expect(game.state.pending).toEqual([]);
  });

  it('refuse un autre tireur, une cible morte et la mauvaise commande', () => {
    queueShot(announcedDawn(), 'Hugo')
      .rejects(player('Chloe'), { type: 'HunterShoot', playerId: 'Alice' }, 'NOT_YOUR_TURN')
      .rejects(player('Hugo'), { type: 'HunterShoot', playerId: 'Hugo' }, 'INVALID_TARGET')
      .rejects(player('Hugo'), { type: 'DesignateSuccessor', playerId: 'Alice' }, 'NOT_YOUR_TURN')
      .rejects(NARRATOR, { type: 'HunterShoot', playerId: 'Alice' }, 'FORBIDDEN');
  });

  it('les effets d une mort causee par la file s ajoutent a la fin', () => {
    const game = queueShot(
      queueShot(
        announcedDawn().replay({
          type: 'PlayerKilled',
          playerId: 'Gaspard',
          cause: 'wolves',
          roleRevealed: true,
        }),
        'Hugo',
      ),
      'Gaspard',
    );

    shoot(game, 'Hugo', 'Chloe');

    expect(game.state.pending).toEqual([
      { kind: 'hunterShot', from: 'Gaspard' },
      { kind: 'mayorSuccession', from: 'Chloe' },
    ]);
    expect(game.state.deadline).toBe(T0 + 30_000);
  });

  it('la file est publique, et un mort voit l action qui l attend', () => {
    const game = queueShot(announcedDawn(), 'Hugo');
    const view = projectView(game.state, { kind: 'player', playerId: 'David' }) as PlayerView;

    expect(view.pending).toEqual([{ kind: 'hunterShot', from: 'Hugo' }]);
  });
});

describe('Valeurs par defaut des effets (R-13, R-46)', () => {
  function twoEffects(): GameDriver {
    const game = queueShot(announcedDawn(), 'Hugo');

    return game.replay({
      type: 'EffectQueued',
      effect: { kind: 'mayorSuccession', from: 'Chloe' },
    });
  }

  it('a la fin du minuteur, seul l effet en tete prend sa valeur par defaut', () => {
    const game = twoEffects()
      .replay({ type: 'DeadlineSet', deadline: T0 + 30_000 })
      .expire();

    expect(types(game.last)).not.toContain('HunterShot');
    expect(game.state.pending).toEqual([{ kind: 'mayorSuccession', from: 'Chloe' }]);
    expect(game.state.deadline).toBe(T0 + 60_000);
    expect(game.state.phase).toBe('DAWN');
  });

  it('un forcage resout toute la file : pas de tir, successeur tire au sort', () => {
    const game = twoEffects().advance(true);

    expect(types(game.last)).not.toContain('HunterShot');
    expect(game.last).toContainEqual(
      expect.objectContaining({ type: 'MayorDesignated', from: 'Chloe', drawn: true }),
    );
    expect(game.state.pending).toEqual([]);
  });

  it('sans forcer, le meneur ne passe pas tant que la file attend', () => {
    twoEffects().rejects(NARRATOR, { type: 'AdvancePhase' }, 'PENDING_ACTIONS');
  });
});

describe('Infos privees et revelations (ADR 0010, R-45)', () => {
  it('une info n est vue que de son destinataire, et lui donne le role appris', () => {
    const game = setup({ roles: EIGHT_ROLES }).replay({
      type: 'KnowledgeGained',
      playerId: 'Chloe',
      knowledge: { kind: 'seerRole', night: 1, playerId: 'Alice', role: 'werewolf' },
    });
    const chloe = projectView(game.state, { kind: 'player', playerId: 'Chloe' }) as PlayerView;
    const david = projectView(game.state, { kind: 'player', playerId: 'David' }) as PlayerView;

    expect(chloe.me?.knowledge).toEqual([
      { kind: 'seerRole', night: 1, playerId: 'Alice', role: 'werewolf' },
    ]);
    expect(chloe.players.find((seen) => seen.id === 'Alice')?.role).toBe('werewolf');
    expect(david.me?.knowledge).toEqual([]);
    expect(david.players.find((seen) => seen.id === 'Alice')?.role).toBeNull();
  });

  it('une info perimee ne donne plus le role', () => {
    const game = setup({ roles: EIGHT_ROLES }).replay({
      type: 'KnowledgeGained',
      playerId: 'Chloe',
      knowledge: { kind: 'lover', playerId: 'Alice', role: 'villager' },
    });
    const chloe = projectView(game.state, { kind: 'player', playerId: 'Chloe' }) as PlayerView;

    expect(chloe.players.find((seen) => seen.id === 'Alice')?.role).toBeNull();
  });

  it('un role revele devient public', () => {
    const game = setup({ roles: EIGHT_ROLES }).replay({ type: 'RoleRevealed', playerId: 'David' });
    const eve = projectView(game.state, { kind: 'player', playerId: 'Eve' }) as PlayerView;

    expect(eve.players.find((seen) => seen.id === 'David')?.role).toBe('villager');
  });

  it('une info apprise, une revelation ou un tir ne s annulent pas (R-11)', () => {
    expect(
      ['KnowledgeGained', 'RoleRevealed', 'HunterShot'].every((type) =>
        REVEALING_EVENTS.has(type as never),
      ),
    ).toBe(true);
  });
});
