import { gameOptionsSchema, type PlayerView } from '@rougarou/protocol';
import { describe, expect, it } from 'vitest';

import { cuesOf, phaseTheme, type Cue } from '../src/ambience/cues.ts';
import { soundFor, vibrationFor } from '../src/ambience/feedback.ts';

function player(overrides: Partial<PlayerView> = {}): PlayerView {
  return {
    kind: 'player',
    gameId: 'g',
    phase: 'DAY_DEBATE',
    me: { id: 'p1', role: 'villager', alive: true, roleSeen: true, knowledge: [] },
    players: [
      { id: 'p1', name: 'Alice', alive: true, mayor: false, role: 'villager' },
      { id: 'p2', name: 'Bob', alive: true, mayor: false, role: null },
    ],
    options: gameOptionsSchema.parse({}),
    composition: {},
    nightNumber: 1,
    deadline: null,
    pausedRemaining: null,
    ceremony: null,
    night: null,
    deaths: null,
    election: null,
    vote: null,
    pending: [],
    winner: null,
    journal: null,
    actions: [],
    ...overrides,
  };
}

const dead = player({
  me: { id: 'p1', role: 'villager', alive: false, roleSeen: true, knowledge: [] },
  players: [
    { id: 'p1', name: 'Alice', alive: false, mayor: false, role: 'villager' },
    { id: 'p2', name: 'Bob', alive: true, mayor: false, role: null },
  ],
});

describe('Theme de phase (docs/06)', () => {
  it.each([
    [null, 'night'],
    ['LOBBY', 'night'],
    ['DEAL', 'night'],
    ['NIGHT', 'night'],
    ['DAWN', 'day'],
    ['DAY_VOTE', 'day'],
    ['ENDED', 'day'],
  ] as const)('%s → %s', (phase, theme) => {
    expect(phaseTheme(phase)).toBe(theme);
  });
});

describe('Moments de la partie', () => {
  it('la premiere vue ne declenche rien', () => {
    expect(cuesOf(null, player())).toEqual([]);
  });

  it.each([
    [
      'la carte arrive',
      player({ phase: 'DEAL', me: null }),
      player({ phase: 'DEAL' }),
      'cardDealt',
    ],
    ['la nuit tombe', player(), player({ phase: 'NIGHT' }), 'nightfall'],
    [
      'c est son tour',
      player({ phase: 'NIGHT' }),
      player({ phase: 'NIGHT', actions: [{ type: 'ConfirmRoleSeen' }] }),
      'yourTurn',
    ],
    ['le jour se leve', player({ phase: 'NIGHT' }), player({ phase: 'DAWN' }), 'daybreak'],
    ['une mort', player(), dead, 'death'],
    ['sa propre mort', player(), dead, 'youDied'],
    ['la fin', player(), player({ phase: 'ENDED' }), 'victory'],
  ] as [string, PlayerView, PlayerView, Cue][])('%s', (_name, before, after, cue) => {
    expect(cuesOf(before, after)).toContain(cue);
  });

  it('le vote qui s ouvre puis se clot', () => {
    const vote = {
      candidates: ['p1', 'p2'],
      spare: true,
      round: 1 as const,
      tie: null,
      tieBroken: null,
      closed: false,
      ballots: {},
      tally: null,
      outcome: null,
    };
    const open = player({ phase: 'DAY_VOTE', vote });

    expect(cuesOf(player(), open)).toContain('voteOpen');
    expect(cuesOf(open, player({ phase: 'DAY_VOTE', vote: { ...vote, closed: true } }))).toContain(
      'voteClose',
    );
  });
});

describe('Sons et vibrations (docs/12 §5, D-03)', () => {
  const day = { playMode: 'inPerson', night: false } as const;
  const nightInPerson = { playMode: 'inPerson', night: true } as const;
  const nightRemote = { playMode: 'remote', night: true } as const;

  it('jamais de vibration la nuit en presentiel', () => {
    for (const cue of ['yourTurn', 'youDied', 'voteOpen', 'cardDealt', 'victory'] as const) {
      expect(vibrationFor(cue, nightInPerson)).toBeNull();
    }
  });

  it('« c est ton tour » ne vibre qu a distance', () => {
    expect(vibrationFor('yourTurn', nightRemote)).not.toBeNull();
    expect(vibrationFor('yourTurn', { playMode: 'inPerson', night: false })).toBeNull();
  });

  it('la carte, le vote ouvert, sa mort et la fin vibrent de jour', () => {
    for (const cue of ['cardDealt', 'voteOpen', 'youDied', 'victory'] as const) {
      expect(vibrationFor(cue, day)).not.toBeNull();
    }

    expect(vibrationFor('death', day)).toBeNull();
  });

  it('le meneur n entend que les sons publics', () => {
    expect(soundFor('nightfall')).toBe('nightfall');
    expect(soundFor('voteClose')).toBe('gong');
    expect(soundFor('yourTurn')).toBeNull();
    expect(soundFor('cardDealt')).toBeNull();
    expect(soundFor('youDied')).toBeNull();
  });
});
