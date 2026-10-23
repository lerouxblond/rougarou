import type { PlayerView } from '@rougarou/protocol';
import { describe, expect, it } from 'vitest';

import { projectView } from '../src/index.ts';
import { NARRATOR, newGame, player, types, type GameDriver } from './dsl.ts';

const FIVE = ['Alice', 'Bob', 'Chloe', 'David', 'Eve'];

/** Cinq joueurs, distribution en ceremonie : Alice a la main. */
function ceremony(options: { ceremonyCard?: number | null } = {}): GameDriver {
  const game = newGame(3);

  for (const name of FIVE) {
    game.as(name, { type: 'JoinGame', name });
  }

  return game
    .advance()
    .narrator({
      type: 'SetOptions',
      options: {
        dealMode: 'ceremony',
        timers: options.ceremonyCard === undefined ? {} : { ceremonyCard: options.ceremonyCard },
      },
    })
    .narrator({ type: 'SetComposition', composition: { werewolf: 1, villager: 4 } })
    .narrator({ type: 'Deal' });
}

function viewOf(game: GameDriver, playerId: string): PlayerView {
  const view = projectView(game.state, { kind: 'player', playerId });

  if (view.kind !== 'player') {
    throw new Error('Vue de joueur attendue');
  }

  return view;
}

function turnOf(game: GameDriver): string | null {
  return viewOf(game, 'Alice').ceremony?.turn ?? null;
}

describe('R-17 : distribution en ceremonie', () => {
  it('la main commence a la premiere place, avec le minuteur de 8 s', () => {
    const game = ceremony();

    expect(game.state.phase).toBe('DEAL');
    expect(turnOf(game)).toBe('Alice');
    expect(game.state.deadline).toBe(game.now + 8000);
  });

  it('la main passe dans l ordre des places a chaque confirmation', () => {
    const game = ceremony();

    game.as('Alice', { type: 'ConfirmRoleSeen' });
    expect(turnOf(game)).toBe('Bob');
    game.as('Bob', { type: 'ConfirmRoleSeen' });
    expect(turnOf(game)).toBe('Chloe');
  });

  it('refuse la confirmation d un joueur dont le tour n est pas venu', () => {
    ceremony().rejects(player('Chloe'), { type: 'ConfirmRoleSeen' }, 'NOT_YOUR_TURN');
  });

  it('« Suivant » du meneur passe la main sans confirmation', () => {
    const game = ceremony().advance();

    expect(turnOf(game)).toBe('Bob');
    expect(game.state.players.Alice?.roleSeen).toBe(false);
    // Son tour est passe : il peut encore confirmer.
    game.as('Alice', { type: 'ConfirmRoleSeen' });
    expect(game.state.players.Alice?.roleSeen).toBe(true);
    expect(turnOf(game)).toBe('Bob');
  });

  it('la fin du minuteur passe la main, et relance le minuteur pour le suivant', () => {
    const game = ceremony().expire();

    expect(turnOf(game)).toBe('Bob');
    expect(game.state.deadline).toBe(game.now + 8000);
  });

  it('sans minuteur, seuls la confirmation et « Suivant » passent la main', () => {
    const game = ceremony({ ceremonyCard: null });

    expect(game.state.deadline).toBeNull();
    game.advance();
    expect(turnOf(game)).toBe('Bob');
  });

  it('apres le dernier joueur, plus de main ni de minuteur, et le meneur lance la nuit', () => {
    const game = ceremony();

    for (const name of FIVE) {
      game.as(name, { type: 'ConfirmRoleSeen' });
    }

    expect(game.state.phase).toBe('DEAL');
    expect(turnOf(game)).toBeNull();
    expect(game.state.deadline).toBeNull();
    game.advance();
    expect(game.state.phase).toBe('NIGHT');
  });

  it('apres le dernier joueur, une confirmation manquante bloque la nuit, sauf en forcant', () => {
    const game = ceremony();

    // « Suivant » une fois par joueur, sans aucune confirmation.
    for (const _ of FIVE) {
      game.advance();
    }

    expect(turnOf(game)).toBeNull();
    game.rejects(NARRATOR, { type: 'AdvancePhase' }, 'PENDING_ACTIONS').advance(true);
    expect(game.state.phase).toBe('NIGHT');
  });

  it('forcer pendant la ceremonie lance la nuit tout de suite (R-13)', () => {
    const game = ceremony().advance(true);

    expect(game.state.phase).toBe('NIGHT');
    expect(types(game.last)).toContain('PhaseForced');
  });

  it('chaque joueur ne voit son role qu une fois sa main venue', () => {
    const game = ceremony();

    expect(viewOf(game, 'Alice').me?.role).not.toBeNull();
    expect(viewOf(game, 'Bob').me?.role).toBeNull();
    expect(viewOf(game, 'Bob').actions).toEqual([]);
    game.as('Alice', { type: 'ConfirmRoleSeen' });
    expect(viewOf(game, 'Bob').me?.role).not.toBeNull();
    expect(viewOf(game, 'Bob').actions).toEqual([{ type: 'ConfirmRoleSeen' }]);
    // Alice garde sa carte (« Ma carte »), sans rien rejouer.
    expect(viewOf(game, 'Alice').me?.role).not.toBeNull();
    expect(viewOf(game, 'Alice').actions).toEqual([]);
  });

  it('le meneur voit qui a la main', () => {
    const game = ceremony();
    const view = projectView(game.state, { kind: 'narrator' });

    expect(view.ceremony).toEqual({ turn: 'Alice' });
    expect(view.actions).toContainEqual({ type: 'AdvancePhase', blocked: false });
  });

  it('en distribution simultanee, pas de ceremonie', () => {
    const game = newGame(3);

    for (const name of FIVE) {
      game.as(name, { type: 'JoinGame', name });
    }

    game
      .advance()
      .narrator({ type: 'SetComposition', composition: { werewolf: 1, villager: 4 } })
      .narrator({ type: 'Deal' });

    expect(viewOf(game, 'Bob').ceremony).toBeNull();
    expect(viewOf(game, 'Bob').me?.role).not.toBeNull();
    game.as('Eve', { type: 'ConfirmRoleSeen' });
  });
});

describe('R-17 : non-fuite de la ceremonie', () => {
  it('un joueur qui n a pas la main ne voit que le nom de celui qui l a', () => {
    const game = ceremony();
    const before = viewOf(game, 'Eve');

    game.as('Alice', { type: 'ConfirmRoleSeen' });
    const after = viewOf(game, 'Eve');

    // Seule la main a change : ni role, ni confirmation, ni minuteur d'autrui.
    expect({ ...after, ceremony: null }).toEqual({ ...before, ceremony: null });
    expect(after.players.every((seen) => seen.role === null)).toBe(true);
  });
});
