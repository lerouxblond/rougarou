import { expect, test } from '@playwright/test';

import { openTable, playToTheEnd, readView, startNight, voteAgainst } from './fixtures/table.ts';

/**
 * Definition de « termine » de M2 (`docs/10`) : 1 meneur et 5 joueurs, chacun
 * dans son navigateur, jouent une partie Loups contre Villageois.
 */
test.describe('US-10, US-11, US-30 : une partie a six navigateurs', () => {
  // Six contextes et une partie entiere : un seul navigateur suffit a le prouver.
  test.skip(({ isMobile }) => isMobile, 'Partie complete : sur ordinateur seulement.');
  test.setTimeout(180_000);

  test('le meneur et cinq joueurs jouent jusqu a la victoire', async ({ browser }) => {
    const table = await openTable(browser);

    try {
      await startNight(table);

      const roles = (await readView(table.narrator)).players;
      const wolf = roles.find((player) => player.role === 'werewolf');

      expect(wolf).toBeDefined();

      // Chaque joueur voit son propre role, et seulement le sien.
      for (const { page } of table.seats) {
        const view = await readView(page);
        const others = view.players.filter((player) => player.id !== view.me?.id);

        expect(view.me?.role).not.toBeNull();
        expect(others.every((player) => player.role === null)).toBe(true);
      }

      const end = await playToTheEnd(table, voteAgainst(wolf?.id ?? ''));

      expect(end.winner).toBe('village');

      for (const { page } of table.seats) {
        await expect(
          page.getByRole('status').filter({ hasText: "Le village l'emporte." }),
        ).toBeVisible();
      }
    } finally {
      for (const context of table.contexts) {
        await context.close();
      }
    }
  });
});
