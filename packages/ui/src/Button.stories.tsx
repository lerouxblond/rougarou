import type { Story, StoryDefault } from '@ladle/react';

import { Button, type ButtonSize, type ButtonVariant } from './Button.tsx';

export default {
  title: 'Button',
} satisfies StoryDefault;

const VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger'];
const SIZES: ButtonSize[] = ['lg', 'md'];

export const Variantes: Story = () => (
  <div className="flex flex-wrap items-center gap-4">
    {VARIANTS.map((variant) => (
      <Button key={variant} variant={variant}>
        Créer une partie
      </Button>
    ))}
  </div>
);

export const Tailles: Story = () => (
  <div className="flex flex-wrap items-center gap-4">
    {SIZES.map((size) => (
      <Button key={size} size={size}>
        Rejoindre
      </Button>
    ))}
  </div>
);

export const Etats: Story = () => (
  <div className="flex flex-wrap items-center gap-4">
    <Button>Normal</Button>
    <Button loading>Chargement</Button>
    <Button disabled>Désactivé</Button>
  </div>
);

export const SurToutesLesVariantes: Story = () => (
  <div className="flex flex-col gap-4">
    {VARIANTS.map((variant) => (
      <div key={variant} className="flex flex-wrap items-center gap-4">
        {SIZES.map((size) => (
          <Button key={size} variant={variant} size={size}>
            {variant} / {size}
          </Button>
        ))}
        <Button variant={variant} disabled>
          désactivé
        </Button>
      </div>
    ))}
  </div>
);
