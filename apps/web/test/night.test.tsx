import { catalogs } from '@rougarou/i18n';
import type { ActionDescriptor, PlayerView } from '@rougarou/protocol';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ActionPanel } from '../src/game/ActionPanel.tsx';
import { MyInfo } from '../src/game/MyInfo.tsx';
import { NightPanel } from '../src/game/NightPanel.tsx';
import { RoleCard } from '../src/game/RoleCard.tsx';
import { axeViolations, renderWithProviders } from './render.tsx';

afterEach(cleanup);

const fr = catalogs.fr;
const NAMES = new Map([
  ['p1', 'Alice'],
  ['p2', 'Bob'],
  ['p3', 'Chloé'],
  ['p4', 'David'],
]);

type Night = NonNullable<PlayerView['night']>;
type Knowledge = NonNullable<PlayerView['me']>['knowledge'];

describe('Actions de nuit (regle 1 : un controle par action recue)', () => {
  it.each<[string, ActionDescriptor, string]>([
    [
      'Voyante',
      { type: 'SubmitNightAction', kind: 'seerProbe', targets: ['p1', 'p2'] },
      fr.actions.seer_probe,
    ],
    [
      'Cupidon',
      { type: 'SubmitNightAction', kind: 'cupidLink', targets: ['p1', 'p2', 'p3'] },
      fr.actions.cupid_link,
    ],
    ['Chasseur', { type: 'HunterShoot', targets: ['p1', 'p2'] }, fr.actions.hunter_shoot],
  ])('%s : un formulaire de cible, sans faute d accessibilite', async (_label, action, text) => {
    const { container } = renderWithProviders(<ActionPanel actions={[action]} names={NAMES} />);

    expect(screen.getByText(text)).toBeDefined();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(await axeViolations(container)).toEqual([]);
  });

  it('Sorciere : la potion de vie n apparait que si elle peut sauver', async () => {
    const action: ActionDescriptor = {
      type: 'SubmitNightAction',
      kind: 'witchPotions',
      canSave: false,
      killTargets: ['p1'],
    };
    const { container } = renderWithProviders(<ActionPanel actions={[action]} names={NAMES} />);

    expect(screen.queryByLabelText(fr.actions.witch_save)).toBeNull();
    expect(screen.getByLabelText(fr.actions.witch_kill)).toBeDefined();
    expect(await axeViolations(container)).toEqual([]);
  });

  it.each<[ActionDescriptor, string]>([
    [{ type: 'SubmitNightAction', kind: 'loversConfirm' }, fr.actions.lovers_confirm],
    [{ type: 'SubmitNightAction', kind: 'spy' }, fr.actions.spy],
  ])('un bouton simple pour %j', (action, label) => {
    renderWithProviders(<ActionPanel actions={[action]} names={NAMES} />);

    expect(screen.getByRole('button', { name: label })).toBeDefined();
  });
});

describe('Etape de nuit (NightPanel)', () => {
  it.each<[string, Night, string]>([
    ['Voyante', { step: 'seer', resolved: false }, fr.night.seer.prompt],
    [
      'Sorciere, avec victime',
      { step: 'witch', resolved: false, victim: 'p2', potions: { life: true, death: false } },
      'Cette nuit, Bob a été attaqué.',
    ],
    [
      'Sorciere, sans victime',
      { step: 'witch', resolved: false, victim: null, potions: { life: true, death: true } },
      fr.night.witch.no_victim,
    ],
    ['Cupidon', { step: 'cupid', resolved: false }, fr.night.cupid.prompt],
    [
      'Amoureux',
      { step: 'lovers', resolved: false, partner: 'p3', confirmed: false },
      'Vous êtes amoureux de Chloé.',
    ],
    [
      'Petite fille, sans espionner',
      { step: 'spy', resolved: false, pack: null },
      fr.night.spy.prompt,
    ],
  ])('%s', async (_label, night, text) => {
    const { container } = renderWithProviders(
      <NightPanel night={night} names={NAMES} knowledge={[]} nightNumber={1} />,
    );

    expect(screen.getByText(text)).toBeDefined();
    expect(await axeViolations(container)).toEqual([]);
  });

  it('les loups voient les votes de la meute', () => {
    renderWithProviders(
      <NightPanel
        night={{ step: 'wolves', resolved: false, wolfVotes: { p1: 'p3' } }}
        names={NAMES}
        knowledge={[]}
        nightNumber={1}
      />,
    );

    expect(screen.getByText('Alice → Chloé')).toBeDefined();
  });

  it('la Petite fille voit des pseudos partiels, lisibles au lecteur d ecran', async () => {
    const { container } = renderWithProviders(
      <NightPanel
        night={{
          step: 'spy',
          resolved: false,
          pack: [{ mask: ['A', null, ' ', null], target: 'p4' }],
        }}
        names={NAMES}
        knowledge={[]}
        nightNumber={1}
      />,
    );

    expect(screen.getByText('A _ _')).toBeDefined();
    expect(
      screen.getByLabelText(
        `A, ${fr.night.spy.hidden}, ${fr.night.spy.space}, ${fr.night.spy.hidden}`,
      ),
    ).toBeDefined();
    expect(screen.getByText('David', { exact: false })).toBeDefined();
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe('Mes infos (ADR 0010)', () => {
  const knowledge: Knowledge = [
    { kind: 'seerRole', night: 1, playerId: 'p1', role: 'werewolf' },
    { kind: 'seerTeam', night: 2, playerId: 'p2', team: 'village' },
    { kind: 'couple', players: ['p1', 'p2'] },
    { kind: 'lover', playerId: 'p3', role: 'little-girl' },
    { kind: 'wolfGlimpse', night: 3, masks: [['B', null, null]] },
    { kind: 'littleGirlSuspects', night: 4, players: ['p2', 'p3', 'p4'] },
  ];

  it('chaque info a sa phrase, dans une region annoncee', async () => {
    const { container } = renderWithProviders(<MyInfo knowledge={knowledge} names={NAMES} />);
    const region = screen.getByRole('region', { name: fr.my_info.title });

    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(screen.getByText('Nuit 1 : Alice est Loup-garou.')).toBeDefined();
    expect(screen.getByText('Nuit 2 : Bob appartient au camp Village.')).toBeDefined();
    expect(screen.getByText('Vous avez uni Alice et Bob.')).toBeDefined();
    expect(screen.getByText(/Vous aimez Chloé \(Petite fille\)/)).toBeDefined();
    expect(screen.getByText('B _ _')).toBeDefined();
    expect(screen.getByText(/Bob, Chloé, David/)).toBeDefined();
    expect(await axeViolations(container)).toEqual([]);
  });

  it('sans info, rien n est affiche', () => {
    const { container } = renderWithProviders(<MyInfo knowledge={[]} names={NAMES} />);

    expect(container.textContent).toBe('');
  });
});

describe('Carte de role illustree (T8)', () => {
  it('une fois retournee, la carte de repli porte le nom du role', async () => {
    const { container } = renderWithProviders(<RoleCard role="little-girl" />);

    fireEvent.pointerDown(screen.getByRole('button', { pressed: false }));
    expect(screen.getByRole('figure', { name: fr.roles.little_girl.name })).toBeDefined();
    expect(await axeViolations(container)).toEqual([]);
  });
});
