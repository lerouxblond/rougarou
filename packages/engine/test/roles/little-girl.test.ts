import type { GameOptionsInput, PlayerView } from '@rougarou/protocol';
import { describe, expect, it } from 'vitest';

import { availableActions, projectView } from '../../src/index.ts';
import { maskName, revealedCount, spotChance } from '../../src/roles/little-girl.ts';
import { player, setup, toNextNight, types, type GameDriver } from '../dsl.ts';

/** Petite fille (`docs/02`, P21) : Chloe ; les loups sont Alexane et Bob. */
const ROLES = {
  Alexane: 'werewolf',
  Bob: 'werewolf',
  Chloe: 'little-girl',
  David: 'villager',
  Eve: 'villager',
  Fanny: 'villager',
  Gaspard: 'villager',
  Hugo: 'villager',
} as const;

/** Sans risque : elle n'est jamais reperee. */
const SAFE: GameOptionsInput = { littleGirlRisk: { base: 0, increase: 0 } };

function wolvesNight(options: GameOptionsInput = SAFE, seed = 1): GameDriver {
  return setup({ roles: ROLES, options, seed }).advance();
}

function viewOf(game: GameDriver, id: string): PlayerView {
  return projectView(game.state, { kind: 'player', playerId: id }) as PlayerView;
}

function spied(game: GameDriver) {
  return game.last.find((event) => event.type === 'LittleGirlSpied');
}

describe('Pseudo partiellement devoile (P21)', () => {
  it('un tiers des lettres, arrondi a l inferieur, au moins une a partir de 3', () => {
    expect(
      ['Al', 'Bob', 'Alice', 'Alexane', 'Jean Paul', 'Marie-Christine', 'Zo'].map(revealedCount),
    ).toEqual([0, 1, 1, 2, 2, 5, 0]);
  });

  it('une case par caractere, espaces visibles, lettres choisies devoilees', () => {
    expect(maskName('Jean Paul', [0, 6])).toEqual([
      'J',
      null,
      null,
      null,
      ' ',
      null,
      'a',
      null,
      null,
    ]);
    expect(maskName('Al', [])).toEqual([null, null]);
    expect(maskName('Éloïse', [3])).toEqual([null, null, null, 'ï', null, null]);
  });
});

describe('Risque croissant (P21)', () => {
  it('base, puis + hausse par nuit espionnee, plafonne a 75 %', () => {
    const defaults = { base: 10, increase: 10 };

    expect([1, 2, 3, 7, 8, 20].map((n) => spotChance(defaults, n))).toEqual([
      0.1, 0.2, 0.3, 0.7, 0.75, 0.75,
    ]);
    expect(spotChance({ base: 0, increase: 0 }, 9)).toBe(0);
    expect(spotChance({ base: 50, increase: 25 }, 2)).toBe(0.75);
  });
});

describe('Petite fille : espionner (docs/02, P21)', () => {
  it('pendant l etape des loups, elle peut espionner ; par defaut, elle ne voit rien', () => {
    const game = wolvesNight();

    expect(availableActions(game.state, { kind: 'player', playerId: 'Chloe' })).toEqual([
      { type: 'SubmitNightAction', kind: 'spy' },
    ]);
    expect(viewOf(game, 'Chloe').night).toEqual({ step: 'spy', resolved: false, pack: null });
    expect(game.state.night?.steps).toEqual(['wolves']);
  });

  it('elle ne bloque jamais l etape : les loups decident sans elle', () => {
    const game = wolvesNight().wolfVote('Alexane', 'David').wolfVote('Bob', 'David');

    expect(game.state.phase).toBe('DAWN');
    expect(types(game.log)).not.toContain('LittleGirlSpied');
  });

  it('en espionnant, elle voit les votes en direct, chaque loup sous un pseudo partiel', () => {
    const game = wolvesNight().wolfVote('Alexane', 'David').spy('Chloe');
    const night = viewOf(game, 'Chloe').night;

    expect(night?.step).toBe('spy');
    const pack = night?.step === 'spy' ? (night.pack ?? []) : [];

    expect(pack).toHaveLength(2);
    expect(pack.map((wolf) => wolf.mask.length).sort()).toEqual([3, 7]);
    expect(pack.find((wolf) => wolf.mask.length === 7)?.target).toBe('David');
    expect(pack.find((wolf) => wolf.mask.length === 3)?.target).toBeNull();
    expect(
      pack.find((wolf) => wolf.mask.length === 7)?.mask.filter((cell) => cell !== null),
    ).toHaveLength(2);

    game.wolfVote('Bob', 'Eve');
    const updated = viewOf(game, 'Chloe').night;

    expect(
      updated?.step === 'spy' && updated.pack?.find((wolf) => wolf.mask.length === 3)?.target,
    ).toBe('Eve');
  });

  it('les pseudos partiels de la nuit restent dans ses infos', () => {
    const game = wolvesNight().spy('Chloe');

    expect(game.state.players.Chloe?.knowledge).toEqual([
      { kind: 'wolfGlimpse', night: 1, masks: expect.any(Array) },
    ]);
  });

  it('une seule fois par nuit, et seulement elle', () => {
    wolvesNight()
      .spy('Chloe')
      .rejects(
        player('Chloe'),
        { type: 'SubmitNightAction', action: { kind: 'spy' } },
        'WRONG_PHASE',
      )
      .rejects(
        player('David'),
        { type: 'SubmitNightAction', action: { kind: 'spy' } },
        'NOT_YOUR_TURN',
      )
      .rejects(
        player('Chloe'),
        { type: 'SubmitNightAction', action: { kind: 'wolfVote', target: 'David' } },
        'INVALID_COMMAND',
      );
    expect(
      availableActions(wolvesNight().spy('Chloe').state, { kind: 'player', playerId: 'Chloe' }),
    ).toEqual([]);
  });

  it('le tirage est refait chaque nuit, mais identique au rejeu', () => {
    const first = wolvesNight().spy('Chloe');
    const again = wolvesNight().spy('Chloe');

    expect(spied(first)).toEqual(spied(again));

    first.wolfVote('Alexane', 'Hugo').wolfVote('Bob', 'Hugo');
    const masks = [1, 2, 3].map(() => {
      toNextNight(first).spy('Chloe');
      const event = spied(first);
      const target = first.state.seats.find(
        (id) =>
          first.state.players[id]?.alive === true &&
          id !== 'Alexane' &&
          id !== 'Bob' &&
          id !== 'Chloe',
      );

      first.wolfVote('Alexane', target ?? 'David').wolfVote('Bob', target ?? 'David');
      return JSON.stringify(event);
    });

    expect(new Set(masks).size).toBeGreaterThan(1);
  });
});

describe('Petite fille : etre reperee (P21)', () => {
  it('sans risque, elle n est jamais reperee', () => {
    const game = wolvesNight().spy('Chloe');

    expect(spied(game)).toMatchObject({ caught: false, suspects: [] });
    expect(game.state.players.Alexane?.knowledge).toEqual([]);
  });

  it('les nuits sans espionnage ne comptent pas', () => {
    const game = wolvesNight().wolfVote('Alexane', 'Hugo').wolfVote('Bob', 'Hugo');

    toNextNight(game).spy('Chloe');
    expect(game.state.spyNights.Chloe).toBe(1);
  });

  it('reperee, les loups recoivent 3 suspects : elle et 2 non-loups vivants, dans l ordre des places', () => {
    const game = caughtGame();
    const event = spied(game);

    expect(event).toMatchObject({ caught: true });
    const suspects = event?.type === 'LittleGirlSpied' ? event.suspects : [];

    expect(suspects).toHaveLength(3);
    expect(suspects).toContain('Chloe');
    expect(suspects).not.toContain('Alexane');
    expect(suspects).not.toContain('Bob');
    expect(suspects).toEqual(game.state.seats.filter((id) => suspects.includes(id)));

    for (const wolf of ['Alexane', 'Bob']) {
      expect(game.state.players[wolf]?.knowledge).toEqual([
        { kind: 'littleGirlSuspects', night: 1, players: suspects },
      ]);
    }
  });

  it('avec une graine connue, reperee une nuit puis pas la suivante', () => {
    const game = twoSpyNights(CAUGHT_THEN_FREE_SEED);

    expect(game.spies.map((event) => event.caught)).toEqual([true, false]);
    expect(game.driver.state.spyNights.Chloe).toBe(2);
    expect(game.driver.state.players.Alexane?.knowledge).toHaveLength(1);
  });

  it('reperee de nouveau, les loups recoivent une nouvelle liste, tiree a part', () => {
    const game = twoSpyNights(CAUGHT_SEED);

    expect(game.spies.map((event) => event.caught)).toEqual([true, true]);
    expect(game.driver.state.players.Bob?.knowledge.map((info) => info.kind)).toEqual([
      'littleGirlSuspects',
      'littleGirlSuspects',
    ]);
  });

  it('moins de suspects s il manque des non-loups vivants', () => {
    const roles = {
      Alice: 'werewolf',
      Bob: 'little-girl',
      Chloe: 'villager',
      David: 'villager',
      Eve: 'villager',
    } as const;
    const game = setup({
      roles,
      options: { littleGirlRisk: { base: 50, increase: 25 } },
      seed: CAUGHT_SEED_SMALL,
    })
      .advance()
      .replay({ type: 'PlayerKilled', playerId: 'Chloe', cause: 'wolves', roleRevealed: true })
      .replay({ type: 'PlayerKilled', playerId: 'David', cause: 'wolves', roleRevealed: true })
      .spy('Bob');

    expect(spied(game)).toMatchObject({ caught: true, suspects: ['Bob', 'Eve'] });
  });
});

/** Graines ou la Petite fille est reperee des la premiere nuit avec un risque de 50 %. */
const CAUGHT_SEED = 2;
const CAUGHT_SEED_SMALL = 4;
/** Avec ces graines et un risque de 50 %, puis 75 % : reperee la nuit 1, pas la nuit 2. */
const CAUGHT_THEN_FREE_SEED = 6;

function caughtGame(): GameDriver {
  return wolvesNight({ littleGirlRisk: { base: 50, increase: 25 } }, CAUGHT_SEED).spy('Chloe');
}

/** Deux nuits d'espionnage avec un risque de 50 % puis 75 % ; Hugo meurt la nuit 1. */
function twoSpyNights(seed: number) {
  const driver = wolvesNight({ littleGirlRisk: { base: 50, increase: 25 } }, seed).spy('Chloe');
  const first = spied(driver);

  driver.wolfVote('Alexane', 'Hugo').wolfVote('Bob', 'Hugo');
  toNextNight(driver).spy('Chloe');
  const spies = [first, spied(driver)].flatMap((event) =>
    event?.type === 'LittleGirlSpied' ? [event] : [],
  );

  return { driver, spies };
}
