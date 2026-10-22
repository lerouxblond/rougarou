import { catalogs } from '@rougarou/i18n';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { axeViolations, mockFetch, renderRoute, SIGNED_IN, SIGNED_OUT } from './render.tsx';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const fr = catalogs.fr;

describe('Accueil', () => {
  it('affiche le titre issu du catalogue francais (D-16)', async () => {
    mockFetch(SIGNED_OUT);
    await renderRoute('/');

    expect(screen.getByRole('heading', { level: 1, name: fr.home.title })).toBeDefined();
  });

  it('sans session : connexion, ou jeu en invite (D-04)', async () => {
    mockFetch(SIGNED_OUT);
    await renderRoute('/');

    expect(await screen.findByRole('heading', { name: fr.auth.login_title })).toBeDefined();
    expect(screen.getByRole('button', { name: fr.auth.guest_submit })).toBeDefined();
  });

  it('connecte : creer ou rejoindre (US-10, US-11)', async () => {
    mockFetch(SIGNED_IN);
    await renderRoute('/');

    expect(await screen.findByRole('button', { name: fr.home.create_game })).toBeDefined();
    expect(screen.getByRole('button', { name: fr.home.join_game })).toBeDefined();
    expect(screen.getByLabelText(fr.home.code_label)).toBeDefined();
  });

  it('bascule en anglais sans toucher aux composants', async () => {
    mockFetch(SIGNED_OUT);
    await renderRoute('/', 'en');

    expect(screen.getByRole('heading', { level: 1, name: catalogs.en.home.title })).toBeDefined();
  });

  it('ne rend aucune cle i18n brute, et un seul titre de niveau 1', async () => {
    mockFetch(SIGNED_IN);
    const { container } = await renderRoute('/');

    await screen.findByRole('button', { name: fr.home.create_game });
    expect(container.textContent).not.toMatch(/\b[a-z_]+\.[a-z_]+\b/);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it.each([
    ['sans session', SIGNED_OUT, fr.auth.login_title],
    ['connecte', SIGNED_IN, fr.home.create_game],
  ])('passe axe sans violation, %s (CLAUDE.md regle 9)', async (_label, routes, ready) => {
    mockFetch(routes);
    const { container } = await renderRoute('/');

    await screen.findByText(ready);
    expect(await axeViolations(container)).toEqual([]);
  });
});
