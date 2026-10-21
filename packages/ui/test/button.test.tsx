import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Button } from '../src/index.ts';

afterEach(cleanup);

/**
 * Lance axe sur le conteneur rendu et rend les violations.
 *
 * `color-contrast` est desactive : jsdom n'a pas de canvas et ne calcule aucune
 * couleur effective, donc axe ne pourrait rien conclure ici. Le contraste est
 * verifie sur les tokens eux-memes dans `contrast.test.ts`, comme le demande
 * `docs/06`.
 */
async function axeViolations(element: HTMLElement): Promise<axe.Result[]> {
  const results = await axe.run(element, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    rules: { 'color-contrast': { enabled: false } },
  });

  return results.violations;
}

describe('Button', () => {
  it('rend un vrai bouton, pas une div (docs/09)', () => {
    render(<Button>Créer une partie</Button>);

    const button = screen.getByRole('button', { name: 'Créer une partie' });

    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveProperty('type', 'button');
  });

  it('affiche le libelle qu on lui passe : aucun texte en dur (CLAUDE.md regle 6)', () => {
    render(<Button>Rejoindre une partie</Button>);

    expect(screen.getByRole('button').textContent).toBe('Rejoindre une partie');
  });

  it('declenche onClick au clavier comme a la souris (docs/09)', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Confirmer</Button>);

    const button = screen.getByRole('button');
    button.focus();

    expect(document.activeElement).toBe(button);

    button.click();

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('ne declenche rien quand il est desactive', () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Confirmer
      </Button>,
    );

    screen.getByRole('button').click();

    expect(onClick).not.toHaveBeenCalled();
  });

  it('expose l etat de chargement aux lecteurs d ecran', () => {
    render(<Button loading>Créer une partie</Button>);

    const button = screen.getByRole('button');

    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it.each(['primary', 'secondary', 'ghost', 'danger'] as const)(
    'passe axe en variante %s',
    async (variant) => {
      const { container } = render(<Button variant={variant}>Action</Button>);

      expect(await axeViolations(container)).toEqual([]);
    },
  );

  it.each(['md', 'lg'] as const)('passe axe en taille %s', async (size) => {
    const { container } = render(<Button size={size}>Action</Button>);

    expect(await axeViolations(container)).toEqual([]);
  });

  it('garde une zone tactile d au moins 44 px (docs/06)', () => {
    render(<Button size="md">Action</Button>);

    // Les classes utilitaires ne sont pas evaluees en jsdom : on verifie que la
    // contrainte est bien declaree, ce que le test visuel de Ladle complete.
    expect(screen.getByRole('button').className).toContain('tap-target');
  });

  it('accepte une classe supplementaire sans perdre les siennes', () => {
    render(<Button className="w-full">Action</Button>);

    const { className } = screen.getByRole('button');

    expect(className).toContain('w-full');
    expect(className).toContain('rounded-pill');
  });
});
