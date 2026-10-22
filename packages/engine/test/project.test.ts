import type { NarratorView, PlayerView } from '@rougarou/protocol';
import { describe, expect, it } from 'vitest';

import { availableActions, projectView, type GameState } from '../src/index.ts';
import { EIGHT_ROLES, electMayor, firstNight, setup, T0 } from './dsl.ts';

function viewOf(state: GameState, playerId: string): PlayerView {
  return projectView(state, { kind: 'player', playerId }) as PlayerView;
}

function narrator(state: GameState): NarratorView {
  return projectView(state, { kind: 'narrator' }) as NarratorView;
}

function rolesSeenBy(state: GameState, playerId: string): Record<string, string | null> {
  return Object.fromEntries(viewOf(state, playerId).players.map((seen) => [seen.id, seen.role]));
}

describe('Roles visibles (CLAUDE.md regle 2)', () => {
  it('un villageois ne connait que son propre role', () => {
    const roles = rolesSeenBy(setup({ roles: EIGHT_ROLES }).state, 'Chloe');

    expect(roles).toEqual({
      Alice: null,
      Bob: null,
      Chloe: 'villager',
      David: null,
      Eve: null,
      Fanny: null,
      Gaspard: null,
      Hugo: null,
    });
  });

  it('les loups se connaissent entre eux', () => {
    const roles = rolesSeenBy(setup({ roles: EIGHT_ROLES }).state, 'Alice');

    expect(roles.Bob).toBe('werewolf');
    expect(roles.Chloe).toBeNull();
  });

  it('R-43 : le role d un mort est revele a tous ; sans l option, il reste cache', () => {
    const shown = firstNight(setup({ roles: EIGHT_ROLES }), 'Hugo').advance();
    const hidden = firstNight(
      setup({ roles: EIGHT_ROLES, options: { revealRoleOnDeath: false } }),
      'Hugo',
    ).advance();

    expect(rolesSeenBy(shown.state, 'Chloe').Hugo).toBe('villager');
    expect(rolesSeenBy(hidden.state, 'Chloe').Hugo).toBeNull();
  });

  it('R-60 : un mort voit tous les roles avec deadSeeRoles, aucun sans', () => {
    const seeing = firstNight(setup({ roles: EIGHT_ROLES }), 'Hugo').advance();
    const blind = firstNight(
      setup({ roles: EIGHT_ROLES, options: { deadSeeRoles: false } }),
      'Hugo',
    ).advance();

    expect(rolesSeenBy(seeing.state, 'Hugo').Alice).toBe('werewolf');
    expect(rolesSeenBy(blind.state, 'Hugo').Alice).toBeNull();
  });

  it('le meneur voit tout', () => {
    const view = narrator(setup({ roles: EIGHT_ROLES }).state);

    expect(view.players.map((seen) => seen.role)).toEqual(Object.values(EIGHT_ROLES));
  });
});

describe('Nuit et aube (R-12, docs/12 §4)', () => {
  it('les loups voient le vote de la meute et leur minuteur ; les autres rien', () => {
    const game = setup({ roles: EIGHT_ROLES }).advance().wolfVote('Alice', 'Chloe');

    expect(viewOf(game.state, 'Bob')).toMatchObject({
      night: { step: 'wolves', resolved: false, wolfVotes: { Alice: 'Chloe' } },
      deadline: T0 + 90_000,
    });
    expect(viewOf(game.state, 'Chloe')).toMatchObject({ night: null, deadline: null, actions: [] });
  });

  it('avant « Lever le jour », les joueurs sont encore dans la nuit ; le meneur voit les morts', () => {
    const game = firstNight(setup({ roles: EIGHT_ROLES }), 'Chloe');

    expect(viewOf(game.state, 'David')).toMatchObject({ phase: 'NIGHT', deaths: null });
    expect(narrator(game.state).dawn).toEqual({
      deaths: [{ playerId: 'Chloe', cause: 'wolves' }],
      announced: false,
    });
  });

  it('apres l annonce, les morts sont publiques, sans leur cause', () => {
    const game = firstNight(setup({ roles: EIGHT_ROLES }), 'Chloe').advance();

    expect(viewOf(game.state, 'David')).toMatchObject({ phase: 'DAWN', deaths: ['Chloe'] });
  });
});

describe('Vote secret (R-30)', () => {
  function secretVote() {
    return electMayor(
      firstNight(setup({ roles: EIGHT_ROLES, options: { voteVisibility: 'secret' } }), 'Hugo')
        .advance()
        .advance(),
      'Chloe',
    )
      .advance()
      .votes({ Chloe: 'Alice', David: 'Bob' });
  }

  it('chacun ne voit que son bulletin', () => {
    expect(viewOf(secretVote().state, 'Chloe').vote?.ballots).toEqual({
      Chloe: { kind: 'player', playerId: 'Alice' },
    });
    expect(viewOf(secretVote().state, 'Eve').vote?.ballots).toEqual({});
  });

  it('apres la cloture, on voit l issue mais pas le decompte ; le meneur voit tout', () => {
    const game = secretVote().advance();

    expect(viewOf(game.state, 'Eve').vote).toMatchObject({
      tally: null,
      outcome: { kind: 'execute', playerId: 'Alice' },
    });
    expect(narrator(game.state).vote?.tally).toEqual({ Alice: 2, Bob: 1 });
  });
});

describe('Actions possibles', () => {
  it('le meneur voit quand il doit forcer', () => {
    const game = setup({ roles: EIGHT_ROLES }).advance();

    expect(availableActions(game.state, { kind: 'narrator' })).toEqual([
      { type: 'AdvancePhase', blocked: true },
      { type: 'PauseTimer' },
      { type: 'ExtendTimer' },
    ]);
  });

  it('apres la distribution, un inconnu ne peut plus rejoindre, et personne n a encore vote', () => {
    const game = setup({ roles: EIGHT_ROLES });

    expect(availableActions(game.state, { kind: 'player', playerId: 'Zoe' })).toEqual([]);
    expect(narrator(game.state).everyoneVoted).toBe(false);
  });

  it('une partie terminee ne propose plus rien', () => {
    const roles = {
      Alice: 'werewolf',
      Bob: 'werewolf',
      Chloe: 'werewolf',
      David: 'werewolf',
      Eve: 'villager',
    } as const;
    const game = firstNight(setup({ roles }), 'Eve').advance();

    expect(availableActions(game.state, { kind: 'narrator' })).toEqual([]);
    expect(viewOf(game.state, 'Eve').winner).toBe('wolves');
  });
});
