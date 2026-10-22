import fc from 'fast-check';
import type { GameOptionsInput } from '@rougarou/protocol';
import { describe, expect, it } from 'vitest';

import { emptyState, evolve, teamOf, type GameState } from '../../src/index.ts';
import { checkVictory } from '../../src/victory.ts';
import { playRandomGame, randomClassicRoles } from '../bot.ts';
import type { GameDriver } from '../dsl.ts';

/**
 * Tests de proprietes (`docs/09`, definition de « termine » de M1, M3) : 1 000
 * parties aleatoires, de 5 a 24 joueurs, avec toutes les options du moteur,
 * se terminent sans jamais violer un invariant.
 *
 * La graine est fixe : un echec est reproductible, et fast-check affiche le
 * contre-exemple reduit.
 */

const RUNS = 1000;
const SEED = 20_261_022;
const MAX_MOVES = 5000;

const optionsArbitrary: fc.Arbitrary<GameOptionsInput> = fc.record({
  playMode: fc.constantFrom('inPerson', 'remote'),
  mayor: fc.boolean(),
  pilotMode: fc.constantFrom('manual', 'assisted'),
  mayorSuccession: fc.constantFrom('designate', 'reelect'),
  revealRoleOnDeath: fc.boolean(),
  deadSeeRoles: fc.boolean(),
  voteVisibility: fc.constantFrom('public', 'secret'),
  allowAbstain: fc.boolean(),
  allowSpare: fc.boolean(),
  tieBreak: fc.constantFrom('mayor', 'revote', 'nobody'),
  wolfVoteMode: fc.constantFrom('unanimous', 'majority'),
  wolvesWinOnParity: fc.boolean(),
  seerMode: fc.constantFrom('role', 'team'),
  witchSelfSave: fc.constantFrom('never', 'firstNightOnly', 'always'),
  littleGirlRisk: fc.record({
    base: fc.integer({ min: 0, max: 50 }),
    increase: fc.integer({ min: 0, max: 25 }),
  }),
});

/** Une partie : nombre de joueurs, loups (moins que les autres, R-07), options et graine. */
const gameArbitrary = fc.integer({ min: 5, max: 24 }).chain((count) =>
  fc.record({
    count: fc.constant(count),
    wolves: fc.integer({ min: 1, max: Math.ceil(count / 2) - 1 }),
    options: optionsArbitrary,
    seed: fc.integer({ min: 1, max: 2 ** 30 }),
  }),
);

function living(state: GameState) {
  return state.seats.map((id) => state.players[id]!).filter((player) => player.alive);
}

/** Les evenements vus au fil des parties : chaque role doit avoir agi au moins une fois. */
const played = new Set<string>();

/** Les invariants verifies apres chaque coup. */
function checkInvariants(game: GameDriver): void {
  const { state } = game;
  const alive = new Set(living(state).map((player) => player.id));

  // Aucun mort ne vote ni n'agit la nuit : chaque bulletin du dernier coup vient d'un vivant,
  // et un vote encore ouvert ne compte que des vivants.
  for (const event of game.last) {
    if (event.type === 'VoteCast' || event.type === 'ElectionVoteCast') {
      expect(alive.has(event.voter), `${event.voter} est mort et a vote`).toBe(true);
    }

    if (event.type === 'WolfVoteCast') {
      expect(alive.has(event.wolf), `${event.wolf} est mort et a vote la nuit`).toBe(true);
      expect(state.players[event.wolf]?.role).toBe('werewolf');
    }
  }

  if (state.vote !== null && !state.vote.closed) {
    expect(Object.keys(state.vote.ballots).every((voter) => alive.has(voter))).toBe(true);
  }

  // Chagrin immediat (`R-41`) : les amoureux vivent ou meurent ensemble.
  if (state.lovers !== null) {
    const [first, second] = state.lovers;

    expect(alive.has(first)).toBe(alive.has(second));
  }

  for (const event of game.last) {
    played.add(event.type);
  }

  // Au plus un Maire, vivant, sauf le temps de designer son successeur (R-52).
  if (state.mayor !== null) {
    const designating = state.pending.some(
      (effect) => effect.kind === 'mayorSuccession' && effect.from === state.mayor,
    );

    expect(alive.has(state.mayor) || designating, `le Maire ${state.mayor} est mort`).toBe(true);
  }

  // Les morts du journal sont exactement les joueurs morts.
  const killed = game.log.filter((event) => event.type === 'PlayerKilled').length;

  expect(killed).toBe(state.seats.length - alive.size);

  // La victoire est prononcee des qu'elle est acquise, jamais avant (R-05).
  if (state.phase === 'ENDED') {
    expect(state.winner).toBe(checkVictory(state));
  } else {
    // `R-44` : un tir de Chasseur en attente retarde la verification.
    if (state.pending.length === 0) {
      expect(checkVictory(state)).toBeNull();
    }

    expect(state.winner).toBeNull();
  }
}

/** La victoire annoncee respecte R-01 et R-02. */
function checkWinner(state: GameState): void {
  const players = living(state);
  const wolves = players.filter((player) => teamOf(state, player.id) === 'wolves').length;
  const others = players.length - wolves;

  switch (state.winner) {
    case 'nobody':
      expect(players).toHaveLength(0);
      break;
    case 'village':
      expect(wolves).toBe(0);
      expect(others).toBeGreaterThan(0);
      break;
    case 'lovers':
      expect(players).toHaveLength(2);
      expect(players.map((player) => player.id).sort()).toEqual([...(state.lovers ?? [])].sort());
      break;
    case 'wolves':
      expect(wolves).toBeGreaterThan(0);
      expect(others === 0 || (state.options.wolvesWinOnParity && wolves >= others)).toBe(true);
      break;
    default:
      throw new Error(`Issue inattendue : ${String(state.winner)}`);
  }
}

describe('Parties aleatoires (docs/09, M1)', () => {
  it(`${RUNS} parties se terminent sans violer d'invariant`, { timeout: 300_000 }, () => {
    fc.assert(
      fc.property(gameArbitrary, ({ count, wolves, options, seed }) => {
        const game = playRandomGame({
          roles: randomClassicRoles(count, wolves, seed),
          options,
          seed,
          maxMoves: MAX_MOVES,
          onStep: checkInvariants,
        });

        // La partie se termine.
        expect(game.state.phase).toBe('ENDED');
        checkWinner(game.state);

        // Rejouer le journal redonne l'etat final (ADR 0002).
        expect(game.log.reduce(evolve, emptyState())).toEqual(game.state);
      }),
      { numRuns: RUNS, seed: SEED },
    );

    for (const type of [
      'KnowledgeGained',
      'WitchActed',
      'HunterShot',
      'LoversLinked',
      'LoverConfirmed',
      'LittleGirlSpied',
    ]) {
      expect(played, type).toContain(type);
    }
  });
});
