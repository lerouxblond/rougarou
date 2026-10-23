import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Dialog, Sheet, Switch, Tabs, Toast, ToastRegion } from '../src/index.ts';
import { axeViolations } from './axe.ts';

afterEach(cleanup);

const CONTROLS = (
  <>
    <Switch
      label="Maire"
      description="Un Maire est elu le premier jour."
      checked
      onCheckedChange={() => undefined}
    />
    <Tabs
      label="Tableau du meneur"
      items={[
        { value: 'script', label: 'Script', content: <p>Le village s endort.</p> },
        { value: 'steps', label: 'Etapes', content: <p>Loups</p> },
      ]}
    />
  </>
);

describe('Controles Radix du design system (docs/06)', () => {
  it.each(['night', 'day'])('ne signale aucune violation axe en theme %s', async (phase) => {
    const { container } = render(<main data-phase={phase}>{CONTROLS}</main>);

    expect(await axeViolations(container)).toEqual([]);
  });

  it('Switch a un nom et une aide, et bascule', () => {
    const onChange = vi.fn();

    render(
      <Switch
        label="Maire"
        description="Un Maire est elu."
        checked={false}
        onCheckedChange={onChange}
      />,
    );

    const toggle = screen.getByRole('switch', { name: 'Maire' });

    expect(toggle.getAttribute('aria-describedby')).not.toBeNull();
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('Tabs se parcourt aux fleches du clavier', async () => {
    render(CONTROLS);

    const script = screen.getByRole('tab', { name: 'Script' });

    act(() => {
      script.focus();
    });
    fireEvent.keyDown(script, { key: 'ArrowRight' });
    // Radix deplace le focus au tour suivant de la boucle d'evenements.
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Etapes' }));
    });
  });

  it('Dialog prend le focus, se nomme et se ferme a Echap', async () => {
    const onOpenChange = vi.fn();

    render(
      <Dialog open onOpenChange={onOpenChange} title="Ma carte" closeLabel="Fermer">
        <p>Voyante</p>
      </Dialog>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Ma carte' });

    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(await axeViolations(dialog)).toEqual([]);
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('Sheet est un dialogue, pose en bas', () => {
    render(
      <Sheet open onOpenChange={() => undefined} title="Mes infos" closeLabel="Fermer">
        <p>Rien pour l instant.</p>
      </Sheet>,
    );

    expect(screen.getByRole('dialog', { name: 'Mes infos' }).className).toContain('bottom-0');
  });

  it('Toast s annonce dans une region nommee', () => {
    render(
      <ToastRegion label="Notifications">
        <Toast open onOpenChange={() => undefined} title="Connexion retrouvee" />
      </ToastRegion>,
    );

    expect(screen.getByRole('region', { name: /Notifications/ })).toBeTruthy();
    expect(screen.getByText('Connexion retrouvee')).toBeTruthy();
  });
});
