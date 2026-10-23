import {
  narratorViewSchema,
  playerViewSchema,
  type GameOptionsInput,
  type Knowledge,
  type PlayerView,
  type RoleId,
} from '@rougarou/protocol';
import { describe, expect, it } from 'vitest';

import { projectView, type GameState, type PlayerState } from '../../src/index.ts';
import { playRandomGame, randomClassicRoles, randomRoles } from '../bot.ts';
import type { GameDriver } from '../dsl.ts';

/**
 * Test de non-fuite generique (`CLAUDE.md` regle 2, `docs/04` §Securite).
 *
 * On joue des parties au hasard, avec tous les roles classiques. Apres chaque
 * coup, on calcule la vue de chaque joueur, d'un inconnu et du meneur, et on
 * verifie qu'elle ne contient que ce que les regles permettent de savoir.
 * L'oracle est ecrit ici, a part de la projection, a partir des regles.
 */

const OUTSIDER = 'zz-outsider';

/**
 * Les roles qui ont le droit de recevoir chaque genre d'info (ADR 0010).
 * `anyone` : une info sur soi-meme, comme une correction de son role (`R-18`).
 */
const KNOWLEDGE_HOLDERS: Readonly<
  Record<Knowledge['kind'], readonly RoleId[] | 'lovers' | 'anyone'>
> = {
  seerRole: ['seer'],
  seerTeam: ['seer'],
  couple: ['cupid'],
  lover: 'lovers',
  wolfGlimpse: ['little-girl'],
  littleGirlSuspects: ['werewolf'],
  roleChanged: 'anyone',
};

/** Une info du lecteur lui donne-t-elle le role actuel de `target` ? */
function learned(viewer: PlayerState, target: PlayerState): boolean {
  return viewer.knowledge.some(
    (info) =>
      (info.kind === 'seerRole' || info.kind === 'lover') &&
      info.playerId === target.id &&
      info.role === target.role,
  );
}

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
    (viewer.role === 'werewolf' && target.role === 'werewolf') ||
    learned(viewer, target)
  );
}

/**
 * Le lecteur prend-il part a l'etape de nuit en cours ? Les loups et la
 * Petite fille a l'etape des loups, chaque role a la sienne, les amoureux a
 * l'etape des amoureux. Les autres ne doivent rien voir (nuit uniforme).
 */
function involved(state: GameState, viewerId: string): boolean {
  const viewer = state.players[viewerId];
  const step = state.phase === 'NIGHT' ? state.night?.steps[state.night.current] : undefined;

  if (viewer === undefined || !viewer.alive || step === undefined) {
    return false;
  }

  switch (step) {
    case 'wolves':
      return viewer.role === 'werewolf' || viewer.role === 'little-girl';
    case 'lovers':
      return state.lovers?.includes(viewerId) === true;
    default:
      return viewer.role === step;
  }
}

function checkKnowledge(state: GameState, viewerId: string, view: PlayerView): void {
  const viewer = state.players[viewerId];

  expect(view.me?.knowledge ?? []).toEqual(viewer?.knowledge ?? []);

  for (const info of viewer?.knowledge ?? []) {
    const holders = KNOWLEDGE_HOLDERS[info.kind];
    const allowed =
      holders === 'anyone' ||
      (holders === 'lovers'
        ? state.lovers?.includes(viewerId) === true
        : viewer?.role !== null && viewer !== undefined && holders.includes(viewer.role));

    expect(allowed, `${viewerId} detient une info ${info.kind}`).toBe(true);
  }
}

function checkPlayerView(state: GameState, viewerId: string, view: PlayerView): void {
  const viewer = state.players[viewerId];
  const hiddenDawn = state.phase === 'DAWN' && state.dawn?.announced !== true;
  const acting = involved(state, viewerId);

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

  checkKnowledge(state, viewerId, view);

  // Le journal ne part vers un joueur qu'a la fin, en entier (`R-19`).
  if (state.phase === 'ENDED') {
    expect(view.journal).toEqual(state.journal);
  } else {
    expect(view.journal, `${viewerId} recoit le journal avant la fin`).toBeNull();
  }

  // Seuls ceux qui prennent part a l'etape la voient ; personne ne voit la victime avant l'annonce.
  if (!acting) {
    expect(view.night, `${viewerId} voit l etape de nuit`).toBeNull();
  }

  // Ce que la Petite fille voit de la meute ne porte aucun identifiant de loup.
  if (view.night?.step === 'spy') {
    const text = JSON.stringify(view.night);

    for (const id of state.seats) {
      if (state.players[id]?.role === 'werewolf') {
        expect(text).not.toContain(`"${id}"`);
      }
    }
  }

  if (hiddenDawn) {
    expect(view.phase).toBe('NIGHT');
    expect(view.deaths).toBeNull();
  }

  // Minuteur de nuit : seulement pour qui agit (`docs/12` §4).
  if ((state.phase === 'NIGHT' && !acting) || hiddenDawn) {
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
 * Nuit uniforme : entre deux coups ou un joueur ne prend pas part a la nuit,
 * sa vue ne change pas, aube non annoncee comprise. Sinon, un changement
 * trahirait le moment ou une etape se resout.
 */
function trackUniformNights(): (game: GameDriver) => void {
  const seen = new Map<string, { view: string; involved: boolean }>();

  return (game) => {
    const { state } = game;
    const night =
      state.phase === 'NIGHT' || (state.phase === 'DAWN' && state.dawn?.announced !== true);

    if (!night) {
      seen.clear();
      return;
    }

    for (const id of [...state.seats, OUTSIDER]) {
      if (state.players[id]?.alive === false) {
        continue;
      }

      const view = JSON.stringify(projectView(state, { kind: 'player', playerId: id }));
      const now = involved(state, id);
      const previous = seen.get(id);

      if (previous !== undefined && !previous.involved && !now) {
        expect(view, `la nuit de ${id} a change`).toBe(previous.view);
      }

      seen.set(id, { view, involved: now });
    }
  };
}

/** Projeter toutes les vues a chaque coup coute cher : ces tests ont leur propre delai. */
const LEAK_TIMEOUT = 120_000;

const SCENARIOS: {
  name: string;
  count: number;
  wolves: number;
  seeds: number;
  options: GameOptionsInput;
  classic: boolean;
}[] = [
  {
    name: '5 joueurs, options par defaut',
    count: 5,
    wolves: 1,
    seeds: 6,
    options: {},
    classic: false,
  },
  {
    name: '8 joueurs, roles classiques, vote secret, morts muets',
    count: 8,
    wolves: 2,
    seeds: 8,
    options: { voteVisibility: 'secret', revealRoleOnDeath: false, deadSeeRoles: false },
    classic: true,
  },
  {
    name: '9 joueurs, roles classiques, Voyante en camp, risque fort',
    count: 9,
    wolves: 2,
    seeds: 8,
    options: {
      seerMode: 'team',
      littleGirlRisk: { base: 50, increase: 25 },
      witchSelfSave: 'always',
    },
    classic: true,
  },
  {
    name: '12 joueurs, roles classiques, majorite, pilotage manuel',
    count: 12,
    wolves: 3,
    seeds: 6,
    options: { wolfVoteMode: 'majority', pilotMode: 'manual' },
    classic: true,
  },
  {
    name: '16 joueurs, roles classiques, reelection, abstention',
    count: 16,
    wolves: 4,
    seeds: 4,
    options: { mayorSuccession: 'reelect', allowAbstain: true, tieBreak: 'revote' },
    classic: true,
  },
  {
    name: '24 joueurs, roles classiques, sans Maire, distanciel',
    count: 24,
    wolves: 5,
    seeds: 3,
    options: { mayor: false, playMode: 'remote', allowSpare: false },
    classic: true,
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
          const deal = scenario.classic ? randomClassicRoles : randomRoles;

          playRandomGame({
            roles: deal(scenario.count, scenario.wolves, seed),
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
    const game = playRandomGame({ roles: randomClassicRoles(8, 2, 3), seed: 3, maxMoves: 40 });
    const view = projectView(game.state, { kind: 'player', playerId: OUTSIDER }) as PlayerView;

    expect(view.me).toBeNull();
    expect(
      view.players.every((seen) => seen.role === null || game.state.players[seen.id]?.roleRevealed),
    ).toBe(true);
  });

  it('a la fin, tous les roles sont reveles', () => {
    const game = playRandomGame({ roles: randomClassicRoles(6, 1, 9), seed: 9 });
    const view = projectView(game.state, { kind: 'player', playerId: 'p00' }) as PlayerView;

    expect(game.state.phase).toBe('ENDED');
    expect(view.players.every((seen) => seen.role !== null)).toBe(true);
  });
});
