import { catalogs } from '@rougarou/i18n';
import type { ActionDescriptor, NarratorView, PlayerView } from '@rougarou/protocol';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ActionPanel } from '../src/game/ActionPanel.tsx';
import { Config } from '../src/game/Config.tsx';
import { NarratorLobby, PlayerLobby } from '../src/game/Lobby.tsx';
import { RoleCard } from '../src/game/RoleCard.tsx';
import { useGameStore } from '../src/game/store.ts';
import { axeViolations, renderWithProviders } from './render.tsx';

afterEach(cleanup);

const fr = catalogs.fr;
const GAME = '01JA0000000000000000000001';
const NAMES = new Map([
  ['p1', 'Alice'],
  ['p2', 'Bob'],
]);

const playerView: PlayerView = {
  kind: 'player',
  gameId: GAME,
  phase: 'LOBBY',
  me: null,
  players: [
    { id: 'p1', name: 'Alice', alive: true, mayor: false, role: null },
    { id: 'p2', name: 'Bob', alive: true, mayor: false, role: null },
  ],
  options: {} as PlayerView['options'],
  composition: {},
  nightNumber: 0,
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
  actions: [{ type: 'JoinGame' }],
};

const narratorView: NarratorView = {
  kind: 'narrator',
  gameId: GAME,
  phase: 'LOBBY',
  players: [
    {
      id: 'p1',
      name: 'Alice',
      alive: true,
      mayor: false,
      role: null,
      roleSeen: false,
      roleRevealed: false,
      knowledge: [],
    },
    {
      id: 'p2',
      name: 'Bob',
      alive: true,
      mayor: false,
      role: null,
      roleSeen: false,
      roleRevealed: false,
      knowledge: [],
    },
  ],
  options: {} as NarratorView['options'],
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
  actions: [],
};

describe('ActionPanel (regle 1 : le client ne montre que ce que le serveur propose)', () => {
  it('un controle par action recue', () => {
    const actions: ActionDescriptor[] = [
      { type: 'ConfirmRoleSeen' },
      { type: 'AdvancePhase', blocked: true },
      { type: 'CastVote', targets: ['p1', 'p2'], spare: true, abstain: false },
    ];

    renderWithProviders(<ActionPanel actions={actions} names={NAMES} />);

    expect(screen.getByRole('button', { name: fr.actions.confirm_role_seen })).toBeDefined();
    expect(screen.getByRole('button', { name: fr.actions.advance_phase_force })).toBeDefined();

    const ballot = screen.getByLabelText(fr.actions.cast_vote);

    expect([...ballot.querySelectorAll('option')].map((option) => option.textContent)).toEqual([
      'Alice',
      'Bob',
      fr.actions.spare,
    ]);
  });

  it('aucun bouton quand la vue ne porte aucune action', () => {
    const { container } = renderWithProviders(<ActionPanel actions={[]} names={NAMES} />);

    expect(container.querySelectorAll('button')).toHaveLength(0);
  });

  it('les problemes de composition bloquent la distribution', () => {
    renderWithProviders(
      <ActionPanel
        actions={[{ type: 'Deal', issues: ['errors.composition.no_wolf'] }]}
        names={NAMES}
      />,
    );

    expect(screen.getByRole('button', { name: fr.actions.deal })).toHaveProperty('disabled', true);
    expect(screen.getByText(fr.errors.composition.no_wolf)).toBeDefined();
  });
});

describe('Salon (US-12)', () => {
  it('le meneur voit qui est connecte, et peut deplacer ou expulser', async () => {
    useGameStore.setState({ connected: ['p1'] });
    const { container } = renderWithProviders(<NarratorLobby view={narratorView} />);

    expect(screen.getAllByText(fr.game.online)).toHaveLength(1);
    expect(screen.getAllByText(fr.game.offline)).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Expulser Alice' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Monter Alice' })).toHaveProperty('disabled', true);
    expect(await axeViolations(container)).toEqual([]);
  });

  it('un joueur qui n a pas rejoint voit le formulaire, pre-rempli avec son pseudo', async () => {
    const { container } = renderWithProviders(
      <PlayerLobby view={playerView} displayName="Chloe" />,
    );

    expect(screen.getByLabelText(fr.auth.display_name)).toHaveProperty('value', 'Chloe');
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe('Configuration', () => {
  it('compte les roles et passe axe', async () => {
    const { container } = renderWithProviders(<Config view={narratorView} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un Loup-garou' }));
    expect(screen.getByText('1 rôle pour 2 joueurs')).toBeDefined();
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe('Carte de role (US-30)', () => {
  it('cachee par defaut, visible tant qu on la maintient', () => {
    renderWithProviders(<RoleCard role="werewolf" />);
    const card = screen.getByRole('button', { pressed: false });

    expect(screen.queryByText(fr.roles.werewolf.name)).toBeNull();

    fireEvent.pointerDown(card);
    expect(screen.getByText(fr.roles.werewolf.name)).toBeDefined();

    fireEvent.pointerUp(card);
    expect(screen.queryByText(fr.roles.werewolf.name)).toBeNull();
  });

  it('au clavier : Espace maintenu revele, relacher cache', async () => {
    const { container } = renderWithProviders(<RoleCard role="villager" />);
    const card = screen.getByRole('button');

    fireEvent.keyDown(card, { key: ' ' });
    expect(screen.getByText(fr.roles.villager.name)).toBeDefined();
    fireEvent.keyUp(card, { key: ' ' });
    expect(screen.queryByText(fr.roles.villager.name)).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });
});
