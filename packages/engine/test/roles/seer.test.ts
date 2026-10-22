import type { PlayerView } from '@rougarou/protocol';
import { describe, expect, it } from 'vitest';

import { availableActions, projectView } from '../../src/index.ts';
import { player, setup, T0, toNextNight, types } from '../dsl.ts';

/** Voyante (`docs/02`) : Bob sonde ; Alice est le loup. */
const ROLES = {
  Alice: 'werewolf',
  Bob: 'seer',
  Chloe: 'villager',
  David: 'villager',
  Eve: 'villager',
} as const;

function seerNight(options = {}) {
  return setup({ roles: ROLES, options }).advance();
}

function knowledgeOf(game: ReturnType<typeof setup>, id: string) {
  return game.state.players[id]?.knowledge;
}

describe('Voyante : sonder (docs/02, R-21)', () => {
  it('se reveille avant les loups (ordre 30), avec le minuteur des actions de nuit', () => {
    const game = seerNight();

    expect(game.state.night?.steps).toEqual(['seer', 'wolves']);
    expect(game.state.night?.current).toBe(0);
    expect(game.state.deadline).toBe(T0 + 45_000);
  });

  it('propose de sonder un vivant autre qu elle', () => {
    expect(availableActions(seerNight().state, { kind: 'player', playerId: 'Bob' })).toEqual([
      {
        type: 'SubmitNightAction',
        kind: 'seerProbe',
        targets: ['Alice', 'Chloe', 'David', 'Eve'],
      },
    ]);
  });

  it('le role sonde entre aussitot dans ses infos et l etape se resout', () => {
    const game = seerNight().seerProbe('Bob', 'Alice');

    expect(knowledgeOf(game, 'Bob')).toEqual([
      { kind: 'seerRole', night: 1, playerId: 'Alice', role: 'werewolf' },
    ]);
    expect(types(game.last)).toContain('NightStepResolved');
    expect(game.state.night?.current).toBe(1);
  });

  it('avec seerMode team, elle n apprend que le camp effectif', () => {
    const game = seerNight({ seerMode: 'team' }).seerProbe('Bob', 'Alice').wolfVote('Alice', 'Eve');

    expect(knowledgeOf(game, 'Bob')).toEqual([
      { kind: 'seerTeam', night: 1, playerId: 'Alice', team: 'wolves' },
    ]);
  });

  it('le role sonde apparait dans sa liste des joueurs, pas le camp seul', () => {
    const role = seerNight().seerProbe('Bob', 'Alice');
    const team = seerNight({ seerMode: 'team' }).seerProbe('Bob', 'Alice');
    const roleOf = (game: typeof role) =>
      (projectView(game.state, { kind: 'player', playerId: 'Bob' }) as PlayerView).players.find(
        (seen) => seen.id === 'Alice',
      )?.role;

    expect(roleOf(role)).toBe('werewolf');
    expect(roleOf(team)).toBeNull();
  });

  it('refuse de se sonder, un mort, un inconnu et une autre action', () => {
    seerNight()
      .rejects(
        player('Bob'),
        { type: 'SubmitNightAction', action: { kind: 'seerProbe', target: 'Bob' } },
        'INVALID_TARGET',
      )
      .rejects(
        player('Bob'),
        { type: 'SubmitNightAction', action: { kind: 'seerProbe', target: 'Zoe' } },
        'UNKNOWN_PLAYER',
      )
      .rejects(
        player('Bob'),
        { type: 'SubmitNightAction', action: { kind: 'wolfVote', target: 'Alice' } },
        'INVALID_COMMAND',
      );

    // Nuit 2 : Eve est morte la nuit 1.
    const game = toNextNight(seerNight().seerProbe('Bob', 'Chloe').wolfVote('Alice', 'Eve'));

    expect(game.state.phase).toBe('NIGHT');
    game.rejects(
      player('Bob'),
      { type: 'SubmitNightAction', action: { kind: 'seerProbe', target: 'Eve' } },
      'INVALID_TARGET',
    );
  });

  it('une seule fois par nuit', () => {
    const game = seerNight({ pilotMode: 'manual' }).seerProbe('Bob', 'Chloe');

    expect(game.state.night).toMatchObject({ current: 0, stepResolved: true });
    game.rejects(
      player('Bob'),
      { type: 'SubmitNightAction', action: { kind: 'seerProbe', target: 'David' } },
      'WRONG_PHASE',
    );
    expect(knowledgeOf(game, 'Bob')).toHaveLength(1);
  });

  it('seule la Voyante sonde, et un loup ne sonde pas pendant son vote', () => {
    seerNight().rejects(
      player('Chloe'),
      { type: 'SubmitNightAction', action: { kind: 'seerProbe', target: 'Alice' } },
      'NOT_YOUR_TURN',
    );
    seerNight()
      .seerProbe('Bob', 'Chloe')
      .rejects(
        player('Alice'),
        { type: 'SubmitNightAction', action: { kind: 'seerProbe', target: 'Bob' } },
        'INVALID_COMMAND',
      );
  });

  it('a la fin du minuteur ou en forcant, elle ne sonde personne', () => {
    const expired = seerNight().expire();
    const forced = seerNight().advance(true);

    for (const game of [expired, forced]) {
      expect(knowledgeOf(game, 'Bob')).toEqual([]);
      expect(game.state.night?.current).toBe(1);
    }

    expect(types(forced.last)).toContain('PhaseForced');
  });

  it('morte, elle est appelee pour rien en presentiel et sautee a distance (R-20)', () => {
    const killSeer = (playMode: 'inPerson' | 'remote') => {
      const game = setup({ roles: ROLES, options: { playMode } })
        .advance()
        .seerProbe('Bob', 'Chloe')
        .wolfVote('Alice', 'Bob');

      return toNextNight(game);
    };

    const inPerson = killSeer('inPerson');
    const remote = killSeer('remote');

    expect(inPerson.state.night?.steps).toEqual(['seer', 'wolves']);
    expect(inPerson.state.night?.current).toBe(1);
    expect(remote.state.night?.steps).toEqual(['wolves']);
  });

  it('le meneur voit le resultat dans les infos de la Voyante', () => {
    const game = seerNight().seerProbe('Bob', 'Alice');
    const view = projectView(game.state, { kind: 'narrator' });

    expect(
      view.kind === 'narrator' && view.players.find((seen) => seen.id === 'Bob')?.knowledge,
    ).toEqual([{ kind: 'seerRole', night: 1, playerId: 'Alice', role: 'werewolf' }]);
  });
});
