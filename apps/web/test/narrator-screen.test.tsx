import { catalogs } from '@rougarou/i18n';
import type { NarratorView } from '@rougarou/protocol';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NarratorScreen } from '../src/game/NarratorScreen.tsx';
import { axeViolations, renderWithProviders } from './render.tsx';

afterEach(cleanup);

const fr = catalogs.fr;

function narrator(overrides: Partial<NarratorView> = {}): NarratorView {
  return {
    kind: 'narrator',
    gameId: '01JA0000000000000000000001',
    phase: 'NIGHT',
    players: [
      {
        id: 'p1',
        name: 'Alice',
        alive: true,
        mayor: false,
        role: 'werewolf',
        roleSeen: true,
        roleRevealed: false,
        knowledge: [],
      },
      {
        id: 'p2',
        name: 'Bob',
        alive: true,
        mayor: false,
        role: 'seer',
        roleSeen: false,
        roleRevealed: false,
        knowledge: [],
      },
    ],
    options: {} as NarratorView['options'],
    composition: {},
    nightNumber: 1,
    deadline: null,
    pausedRemaining: null,
    ceremony: null,
    night: {
      number: 1,
      steps: ['seer', 'wolves'],
      current: 0,
      stepResolved: false,
      wolfVotes: {},
      wolfTie: null,
      wolfVictim: null,
      witch: null,
      spy: null,
    },
    lovers: null,
    potions: {},
    dawn: null,
    election: null,
    vote: null,
    pending: [],
    winner: null,
    everyoneVoted: false,
    journal: [],
    suggestion: null,
    actions: [{ type: 'AdvancePhase', blocked: true }],
    ...overrides,
  };
}

describe('Tableau du meneur (US-41, docs/12 §1)', () => {
  it('lit le reveil de l etape en cours, entre la tombee de la nuit et l etape suivante', () => {
    renderWithProviders(<NarratorScreen view={narrator()} />);

    expect(screen.getByText(fr.roles.seer.narrator.wake)).toBeDefined();
    expect(screen.getByText(fr.script.nightfall)).toBeDefined();
    expect(screen.getByText(fr.roles.werewolf.narrator.wake)).toBeDefined();
  });

  it('sur ordinateur, trois colonnes : l etape en cours est marquee', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('min-width'),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    renderWithProviders(<NarratorScreen view={narrator()} />);

    const list = screen.getByRole('list', { name: fr.narrator.steps });

    expect(list.querySelector('[aria-current="step"]')?.textContent).toContain(fr.night.seer.title);
    expect(screen.queryByRole('tablist')).toBeNull();
    vi.unstubAllGlobals();
  });

  it('sur telephone, des onglets : Script, ordre de la nuit, joueurs (docs/06)', () => {
    renderWithProviders(<NarratorScreen view={narrator()} />);

    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      fr.narrator.script,
      fr.narrator.steps,
      fr.players.label,
    ]);
  });

  it('bloque : dit ce qu il attend, et propose de forcer', () => {
    renderWithProviders(<NarratorScreen view={narrator()} />);

    expect(screen.getByText('En attente : Voyante.')).toBeDefined();
    expect(screen.getByTestId('primary-action').textContent).toBe('Forcer : Étape suivante');
  });

  it.each([
    [{ actions: [{ type: 'AdvancePhase' as const, blocked: false }] }, 'Étape suivante'],
    [
      {
        phase: 'DAWN' as const,
        night: null,
        dawn: { deaths: [], announced: false },
        actions: [{ type: 'AdvancePhase' as const, blocked: false }],
      },
      'Lever le jour',
    ],
    [
      {
        phase: 'DEAL' as const,
        night: null,
        ceremony: { turn: 'p2' },
        actions: [{ type: 'AdvancePhase' as const, blocked: false }],
      },
      'Joueur suivant',
    ],
    [
      {
        phase: 'DAY_DEBATE' as const,
        night: null,
        actions: [{ type: 'AdvancePhase' as const, blocked: false }],
      },
      'Ouvrir le vote',
    ],
  ])('le bouton principal suit le moment : %j', (overrides, label) => {
    renderWithProviders(<NarratorScreen view={narrator(overrides)} />);

    expect(screen.getByTestId('primary-action').textContent).toBe(label);
  });

  it('la barre d outils suit les actions recues, et Annuler est toujours la', () => {
    renderWithProviders(
      <NarratorScreen
        view={narrator({
          actions: [
            { type: 'AdvancePhase', blocked: false },
            { type: 'PauseTimer' },
            { type: 'ExtendTimer' },
          ],
        })}
      />,
    );

    expect(screen.getByRole('button', { name: fr.actions.pause_timer })).toBeDefined();
    expect(screen.getByRole('button', { name: fr.actions.extend_timer })).toBeDefined();
    expect(screen.queryByRole('button', { name: fr.actions.resume_timer })).toBeNull();
    expect(screen.getByRole('button', { name: fr.actions.undo })).toBeDefined();
  });

  it('sans violation axe', async () => {
    const { container } = renderWithProviders(<NarratorScreen view={narrator()} />);

    expect(await axeViolations(container)).toEqual([]);
  });
});
