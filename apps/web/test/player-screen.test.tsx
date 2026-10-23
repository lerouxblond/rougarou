import { catalogs } from '@rougarou/i18n';
import type { MeResponse, PlayerView, RoleId } from '@rougarou/protocol';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { PlayerScreen } from '../src/game/PlayerScreen.tsx';
import { axeViolations, renderWithProviders } from './render.tsx';

afterEach(cleanup);

const fr = catalogs.fr;
const ME: MeResponse = { id: 'p1', displayName: 'Alice', email: null, guest: true };

/** Une vue de joueur assis : Alice (p1), Bob (p2), Chloe (p3). */
function seated(overrides: Partial<PlayerView> = {}, role: RoleId | null = 'villager'): PlayerView {
  return {
    kind: 'player',
    gameId: '01JA0000000000000000000001',
    phase: 'NIGHT',
    me: { id: 'p1', role, alive: true, roleSeen: true, knowledge: [] },
    players: [
      { id: 'p1', name: 'Alice', alive: true, mayor: false, role },
      { id: 'p2', name: 'Bob', alive: true, mayor: false, role: null },
      { id: 'p3', name: 'Chloe', alive: false, mayor: true, role: 'seer' },
    ],
    options: {} as PlayerView['options'],
    composition: {},
    nightNumber: 1,
    deadline: null,
    pausedRemaining: null,
    ceremony: null,
    night: null,
    deaths: null,
    election: null,
    vote: null,
    pending: [],
    winner: null,
    journal: null,
    actions: [],
    ...overrides,
  };
}

function uniformNight(): string {
  const section = screen.getByText(fr.night.uniform.title).closest('section');

  return section?.outerHTML ?? '';
}

describe('Vue joueur (US-40, docs/06)', () => {
  it('la nuit uniforme est la meme, quel que soit le role', () => {
    renderWithProviders(<PlayerScreen view={seated({}, 'werewolf')} me={ME} />);
    const wolf = uniformNight();

    cleanup();
    renderWithProviders(<PlayerScreen view={seated({}, 'seer')} me={ME} />);

    expect(uniformNight()).toBe(wolf);
    expect(wolf).not.toBe('');
  });

  it('un joueur qui agit cette nuit ne voit pas l ecran uniforme', () => {
    renderWithProviders(
      <PlayerScreen view={seated({ night: { step: 'seer', resolved: false } }, 'seer')} me={ME} />,
    );

    expect(screen.queryByText(fr.night.uniform.title)).toBeNull();
    expect(screen.getByRole('heading', { name: fr.night.seer.title })).toBeDefined();
  });

  it('en ceremonie, sans la main, on ne voit que qui decouvre son role (R-17)', () => {
    renderWithProviders(
      <PlayerScreen view={seated({ phase: 'DEAL', ceremony: { turn: 'p2' } }, null)} me={ME} />,
    );

    expect(screen.getByText('Bob découvre son rôle…')).toBeDefined();
    expect(screen.queryByRole('button', { name: fr.actions.confirm_role_seen })).toBeNull();
  });

  it('avec la main, la carte et la confirmation', () => {
    renderWithProviders(
      <PlayerScreen
        view={seated({
          phase: 'DEAL',
          ceremony: { turn: 'p1' },
          actions: [{ type: 'ConfirmRoleSeen' }],
        })}
        me={ME}
      />,
    );

    expect(screen.getByRole('button', { name: fr.actions.confirm_role_seen })).toBeDefined();
    expect(screen.getAllByRole('button', { pressed: false }).length).toBeGreaterThan(0);
  });

  it('la barre basse ouvre « Ma carte » et « Infos » en panneau', () => {
    renderWithProviders(<PlayerScreen view={seated()} me={ME} />);

    fireEvent.click(screen.getByRole('button', { name: fr.bar.info }));
    expect(screen.getByRole('dialog', { name: fr.bar.info })).toBeDefined();
    expect(screen.getByText(fr.my_info.empty)).toBeDefined();
  });

  it('le role du lecteur n est jamais ecrit dans la liste des joueurs (US-30)', () => {
    renderWithProviders(<PlayerScreen view={seated({}, 'werewolf')} me={ME} />);

    expect(screen.queryByText(fr.roles.werewolf.name)).toBeNull();
    // Celui d'un autre, connu (ici mort et revele), l'est.
    expect(screen.getAllByText(fr.roles.seer.name).length).toBeGreaterThan(0);
  });

  it('les joueurs disent qui est mort et qui est Maire, en toutes lettres', () => {
    renderWithProviders(<PlayerScreen view={seated()} me={ME} />);

    expect(screen.getAllByText(fr.players.dead).length).toBeGreaterThan(0);
    expect(screen.getAllByText(fr.players.mayor).length).toBeGreaterThan(0);
  });

  it.each([
    ['nuit', seated()],
    ['distribution', seated({ phase: 'DEAL', actions: [{ type: 'ConfirmRoleSeen' }] })],
    ['jour', seated({ phase: 'DAY_DEBATE', nightNumber: 1 })],
  ])('ecran %s sans violation axe', async (_name, view) => {
    const { container } = renderWithProviders(<PlayerScreen view={view} me={ME} />);

    expect(await axeViolations(container)).toEqual([]);
  });
});
