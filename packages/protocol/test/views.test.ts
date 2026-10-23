import { describe, expect, it } from 'vitest';

import {
  actionDescriptorSchema,
  knowledgeSchema,
  narratorViewSchema,
  playerViewSchema,
} from '../src/index.ts';

/** Une vue de joueur minimale, a la table, valide pour son schema strict. */
const playerView = {
  kind: 'player',
  gameId: 'game-1',
  phase: 'DAY_DEBATE',
  me: { id: 'p1', role: 'villager', alive: true, roleSeen: true, knowledge: [] },
  players: [],
  options: {},
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
  actions: [],
};

describe('Infos privees (ADR 0010)', () => {
  it.each([
    { kind: 'seerRole', night: 1, playerId: 'p2', role: 'werewolf' },
    { kind: 'seerTeam', night: 2, playerId: 'p2', team: 'village' },
    { kind: 'couple', players: ['p2', 'p3'] },
    { kind: 'lover', playerId: 'p3', role: 'witch' },
    { kind: 'wolfGlimpse', night: 1, masks: [['A', null, ' ', null, 'e']] },
    { kind: 'littleGirlSuspects', night: 3, players: ['p1', 'p4', 'p6'] },
  ])('accepte une info $kind', (knowledge) => {
    expect(knowledgeSchema.safeParse(knowledge).success).toBe(true);
  });

  it('refuse une info inconnue ou un champ en trop', () => {
    expect(knowledgeSchema.safeParse({ kind: 'secret', playerId: 'p2' }).success).toBe(false);
    expect(
      knowledgeSchema.safeParse({ kind: 'lover', playerId: 'p3', role: 'witch', wolf: 'p4' })
        .success,
    ).toBe(false);
  });

  it('un couple compte exactement deux joueurs', () => {
    expect(knowledgeSchema.safeParse({ kind: 'couple', players: ['p2'] }).success).toBe(false);
  });

  it('les infos font partie de la vue du joueur', () => {
    const view = {
      ...playerView,
      me: { ...playerView.me, knowledge: [{ kind: 'lover', playerId: 'p3', role: 'witch' }] },
    };

    expect(playerViewSchema.safeParse(view).success).toBe(true);
    expect(
      playerViewSchema.safeParse({ ...playerView, me: { ...playerView.me, knowledge: undefined } })
        .success,
    ).toBe(false);
  });
});

describe('Effets a la mort et issues (R-03, R-42)', () => {
  it('la file accepte le tir du Chasseur et la succession du Maire', () => {
    const view = {
      ...playerView,
      pending: [
        { kind: 'hunterShot', from: 'p2' },
        { kind: 'mayorSuccession', from: 'p2' },
      ],
    };

    expect(playerViewSchema.safeParse(view).success).toBe(true);
  });

  it('le couple mixte est une issue de partie', () => {
    expect(playerViewSchema.safeParse({ ...playerView, winner: 'lovers' }).success).toBe(true);
    expect(playerViewSchema.safeParse({ ...playerView, winner: 'couple' }).success).toBe(false);
  });
});

describe('Actions de nuit proposees', () => {
  it('chaque genre d action de nuit a sa forme', () => {
    expect(
      actionDescriptorSchema.safeParse({
        type: 'SubmitNightAction',
        kind: 'wolfVote',
        targets: ['p2'],
      }).success,
    ).toBe(true);
    expect(
      actionDescriptorSchema.safeParse({ type: 'SubmitNightAction', kind: 'nope', targets: [] })
        .success,
    ).toBe(false);
  });

  it('le tir du Chasseur est une action proposee', () => {
    expect(actionDescriptorSchema.safeParse({ type: 'HunterShoot', targets: ['p2'] }).success).toBe(
      true,
    );
  });
});

describe('Vue du meneur', () => {
  it('les causes de mort de M3 et les infos de chaque joueur y figurent', () => {
    const view = {
      kind: 'narrator',
      gameId: 'game-1',
      phase: 'DAWN',
      players: [
        {
          id: 'p1',
          name: 'Alice',
          alive: false,
          mayor: false,
          role: 'seer',
          roleSeen: true,
          roleRevealed: false,
          knowledge: [{ kind: 'seerRole', night: 1, playerId: 'p2', role: 'werewolf' }],
        },
      ],
      options: {},
      composition: {},
      nightNumber: 1,
      deadline: null,
      pausedRemaining: null,
      ceremony: null,
      night: null,
      lovers: null,
      potions: {},
      dawn: {
        deaths: ['wolves', 'witch', 'hunter', 'grief', 'vote'].map((cause) => ({
          playerId: 'p1',
          cause,
        })),
        announced: false,
      },
      election: null,
      vote: null,
      pending: [],
      winner: null,
      everyoneVoted: false,
      actions: [],
    };

    expect(narratorViewSchema.safeParse(view).success).toBe(true);
  });
});
