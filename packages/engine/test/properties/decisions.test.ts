import fc from 'fast-check';
import {
  commandSchema,
  type Actor,
  type CommandInput,
  type GameOptionsInput,
} from '@rougarou/protocol';
import { describe, expect, it } from 'vitest';

import { apply, availableActions, createRng, type GameState } from '../../src/index.ts';
import { playRandomGame, randomClassicRoles } from '../bot.ts';
import { NARRATOR, player, type GameDriver } from '../dsl.ts';

/**
 * Reciproque du robot (`bot.ts`) : il verifie que tout coup propose par
 * `availableActions` est accepte par `apply`. Ici, toute decision que `apply`
 * accepterait d'un acteur doit lui etre proposee : sinon l'ecran, qui ne
 * montre que les actions recues, ne la lui offre jamais (le Maire qui ne
 * pouvait pas trancher une egalite, `R-33`).
 */

const RUNS = 60;
const SEED = 20_261_023;

/** Une commande essayee et le nom de l'action qu'elle doit trouver dans la liste. */
interface Probe {
  readonly cmd: CommandInput;
  readonly action: string;
}

/** Les decisions de jeu qu'un acteur pourrait tenter, sur chaque cible. */
function probes(state: GameState, actor: Actor): Probe[] {
  if (actor.kind === 'narrator') {
    return state.seats.map((target) => ({
      cmd: { type: 'ResolveWolfTie', target },
      action: 'ResolveWolfTie',
    }));
  }

  const targeted = state.seats.flatMap((playerId) => [
    { cmd: { type: 'BreakTie', playerId }, action: 'BreakTie' },
    { cmd: { type: 'DesignateSuccessor', playerId }, action: 'DesignateSuccessor' },
    { cmd: { type: 'HunterShoot', playerId }, action: 'HunterShoot' },
    { cmd: { type: 'CastVote', ballot: { kind: 'player', playerId } }, action: 'CastVote' },
    {
      cmd: { type: 'SubmitNightAction', action: { kind: 'wolfVote', target: playerId } },
      action: 'wolfVote',
    },
    {
      cmd: { type: 'SubmitNightAction', action: { kind: 'seerProbe', target: playerId } },
      action: 'seerProbe',
    },
  ]) satisfies Probe[];

  return [
    ...targeted,
    { cmd: { type: 'ConfirmRoleSeen' }, action: 'ConfirmRoleSeen' },
    { cmd: { type: 'DeclareCandidacy' }, action: 'DeclareCandidacy' },
    { cmd: { type: 'WithdrawCandidacy' }, action: 'WithdrawCandidacy' },
    { cmd: { type: 'SubmitNightAction', action: { kind: 'spy' } }, action: 'spy' },
    {
      cmd: { type: 'SubmitNightAction', action: { kind: 'loversConfirm' } },
      action: 'loversConfirm',
    },
    {
      cmd: { type: 'SubmitNightAction', action: { kind: 'witchPotions', save: false, kill: null } },
      action: 'witchPotions',
    },
  ];
}

/** Le nom d'une action proposee : son type, ou le genre d'action de nuit. */
function proposed(state: GameState, actor: Actor): Set<string> {
  const viewer = actor.kind === 'player' ? actor : { kind: 'narrator' as const };

  return new Set(
    availableActions(state, viewer).map((action) =>
      action.type === 'SubmitNightAction' ? action.kind : action.type,
    ),
  );
}

/** Chaque decision acceptee (et qui change quelque chose) est proposee a son auteur. */
function checkDecisions(game: GameDriver): void {
  const { state } = game;

  if (state.phase === 'ENDED') {
    return;
  }

  for (const actor of [NARRATOR, ...state.seats.map((id) => player(id))]) {
    const offered = proposed(state, actor);

    for (const probe of probes(state, actor)) {
      const result = apply(
        state,
        { actor, cmd: commandSchema.parse(probe.cmd) },
        { now: game.now, rng: createRng(1) },
      );

      if (result.ok && result.events.length > 0) {
        expect(
          offered.has(probe.action),
          `${JSON.stringify(actor)} peut ${JSON.stringify(probe.cmd)} en ${state.phase}, sans que ce soit propose`,
        ).toBe(true);
      }
    }
  }
}

const optionsArbitrary: fc.Arbitrary<GameOptionsInput> = fc.record({
  mayor: fc.boolean(),
  mayorSuccession: fc.constantFrom('designate', 'reelect'),
  allowSpare: fc.boolean(),
  tieBreak: fc.constantFrom('mayor', 'revote', 'nobody'),
  wolfVoteMode: fc.constantFrom('unanimous', 'majority'),
  voteVisibility: fc.constantFrom('public', 'secret'),
});

describe('Toute decision attendue est proposee (R-33, R-34, R-42)', () => {
  it(`${String(RUNS)} parties : rien d'acceptable n'est cache`, { timeout: 300_000 }, () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 10 }),
        optionsArbitrary,
        fc.integer({ min: 1, max: 2 ** 30 }),
        (count, options, seed) => {
          playRandomGame({
            roles: randomClassicRoles(count, Math.max(1, Math.floor(count / 4)), seed),
            options,
            seed,
            onStep: checkDecisions,
          });
        },
      ),
      { numRuns: RUNS, seed: SEED },
    );
  });
});
