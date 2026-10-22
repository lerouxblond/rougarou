import {
  narratorViewSchema,
  playerViewSchema,
  type GameOptionsInput,
  type PlayerView,
} from '@rougarou/protocol';
import { describe, expect, it } from 'vitest';

import { projectView, type GameState, type PlayerState } from '../../src/index.ts';
import { playRandomGame, randomRoles } from '../bot.ts';
import type { GameDriver } from '../dsl.ts';

/**
 * Test de non-fuite generique (`CLAUDE.md` regle 2, `docs/04` §Securite).
 *
 * On joue des parties au hasard. Apres chaque coup, on calcule la vue de
 * chaque joueur, d'un inconnu et du meneur, et on verifie qu'elle ne contient
 * que ce que les regles permettent de savoir. L'oracle est ecrit ici, a part
 * de la projection, a partir des regles.
 */

const OUTSIDER = 'zz-outsider';

/** L'oracle : le lecteur a-t-il le droit de connaitre le role de `target` ? */
function mayKnowRole(
  state: GameState,
  viewer: PlayerState | undefined,
  target: PlayerState,
): boolean {
  if (state.phase === 'ENDED' || target.roleRevealed) {
    return true;
  }

  if (viewer === undefined) {
    return false;
  }

  return (
    viewer.id === target.id ||
    (!viewer.alive && state.options.deadSeeRoles) ||
    (viewer.role === 'werewolf' && target.role === 'werewolf')
  );
}

function checkPlayerView(state: GameState, viewerId: string, view: PlayerView): void {
  const viewer = state.players[viewerId];
  const hiddenDawn = state.phase === 'DAWN' && state.dawn?.announced !== true;
  const isLivingWolf = viewer?.alive === true && viewer.role === 'werewolf';

  // La vue respecte son schema strict : aucun champ inattendu (ADR 0008).
  expect(playerViewSchema.safeParse(view).success).toBe(true);

  for (const seen of view.players) {
    const target = state.players[seen.id]!;

    if (seen.role !== null) {
      expect(mayKnowRole(state, viewer, target), `${viewerId} voit le role de ${seen.id}`).toBe(
        true,
      );
      expect(seen.role).toBe(target.role);
    }
  }

  // Seuls les loups voient la nuit des loups ; personne ne voit la victime avant l'annonce.
  if (!isLivingWolf) {
    expect(view.night).toBeNull();
  }

  if (hiddenDawn) {
    expect(view.phase).toBe('NIGHT');
    expect(view.deaths).toBeNull();
  }

  // Minuteur de nuit : seulement pour qui agit (`docs/12` §4).
  if ((state.phase === 'NIGHT' && !isLivingWolf) || hiddenDawn) {
    expect(view.deadline).toBeNull();
  }

  // Vote secret : seulement son propre bulletin, pas de decompte (`R-30`).
  if (state.options.voteVisibility === 'secret') {
    for (const ballots of [view.vote?.ballots ?? {}, view.election?.ballots ?? {}]) {
      expect(Object.keys(ballots).every((voter) => voter === viewerId)).toBe(true);
    }

    expect(view.vote?.tally ?? null).toBeNull();
  }
}

/**
 * Nuit uniforme : pour un villageois vivant, rien ne change de toute la nuit,
 * aube non annoncee comprise. Sinon, un changement trahirait le moment ou les
 * loups se decident.
 */
function trackUniformNights(): (game: GameDriver) => void {
  const seen = new Map<string, string>();

  return (game) => {
    const { state } = game;
    const night =
      state.phase === 'NIGHT' || (state.phase === 'DAWN' && state.dawn?.announced !== true);

    if (!night) {
      seen.clear();
      return;
    }

    for (const id of state.seats) {
      const player = state.players[id]!;

      if (player.alive && player.role !== 'werewolf') {
        const view = JSON.stringify(projectView(state, { kind: 'player', playerId: id }));
        const previous = seen.get(id);

        if (previous !== undefined) {
          expect(view, `la nuit de ${id} a change`).toBe(previous);
        }

        seen.set(id, view);
      }
    }
  };
}

/** Projeter toutes les vues a chaque coup coute cher : ces tests ont leur propre delai. */
const LEAK_TIMEOUT = 60_000;

const SCENARIOS: {
  name: string;
  count: number;
  wolves: number;
  seeds: number;
  options: GameOptionsInput;
}[] = [
  { name: '5 joueurs, options par defaut', count: 5, wolves: 1, seeds: 6, options: {} },
  {
    name: '8 joueurs, vote secret, morts muets',
    count: 8,
    wolves: 2,
    seeds: 6,
    options: { voteVisibility: 'secret', revealRoleOnDeath: false, deadSeeRoles: false },
  },
  {
    name: '12 joueurs, majorite, pilotage manuel',
    count: 12,
    wolves: 3,
    seeds: 6,
    options: { wolfVoteMode: 'majority', pilotMode: 'manual' },
  },
  {
    name: '16 joueurs, reelection, abstention',
    count: 16,
    wolves: 4,
    seeds: 4,
    options: { mayorSuccession: 'reelect', allowAbstain: true, tieBreak: 'revote' },
  },
  {
    name: '24 joueurs, sans Maire, distanciel',
    count: 24,
    wolves: 5,
    seeds: 3,
    options: { mayor: false, playMode: 'remote', allowSpare: false },
  },
];

describe('Non-fuite generique (CLAUDE.md regle 2)', () => {
  for (const scenario of SCENARIOS) {
    it(
      `${scenario.name} : aucune vue ne revele plus que les regles`,
      { timeout: LEAK_TIMEOUT },
      () => {
        for (let seed = 1; seed <= scenario.seeds; seed += 1) {
          const uniformNights = trackUniformNights();

          playRandomGame({
            roles: randomRoles(scenario.count, scenario.wolves, seed),
            options: scenario.options,
            seed,
            onStep(game) {
              const { state } = game;

              for (const id of [...state.seats, OUTSIDER]) {
                checkPlayerView(
                  state,
                  id,
                  projectView(state, { kind: 'player', playerId: id }) as PlayerView,
                );
              }

              expect(
                narratorViewSchema.safeParse(projectView(state, { kind: 'narrator' })).success,
              ).toBe(true);
              uniformNights(game);
            },
          });
        }
      },
    );
  }

  it('un inconnu ne voit aucun role avant la fin', () => {
    const game = playRandomGame({ roles: randomRoles(8, 2, 3), seed: 3, maxMoves: 40 });
    const view = projectView(game.state, { kind: 'player', playerId: OUTSIDER }) as PlayerView;

    expect(view.me).toBeNull();
    expect(
      view.players.every((seen) => seen.role === null || game.state.players[seen.id]?.roleRevealed),
    ).toBe(true);
  });

  it('a la fin, tous les roles sont reveles', () => {
    const game = playRandomGame({ roles: randomRoles(6, 1, 9), seed: 9 });
    const view = projectView(game.state, { kind: 'player', playerId: 'p00' }) as PlayerView;

    expect(game.state.phase).toBe('ENDED');
    expect(view.players.every((seen) => seen.role !== null)).toBe(true);
  });
});
