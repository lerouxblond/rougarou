import type { Story, StoryDefault } from '@ladle/react';
import { useState } from 'react';

import { Avatar } from './Avatar.tsx';
import { Badge, type BadgeTone } from './Badge.tsx';
import { Button } from './Button.tsx';
import { EmptyState } from './EmptyState.tsx';
import { IconButton } from './IconButton.tsx';
import { Skeleton } from './Skeleton.tsx';
import { Stepper } from './Stepper.tsx';

export default {
  title: 'Fondations',
} satisfies StoryDefault;

const TONES: BadgeTone[] = ['neutral', 'accent', 'danger', 'village', 'wolves', 'solo'];

export const Etiquettes: Story = () => (
  <div className="flex flex-wrap gap-2">
    {TONES.map((tone) => (
      <Badge key={tone} tone={tone}>
        {tone}
      </Badge>
    ))}
  </div>
);

export const BoutonIcone: Story = () => (
  <div className="flex gap-2">
    <IconButton label="Fermer">×</IconButton>
    <IconButton label="Ma carte" variant="secondary">
      ◆
    </IconButton>
  </div>
);

export const Avatars: Story = () => (
  <div className="flex items-center gap-3">
    <Avatar name="Alice Martin" size="sm" />
    <Avatar name="Bob" />
    <Avatar name="Chloé Durand" size="lg" />
  </div>
);

export const Compteur: Story = () => {
  const [value, setValue] = useState(2);

  return (
    <div className="w-72">
      <Stepper
        label="Loup-garou"
        value={value}
        min={0}
        max={5}
        onChange={setValue}
        decrementLabel="Retirer un Loup-garou"
        incrementLabel="Ajouter un Loup-garou"
      />
    </div>
  );
};

export const Vide: Story = () => (
  <div className="w-80">
    <EmptyState
      title="Personne n’a encore rejoint."
      action={<Button size="md">Copier le lien</Button>}
    >
      Partage le code de la partie.
    </EmptyState>
  </div>
);

export const Chargement: Story = () => (
  <div className="flex w-72 flex-col gap-2">
    <Skeleton className="h-6 w-1/2" />
    <Skeleton />
    <Skeleton className="h-4 w-3/4" />
  </div>
);
