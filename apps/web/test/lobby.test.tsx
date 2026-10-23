import { catalogs } from '@rougarou/i18n';
import { gameOptionsSchema, type NarratorView } from '@rougarou/protocol';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { JoinCard } from '../src/game/JoinCard.tsx';
import { NarratorLobby } from '../src/game/NarratorLobby.tsx';
import { axeViolations, renderWithProviders } from './render.tsx';

afterEach(cleanup);

const fr = catalogs.fr;

describe('Salon (US-10, US-12)', () => {
  it('le QR et le lien menent a /join/:code', async () => {
    const { container } = renderWithProviders(<JoinCard code="ABC234" />);

    const qr = screen.getByRole('img', { name: 'QR du code de la partie ABC234' });

    expect(qr.querySelectorAll('rect').length).toBeGreaterThan(100);
    expect(screen.getByRole('link').getAttribute('href')).toBe(
      `${window.location.origin}/join/ABC234`,
    );
    expect(await axeViolations(container)).toEqual([]);
  });

  it('chaque place a une poignee pour la glisser, en plus des fleches', async () => {
    const view = {
      kind: 'narrator',
      phase: 'LOBBY',
      options: gameOptionsSchema.parse({}),
      players: ['Alice', 'Bob'].map((name, index) => ({
        id: `p${String(index)}`,
        name,
        alive: true,
        mayor: false,
        role: null,
        roleSeen: false,
        roleRevealed: false,
        knowledge: [],
      })),
    } as unknown as NarratorView;
    const { container } = renderWithProviders(<NarratorLobby view={view} />);

    expect(screen.getByRole('button', { name: 'Glisser pour déplacer Bob' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Monter Bob' })).toBeDefined();
    expect(fr.lobby.drag).toContain('{{name}}');
    expect(await axeViolations(container)).toEqual([]);
  });
});
