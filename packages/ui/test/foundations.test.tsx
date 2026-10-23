import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { Avatar, Badge, EmptyState, IconButton, Skeleton, Stepper } from '../src/index.ts';
import { axeViolations } from './axe.ts';

afterEach(cleanup);

/** Chaque composant est verifie dans les deux themes (`docs/06`). */
const PHASES = ['night', 'day'] as const;

function inPhase(phase: (typeof PHASES)[number], children: ReactNode) {
  return <main data-phase={phase}>{children}</main>;
}

function CounterStory() {
  const [value, setValue] = useState(1);

  return (
    <Stepper
      label="Voyante"
      value={value}
      min={0}
      max={1}
      onChange={setValue}
      decrementLabel="Retirer une Voyante"
      incrementLabel="Ajouter une Voyante"
    />
  );
}

const GALLERY = (
  <>
    <IconButton label="Fermer">×</IconButton>
    <Badge tone="village">Village</Badge>
    <p>
      <Avatar name="Alice Martin" /> Alice Martin
    </p>
    <CounterStory />
    <EmptyState title="Personne n a encore rejoint." />
    <Skeleton />
  </>
);

describe('Fondations du design system (docs/06)', () => {
  it.each(PHASES)('ne signale aucune violation axe en theme %s', async (phase) => {
    const { container } = render(inPhase(phase, GALLERY));

    expect(await axeViolations(container)).toEqual([]);
  });

  it('IconButton exige un nom accessible', () => {
    render(<IconButton label="Ma carte">◆</IconButton>);

    expect(screen.getByRole('button', { name: 'Ma carte' })).toBeTruthy();
    // Jamais rendu : seule compte l'erreur de typage.
    const withoutLabel = () => (
      // @ts-expect-error -- sans `label`, une icone seule ne dit rien (docs/06).
      <IconButton>◆</IconButton>
    );

    expect(withoutLabel).toBeTypeOf('function');
  });

  it('Avatar est decoratif : le pseudo est ecrit a cote', () => {
    const { container } = render(<Avatar name="alice martin" />);

    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
    expect(container.textContent).toBe('AM');
  });

  it('Stepper respecte ses bornes et annonce sa valeur', () => {
    render(<CounterStory />);

    const plus = screen.getByRole('button', { name: 'Ajouter une Voyante' });
    const minus = screen.getByRole('button', { name: 'Retirer une Voyante' });

    expect(plus).toHaveProperty('disabled', true);
    fireEvent.click(minus);
    expect(screen.getByRole('status').textContent).toBe('0');
    expect(minus).toHaveProperty('disabled', true);
    expect(screen.getByRole('group', { name: 'Voyante' })).toBeTruthy();
  });
});
