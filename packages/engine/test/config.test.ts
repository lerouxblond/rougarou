import { ROLE_WEIGHTS, type Composition, type RoleId } from '@rougarou/protocol';
import { describe, expect, it } from 'vitest';

import {
  compositionIssues,
  findRole,
  getMode,
  projectView,
  registeredRoles,
} from '../src/index.ts';
import { NARRATOR, newGame, player, setup, types } from './dsl.ts';

const FIVE = ['Alice', 'Bob', 'Chloe', 'David', 'Eve'];

function configured(names: readonly string[], composition: Composition) {
  const game = newGame(7);

  for (const name of names) {
    game.as(name, { type: 'JoinGame', name });
  }

  return game.advance().narrator({ type: 'SetComposition', composition });
}

describe('Options (R-15)', () => {
  it('le meneur regle les options en CONFIG', () => {
    const game = newGame()
      .advance()
      .narrator({ type: 'SetOptions', options: { tieBreak: 'revote' } });

    expect(game.state.options.tieBreak).toBe('revote');
    expect(game.state.options.mayor).toBe(true);
  });

  it('refuse de regler les options hors de CONFIG', () => {
    newGame().rejects(NARRATOR, { type: 'SetOptions', options: {} }, 'WRONG_PHASE');
  });

  it('un joueur ne regle pas les options', () => {
    const game = newGame().as('Alice', { type: 'JoinGame', name: 'Alice' }).advance();

    game.rejects(player('Alice'), { type: 'SetOptions', options: {} }, 'FORBIDDEN');
  });

  it.each([
    [{ roleplay: true }, 'errors.options.roleplay_unavailable'],
    [{ parallelNight: true }, 'errors.options.parallel_night_unavailable'],
    [{ gameMode: 'vampire' as const }, 'errors.options.mode_unavailable'],
  ])('refuse une option pas encore prise en charge : %j', (options, messageKey) => {
    const result = newGame().advance().send(NARRATOR, { type: 'SetOptions', options });

    expect(result).toEqual({
      ok: false,
      error: { code: 'UNSUPPORTED_OPTION', messageKey },
    });
  });
});

describe('Composition (R-07)', () => {
  it('refuse de fixer la composition hors de CONFIG', () => {
    newGame().rejects(NARRATOR, { type: 'SetComposition', composition: {} }, 'WRONG_PHASE');
  });

  it('accepte 1 loup et 4 villageois a 5 joueurs', () => {
    expect(compositionIssues(configured(FIVE, { werewolf: 1, villager: 4 }).state)).toEqual([]);
  });

  it.each<[string, readonly string[], Composition, string]>([
    [
      'un nombre de roles different du nombre de joueurs',
      FIVE,
      { werewolf: 1, villager: 3 },
      'errors.composition.count_mismatch',
    ],
    ['aucun loup', FIVE, { villager: 5 }, 'errors.composition.no_wolf'],
    [
      'autant de loups que de non-loups',
      ['a', 'b', 'c', 'd', 'e', 'f'],
      { werewolf: 3, villager: 3 },
      'errors.composition.too_many_wolves',
    ],
    [
      'moins de 5 joueurs (D-07)',
      ['a', 'b', 'c', 'd'],
      { werewolf: 1, villager: 3 },
      'errors.composition.player_count',
    ],
    [
      'un role pas encore implemente',
      FIVE,
      { werewolf: 1, guardian: 1, villager: 3 },
      'errors.composition.role_unavailable',
    ],
  ])('refuse %s', (_label, names, composition, messageKey) => {
    const game = configured(names, composition);

    expect(compositionIssues(game.state)).toContain(messageKey);
    game.rejects(NARRATOR, { type: 'Deal' }, 'INVALID_COMPOSITION');
    expect(game.state.phase).toBe('CONFIG');
  });

  it('refuse plus de 24 joueurs dans la composition du mode (D-07)', () => {
    expect(
      getMode('classic').validateComposition({ werewolf: 5, villager: 20 }, 25),
    ).toContainEqual({
      messageKey: 'errors.composition.player_count',
    });
  });
});

describe('Composition suggeree (docs/02)', () => {
  it.each([
    [5, 1],
    [8, 2],
    [12, 3],
    [16, 4],
    [24, 5],
  ])('a %i joueurs, propose %i loups et complete avec des villageois', (count, wolves) => {
    const composition = getMode('classic').suggestComposition(count);

    expect(composition.werewolf).toBe(wolves);
    expect(Object.values(composition).reduce((sum, n) => sum + n, 0)).toBe(count);
  });
  it.each(Array.from({ length: 20 }, (_, index) => index + 5))(
    'a %i joueurs, la suggestion est une composition valide, sans role a venir (R-07)',
    (count) => {
      const names = Array.from({ length: count }, (_, index) => `p${index}`);
      const suggestion = getMode('classic').suggestComposition(count);
      const game = configured(names, suggestion);

      expect(compositionIssues(game.state)).toEqual([]);
      expect(Object.keys(suggestion).every((role) => findRole(role as RoleId))).toBe(true);
    },
  );

  it('chaque role du moteur a un poids d equilibre (docs/02)', () => {
    for (const role of registeredRoles()) {
      expect(ROLE_WEIGHTS[role.id], role.id).toBeTypeOf('number');
    }
  });

  it('le meneur voit la suggestion pour le nombre de joueurs, en CONFIG seulement', () => {
    const game = configured(FIVE, {});
    const view = projectView(game.state, { kind: 'narrator' });

    expect(view.kind === 'narrator' && view.suggestion).toEqual(
      getMode('classic').suggestComposition(5),
    );

    const dealt = setup({
      roles: {
        Alice: 'werewolf',
        Bob: 'villager',
        Chloe: 'villager',
        David: 'villager',
        Eve: 'villager',
      },
    });
    const later = projectView(dealt.state, { kind: 'narrator' });

    expect(later.kind === 'narrator' && later.suggestion).toBeNull();
  });
});

describe('Distribution', () => {
  it('distribue un role par joueur, selon la composition, et passe en DEAL', () => {
    const game = configured(FIVE, { werewolf: 1, villager: 4 }).narrator({ type: 'Deal' });
    const roles = FIVE.map((name) => game.state.players[name]?.role);

    expect(game.state.phase).toBe('DEAL');
    expect(roles.filter((role) => role === 'werewolf')).toHaveLength(1);
    expect(roles.filter((role) => role === 'villager')).toHaveLength(4);
    expect(types(game.last)).toEqual(['RolesDealt', 'PhaseChanged']);
  });

  it('range la graine dans RolesDealt : meme graine, meme distribution (ADR 0002)', () => {
    const first = configured(FIVE, { werewolf: 2, villager: 3 }).narrator({ type: 'Deal' });
    const second = configured(FIVE, { werewolf: 2, villager: 3 }).narrator({ type: 'Deal' });

    expect(first.state.seed).not.toBeNull();
    expect(second.state.players).toEqual(first.state.players);
  });

  it('une autre graine donne une autre distribution', () => {
    const names = Array.from({ length: 12 }, (_, index) => `p${index}`);
    const deals = [1, 2, 3].map((seed) => {
      const game = newGame(seed);

      for (const name of names) {
        game.as(name, { type: 'JoinGame', name });
      }

      return game
        .advance()
        .narrator({ type: 'SetComposition', composition: { werewolf: 3, villager: 9 } })
        .narrator({ type: 'Deal' }).state.players;
    });

    expect(new Set(deals.map((players) => JSON.stringify(players))).size).toBeGreaterThan(1);
  });

  it('refuse de distribuer hors de CONFIG', () => {
    newGame().rejects(NARRATOR, { type: 'Deal' }, 'WRONG_PHASE');
  });
});

describe('Voir son role (DEAL)', () => {
  const roles = {
    Alice: 'werewolf',
    Bob: 'villager',
    Chloe: 'villager',
    David: 'villager',
    Eve: 'villager',
  } as const;

  it('chaque joueur confirme ; une seconde confirmation ne produit rien', () => {
    const game = setup({ roles });

    expect(game.state.players.Alice?.roleSeen).toBe(true);
    game.as('Alice', { type: 'ConfirmRoleSeen' });
    expect(game.last).toEqual([]);
  });

  it('refuse une confirmation hors de DEAL', () => {
    newGame()
      .as('Alice', { type: 'JoinGame', name: 'Alice' })
      .rejects(player('Alice'), { type: 'ConfirmRoleSeen' }, 'WRONG_PHASE');
  });

  it('le meneur lance la nuit quand tout le monde a vu son role', () => {
    const game = setup({ roles }).advance();

    expect(game.state.phase).toBe('NIGHT');
    expect(game.state.nightNumber).toBe(1);
  });

  it('refuse de lancer la nuit tant qu un joueur n a pas confirme, sauf en forcant (R-10, R-13)', () => {
    const game = newGame();

    for (const name of FIVE) {
      game.as(name, { type: 'JoinGame', name });
    }

    game
      .advance()
      .narrator({ type: 'SetComposition', composition: { werewolf: 1, villager: 4 } })
      .narrator({ type: 'Deal' })
      .rejects(NARRATOR, { type: 'AdvancePhase' }, 'PENDING_ACTIONS')
      .advance(true);

    expect(game.state.phase).toBe('NIGHT');
    expect(types(game.last)).toContain('PhaseForced');
  });

  it('le salon est ferme une fois les roles distribues', () => {
    setup({ roles })
      .rejects(player('Zoe'), { type: 'JoinGame', name: 'Zoe' }, 'WRONG_PHASE')
      .rejects(player('Alice'), { type: 'LeaveGame' }, 'WRONG_PHASE')
      .rejects(NARRATOR, { type: 'KickPlayer', playerId: 'Bob' }, 'WRONG_PHASE')
      .rejects(NARRATOR, { type: 'ReorderSeats', order: [] }, 'WRONG_PHASE');
  });
});
