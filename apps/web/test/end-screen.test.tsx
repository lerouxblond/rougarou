import { catalogs } from '@rougarou/i18n';
import { gameOptionsSchema, type PlayerView } from '@rougarou/protocol';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { EndScreen } from '../src/game/EndScreen.tsx';
import { axeViolations, renderWithProviders } from './render.tsx';

afterEach(cleanup);

const fr = catalogs.fr;

const ended = {
  kind: 'player',
  phase: 'ENDED',
  options: gameOptionsSchema.parse({}),
  winner: 'village',
  players: [
    { id: 'p1', name: 'Alice', alive: false, mayor: false, role: 'werewolf' },
    { id: 'p2', name: 'Bob', alive: true, mayor: false, role: 'seer' },
  ],
  journal: [
    { at: 0, night: 1, phase: 'NIGHT', fact: { kind: 'nightStarted' } },
    { at: 0, night: 1, phase: 'NIGHT', fact: { kind: 'seerProbed', seer: 'p2', target: 'p1' } },
    {
      at: 0,
      night: 1,
      phase: 'DAY_VOTE',
      fact: { kind: 'voteClosed', outcome: { kind: 'execute', playerId: 'p1' } },
    },
    {
      at: 0,
      night: 1,
      phase: 'EXECUTION',
      fact: { kind: 'playerKilled', playerId: 'p1', cause: 'vote' },
    },
    { at: 0, night: 1, phase: 'EXECUTION', fact: { kind: 'gameEnded', winner: 'village' } },
  ],
} as unknown as PlayerView;

describe('Ecran de fin (US-60)', () => {
  it('annonce le camp vainqueur et revele tous les roles', () => {
    renderWithProviders(<EndScreen view={ended} />);

    expect(screen.getByRole('status').textContent).toBe(fr.winner.village);
    expect(screen.getByText(fr.roles.werewolf.name)).toBeDefined();
    expect(screen.getByText(fr.roles.seer.name)).toBeDefined();
  });

  it('raconte la partie nuit par nuit, a partir du journal', () => {
    renderWithProviders(<EndScreen view={ended} />);

    const night = screen.getByRole('list', { name: 'Nuit 1' });
    const day = screen.getByRole('list', { name: 'Jour 1' });

    expect(night.textContent).toContain('Bob a sondé Alice.');
    expect(day.textContent).toContain('Le village a désigné Alice.');
    expect(day.textContent).toContain('Alice est mort (le vote du village).');
  });

  it('propose une nouvelle partie, et passe axe', async () => {
    const { container } = renderWithProviders(<EndScreen view={ended} />);

    expect(screen.getByRole('link', { name: fr.end.new_game }).getAttribute('href')).toBe('/');
    expect(await axeViolations(container)).toEqual([]);
  });
});
