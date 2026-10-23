import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { expect, test, type Page } from '@playwright/test';

import { openTable, readView, startNight } from './fixtures/table.ts';

/**
 * Definition de « termine » de M4 (`docs/10`) : axe ne signale aucune
 * violation serieuse ni critique, sur les ecrans du joueur et du meneur, de
 * nuit et de jour, sur telephone (375 px) et ordinateur (1280 px).
 *
 * axe-core est celui des tests de composants (`apps/web`), injecte tel quel.
 */
const AXE = createRequire(new URL('../apps/web/package.json', import.meta.url)).resolve(
  'axe-core/axe.min.js',
);

const AXE_SOURCE = readFileSync(AXE, 'utf8');

const WIDTHS = [375, 1280] as const;

interface Violation {
  readonly id: string;
  readonly impact: string | null;
  readonly nodes: number;
}

async function seriousViolations(page: Page): Promise<Violation[]> {
  // La CSP de l'app interdit un script en ligne (`docs/04`) : on passe par le canal
  // de debogage du navigateur, qui n'y est pas soumis, sans affaiblir la CSP.
  await page.evaluate(AXE_SOURCE);

  return page.evaluate(async () => {
    const { violations } = await (
      window as unknown as {
        axe: {
          run: (
            context: Document,
            options: object,
          ) => Promise<{
            violations: { id: string; impact: string | null; nodes: unknown[] }[];
          }>;
        };
      }
    ).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } });

    return violations
      .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
      .map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.length,
      }));
  });
}

/** Chaque largeur, puis axe ; on attend la fin du fondu de phase (1,2 s). */
async function audit(page: Page, screen: string): Promise<void> {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(1300);
    expect(await seriousViolations(page), `${screen} a ${String(width)} px`).toEqual([]);
  }
}

test.describe('M4 : accessibilite de chaque ecran (axe)', () => {
  test.skip(({ isMobile }) => isMobile, 'Table a six navigateurs : sur ordinateur seulement.');
  test.setTimeout(240_000);

  test('accueil, sans session', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByLabel('Pseudo')).toBeVisible();
    await audit(page, 'accueil');
  });

  test('salon, configuration, nuit et jour', async ({ browser }) => {
    const table = await openTable(browser);
    const { narrator } = table;
    const [seat] = table.seats;

    if (seat === undefined) {
      throw new Error('table vide');
    }

    try {
      await audit(narrator, 'salon (meneur)');
      await audit(seat.page, 'salon (joueur)');

      await narrator.getByTestId('primary-action').click();
      await expect.poll(async () => (await readView(narrator)).phase).toBe('CONFIG');
      await audit(narrator, 'configuration (meneur)');

      // `startNight` repart du salon : on revient d'abord a la configuration deja ouverte.
      await narrator.setViewportSize({ width: 1280, height: 900 });
      await startNight(table, { 'Loup-garou': 1, Villageois: 4 }, { configured: true });
      await audit(narrator, 'nuit (meneur)');
      await audit(seat.page, 'nuit (joueur)');

      // On force la nuit, puis « Lever le jour » : jour 1, election du Maire.
      for (let step = 0; step < 6; step += 1) {
        if ((await readView(narrator)).phase === 'MAYOR_ELECTION') {
          break;
        }

        await narrator.getByTestId('primary-action').click();
        await narrator.waitForTimeout(500);
      }

      await expect(seat.page.locator('html')).toHaveAttribute('data-phase', 'day');
      await audit(narrator, 'jour (meneur)');
      await audit(seat.page, 'jour (joueur)');
    } finally {
      for (const context of table.contexts) {
        await context.close();
      }
    }
  });
});
