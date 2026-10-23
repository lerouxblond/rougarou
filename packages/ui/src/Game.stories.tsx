import type { Story, StoryDefault } from '@ladle/react';

import { MayorBadge } from './MayorBadge.tsx';
import { PlayerChip } from './PlayerChip.tsx';
import { PlayerCircle } from './PlayerCircle.tsx';
import { RoleCard } from './RoleCard.tsx';
import { RoleCardArt } from './RoleCardArt.tsx';
import { TargetPicker } from './TargetPicker.tsx';

export default {
  title: 'Jeu',
} satisfies StoryDefault;

const NAMES = ['Alice', 'Bob', 'Chloé', 'David', 'Eve', 'Fanny', 'Gaspard', 'Hugo'];

export const CarteDeRole: Story = () => (
  <RoleCard
    face={<RoleCardArt role="seer" team="village" name="Voyante" teamLabel="Village" />}
    hiddenLabel="Ton rôle est caché"
    holdHint="Maintiens pour révéler"
    timedRevealLabel="Révéler 5 s"
  />
);

export const Joueurs: Story = () => (
  <div className="flex flex-col gap-3">
    <PlayerChip name="Alice" badges={<MayorBadge label="Maire" />} />
    <PlayerChip name="Bob" deadLabel="Mort" detail="Voyante" />
    <PlayerChip name="Chloé" disconnectedLabel="Hors ligne" />
  </div>
);

export const Cercle: Story = () => (
  <PlayerCircle
    label="Joueurs"
    items={NAMES.map((name, index) => ({
      id: name,
      node: <PlayerChip name={name} {...(index === 2 ? { deadLabel: 'Mort' } : {})} />,
    }))}
  />
);

export const Cible: Story = () => (
  <div className="w-80">
    <TargetPicker
      legend="Qui veux-tu sonder ?"
      options={NAMES.slice(0, 6).map((name) => ({ id: name, label: name }))}
      confirmLabel="Confirmer"
      onConfirm={() => undefined}
    />
  </div>
);

export const DeuxCibles: Story = () => (
  <div className="w-80">
    <TargetPicker
      legend="Désigne les deux amoureux"
      options={NAMES.slice(0, 6).map((name) => ({ id: name, label: name }))}
      count={2}
      confirmLabel="Unir"
      onConfirm={() => undefined}
    />
  </div>
);
