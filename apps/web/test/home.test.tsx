import { catalogs } from '@rougarou/i18n';
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it } from 'vitest';

import { createI18n } from '../src/i18n.ts';
import { Home } from '../src/routes/Home.tsx';

afterEach(cleanup);

function renderHome(locale = 'fr') {
  return render(
    <I18nextProvider i18n={createI18n(locale)}>
      <Home />
    </I18nextProvider>,
  );
}

describe('Accueil', () => {
  it('affiche le titre issu du catalogue francais (D-16)', () => {
    renderHome();

    expect(screen.getByRole('heading', { level: 1, name: catalogs.fr.home.title })).toBeDefined();
  });

  it('affiche les deux actions de docs/03 (US-10 et US-11)', () => {
    renderHome();

    expect(screen.getByRole('button', { name: catalogs.fr.home.create_game })).toBeDefined();
    expect(screen.getByRole('button', { name: catalogs.fr.home.join_game })).toBeDefined();
  });

  it('bascule en anglais sans toucher aux composants', () => {
    renderHome('en');

    expect(screen.getByRole('heading', { level: 1, name: catalogs.en.home.title })).toBeDefined();
  });

  it('ne rend aucune cle i18n brute : toutes sont resolues', () => {
    const { container } = renderHome();

    expect(container.textContent).not.toMatch(/\b[a-z_]+\.[a-z_]+\b/);
  });

  it('a un seul titre de niveau 1', () => {
    renderHome();

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('passe axe sans violation (CLAUDE.md regle 9)', async () => {
    const { container } = renderHome();

    const results = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
      // jsdom n'a pas de canvas : le contraste est verifie sur les tokens
      // dans `packages/ui/test/contrast.test.ts` (docs/06).
      rules: { 'color-contrast': { enabled: false } },
    });

    expect(results.violations).toEqual([]);
  });
});
