import { catalogs } from '@rougarou/i18n';
import { gameOptionsSchema, type NarratorView } from '@rougarou/protocol';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Config } from '../src/game/Config.tsx';
import { axeViolations, renderWithProviders } from './render.tsx';

afterEach(cleanup);

const fr = catalogs.fr;

function configView(suggestion: NarratorView['suggestion']): NarratorView {
  return {
    kind: 'narrator',
    gameId: '01JA0000000000000000000001',
    phase: 'CONFIG',
    players: ['Alice', 'Bob', 'Chloe', 'David', 'Eve'].map((name, index) => ({
      id: `p${index}`,
      name,
      alive: true,
      mayor: false,
      role: null,
      roleSeen: false,
      roleRevealed: false,
      knowledge: [],
    })),
    options: gameOptionsSchema.parse({}),
    composition: {},
    nightNumber: 0,
    deadline: null,
    pausedRemaining: null,
    ceremony: null,
    night: null,
    lovers: null,
    potions: {},
    dawn: null,
    election: null,
    vote: null,
    pending: [],
    winner: null,
    everyoneVoted: false,
    journal: [],
    suggestion,
    actions: [],
  };
}

function meter(): HTMLElement {
  return screen.getByRole('meter', { name: fr.balance.label });
}

describe('Configuration (US-20, US-21)', () => {
  it('la suggestion du serveur remplit les compteurs', () => {
    renderWithProviders(
      <Config view={configView({ werewolf: 1, seer: 1, witch: 1, villager: 2 })} />,
    );

    fireEvent.click(screen.getByRole('button', { name: fr.game.use_suggestion }));

    expect(screen.getByRole('group', { name: fr.roles.villager.name }).textContent).toContain('2');
    expect(screen.getByText('5 rôles pour 5 joueurs')).toBeDefined();
  });

  it('l equilibre suit chaque + et −, en toutes lettres', () => {
    renderWithProviders(<Config view={configView(null)} />);

    expect(meter().getAttribute('aria-valuetext')).toBe(fr.balance.balanced);
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter : Loup-garou' }));
    expect(meter().getAttribute('aria-valuetext')).toBe(fr.balance.wolves);
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter : Voyante' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter : Sorcière' }));
    expect(meter().getAttribute('aria-valuetext')).toBe(fr.balance.village);
  });

  it('un role unique ne monte pas au-dessus de 1', () => {
    renderWithProviders(<Config view={configView(null)} />);

    const plus = screen.getByRole('button', { name: 'Ajouter : Voyante' });

    fireEvent.click(plus);
    expect(plus).toHaveProperty('disabled', true);
  });

  it('les options sont groupees, chacune avec son aide (US-21)', () => {
    renderWithProviders(<Config view={configView(null)} />);

    for (const group of Object.values(fr.options.groups)) {
      expect(screen.getByRole('group', { name: group })).toBeDefined();
    }

    expect(screen.getByRole('switch', { name: fr.options.mayor.label })).toBeDefined();
    expect(screen.getByText(fr.options.seer_mode.help)).toBeDefined();
    expect(screen.getByRole('spinbutton', { name: fr.options.timers.day_vote })).toHaveProperty(
      'value',
      '60',
    );
  });

  it('sans violation axe', async () => {
    const { container } = renderWithProviders(
      <Config view={configView({ werewolf: 1, villager: 4 })} />,
    );

    expect(await axeViolations(container)).toEqual([]);
  });
});
