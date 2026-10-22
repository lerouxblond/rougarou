import { expect, test } from '@playwright/test';

import {
  openTable,
  playToTheEnd,
  readView,
  startNight,
  type Policy,
  type View,
} from './fixtures/table.ts';

/**
 * Definition de « termine » de M3 (`docs/10`) : 1 meneur et 8 joueurs, chacun
 * dans son navigateur, jouent une partie avec tous les roles classiques.
 * Chaque role agit au moins une fois, la non-fuite des roles est controlee a
 * chaque tour, et la partie va jusqu'a la victoire.
 */

const PLAYERS = ['Alice', 'Bob', 'Chloe', 'David', 'Eve', 'Fanny', 'Gaspard', 'Hugo'] as const;

const COMPOSITION = {
  'Loup-garou': 2,
  Voyante: 1,
  Sorcière: 1,
  Chasseur: 1,
  Cupidon: 1,
  'Petite fille': 1,
  Villageois: 1,
};

/**
 * Le scenario, ecrit d'apres les roles que voit le meneur : Cupidon s'unit au
 * villageois, la Voyante sonde un loup, la Petite fille espionne, les loups
 * tuent le Chasseur, la Sorciere empoisonne un loup, et le Chasseur abat
 * l'autre a l'aube. Le village gagne.
 */
function scenario(roles: ReadonlyMap<string, string>): Policy {
  const holder = (role: string) => [...roles].find(([, held]) => held === role)?.[0] ?? '';
  const wolves = [...roles].filter(([, role]) => role === 'werewolf').map(([id]) => id);
  const livingWolf = (view: View, targets: readonly string[]) =>
    wolves.find((id) => targets.includes(id) && view.players.find((p) => p.id === id)?.alive);

  return {
    target(view, action) {
      const targets = action.targets ?? [];
      const first = targets[0] ?? '';

      switch (action.kind ?? action.type) {
        case 'wolfVote':
          return targets.includes(holder('hunter')) ? holder('hunter') : first;
        case 'seerProbe':
        case 'HunterShoot':
          return livingWolf(view, targets) ?? first;
        case 'CastVote':
          return view.phase === 'DAY_VOTE' ? (livingWolf(view, targets) ?? first) : first;
        default:
          return first;
      }
    },
    potions(view, action) {
      return { save: false, kill: livingWolf(view, action.killTargets ?? []) ?? null };
    },
    couple() {
      return [holder('cupid'), holder('villager')];
    },
  };
}

test.describe('M3 : une partie a neuf navigateurs avec tous les roles classiques', () => {
  test.skip(({ isMobile }) => isMobile, 'Partie complete : sur ordinateur seulement.');
  test.setTimeout(300_000);

  test('chaque role agit, rien ne fuit, et le village gagne', async ({ browser }) => {
    const table = await openTable(browser, PLAYERS);

    try {
      await startNight(table, COMPOSITION);

      const narrator = await readView(table.narrator);
      const roles = new Map(narrator.players.map((player) => [player.id, player.role ?? '']));

      expect([...roles.values()].sort()).toEqual([
        'cupid',
        'hunter',
        'little-girl',
        'seer',
        'villager',
        'werewolf',
        'werewolf',
        'witch',
      ]);

      const seen = new Set<string>();
      const end = await playToTheEnd(table, scenario(roles), seen);

      expect(end.winner).toBe('village');

      for (const action of [
        'cupidLink',
        'loversConfirm',
        'seerProbe',
        'spy',
        'wolfVote',
        'witchPotions',
        'HunterShoot',
      ]) {
        expect(seen, action).toContain(action);
      }

      for (const { page } of table.seats) {
        await expect(page.getByText("Le village l'emporte.")).toBeVisible();
      }
    } finally {
      for (const context of table.contexts) {
        await context.close();
      }
    }
  });
});
