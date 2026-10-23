import axe from 'axe-core';

/**
 * Les violations WCAG 2 A et AA d'un element rendu.
 *
 * `color-contrast` est desactive : jsdom ne calcule aucune couleur effective.
 * Le contraste est verifie sur les tokens dans `contrast.test.ts` (`docs/06`).
 */
export async function axeViolations(element: Element): Promise<axe.Result[]> {
  const results = await axe.run(element, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    rules: { 'color-contrast': { enabled: false } },
  });

  return results.violations;
}
