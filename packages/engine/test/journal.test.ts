import type { JournalEntry, PlayerView } from '@rougarou/protocol';
import { describe, expect, it } from 'vitest';

import { projectView } from '../src/index.ts';
import { FIVE_ROLES, setup, T0, type GameDriver } from './dsl.ts';

const ROLES = {
  Alice: 'werewolf',
  Bob: 'seer',
  Chloe: 'witch',
  David: 'hunter',
  Eve: 'villager',
} as const;

function viewOf(game: GameDriver, playerId: string): PlayerView {
  const view = projectView(game.state, { kind: 'player', playerId });

  if (view.kind !== 'player') {
    throw new Error('Vue de joueur attendue');
  }

  return view;
}

function facts(game: GameDriver): string[] {
  return game.state.journal.map((entry) => entry.fact.kind);
}

/** Avance jusqu'a la fin de la partie, en forcant au besoin. */
function toEnd(game: GameDriver): GameDriver {
  for (let step = 0; step < 10 && game.state.phase !== 'ENDED'; step += 1) {
    game.advance(game.state.pending.length > 0);
  }

  return game;
}

/**
 * Nuit 1 : la Voyante sonde Eve, le loup tue Eve, la Sorciere ne fait rien.
 * Jour 1 : le village execute Alice, le dernier loup.
 */
function playedGame(): GameDriver {
  const game = setup({ roles: ROLES, options: { mayor: false } }).advance();

  game.now = T0 + 1000;
  game.seerProbe('Bob', 'Eve');
  game.now = T0 + 2000;
  game.wolfVote('Alice', 'Eve').witch('Chloe');
  game.now = T0 + 3000;
  game.advance().advance().advance();
  game.votes({ Alice: 'Bob', Bob: 'Alice', Chloe: 'Alice', David: 'Alice' });

  return toEnd(game);
}

describe('R-19 : journal', () => {
  it('journalise chaque fait de la partie, dans l ordre', () => {
    const game = playedGame();

    expect(game.state.phase).toBe('ENDED');
    expect(facts(game)).toEqual([
      'nightStarted',
      'seerProbed',
      'wolvesChose',
      'witchActed',
      'playerKilled',
      'voteClosed',
      'playerKilled',
      'gameEnded',
    ]);
  });

  it('chaque entree porte l heure de la commande, la nuit et la phase', () => {
    const game = playedGame();
    const probe = game.state.journal.find((entry) => entry.fact.kind === 'seerProbed');

    expect(probe).toEqual<JournalEntry>({
      at: T0 + 1000,
      night: 1,
      phase: 'NIGHT',
      fact: { kind: 'seerProbed', seer: 'Bob', target: 'Eve' },
    });
    // Les morts de l'aube sont faites a « Lever le jour » (`R-12`).
    expect(game.state.journal.find((entry) => entry.fact.kind === 'playerKilled')).toEqual({
      at: T0 + 3000,
      night: 1,
      phase: 'DAWN',
      fact: { kind: 'playerKilled', playerId: 'Eve', cause: 'wolves' },
    });
  });

  it('les actions de nuit gardent leur detail pour le meneur', () => {
    const game = playedGame();
    const kinds = new Map(game.state.journal.map((entry) => [entry.fact.kind, entry.fact]));

    expect(kinds.get('wolvesChose')).toEqual({ kind: 'wolvesChose', victim: 'Eve' });
    expect(kinds.get('witchActed')).toEqual({
      kind: 'witchActed',
      witch: 'Chloe',
      save: false,
      kill: null,
    });
    expect(kinds.get('gameEnded')).toEqual({ kind: 'gameEnded', winner: 'village' });
  });

  it('une entree appartient au groupe de la commande qui l a produite (R-11)', () => {
    const game = playedGame();

    for (const group of game.groups) {
      for (const [index, event] of group.entries()) {
        if (event.type === 'Journaled') {
          expect(index, 'une entree suit le fait journalise').toBeGreaterThan(0);
        }
      }
    }

    const journaled = game.log.filter((event) => event.type === 'Journaled');

    expect(journaled).toHaveLength(game.state.journal.length);
  });

  it('journalise les minuteurs expires et les forcages', () => {
    const expired = setup({ roles: FIVE_ROLES }).advance().expire();
    const forced = setup({ roles: FIVE_ROLES }).advance().advance(true);

    expect(expired.state.journal.map((entry) => entry.fact)).toContainEqual({
      kind: 'timerExpired',
      phase: 'NIGHT',
    });
    expect(forced.state.journal.map((entry) => entry.fact)).toContainEqual({
      kind: 'phaseForced',
      phase: 'NIGHT',
    });
  });

  it('le meneur voit tout le journal en direct', () => {
    const game = setup({ roles: ROLES }).advance().seerProbe('Bob', 'Eve');
    const view = projectView(game.state, { kind: 'narrator' });

    expect(view.kind === 'narrator' && view.journal).toEqual(game.state.journal);
  });

  it('un joueur ne recoit le journal qu a la fin, en entier', () => {
    const game = setup({ roles: ROLES, options: { mayor: false } }).advance();

    game.seerProbe('Bob', 'Eve');
    expect(viewOf(game, 'Bob').journal).toBeNull();
    expect(viewOf(game, 'Eve').journal).toBeNull();

    const ended = playedGame();

    expect(viewOf(ended, 'Eve').journal).toEqual(ended.state.journal);
  });
});
