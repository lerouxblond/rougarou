import { expect, test } from '@playwright/test';

import { CONNECTION_TIMEOUT, openTable, readView, startNight } from './fixtures/table.ts';

/**
 * Definition de « termine » de M2 (`docs/10`, US-90) : recharger une page en
 * pleine nuit restaure exactement l'etat.
 */
test.describe('US-90 : reconnexion en pleine nuit', () => {
  test.skip(({ isMobile }) => isMobile, 'Table a six navigateurs : sur ordinateur seulement.');
  test.setTimeout(120_000);

  test('un joueur recharge la page et retrouve exactement sa vue', async ({ browser }) => {
    const table = await openTable(browser);

    try {
      await startNight(table);

      for (const seat of table.seats) {
        const before = await readView(seat.page);

        await seat.page.reload();
        await expect
          .poll(() => readView(seat.page), { timeout: CONNECTION_TIMEOUT })
          .toEqual(before);
        expect(before.phase).toBe('NIGHT');
      }

      // Le meneur, lui aussi, retrouve la partie telle qu'il l'a laissee.
      const before = await readView(table.narrator);

      await table.narrator.reload();
      await expect
        .poll(() => readView(table.narrator), { timeout: CONNECTION_TIMEOUT })
        .toEqual(before);
    } finally {
      for (const context of table.contexts) {
        await context.close();
      }
    }
  });
});
