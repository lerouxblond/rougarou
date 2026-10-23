import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MayorBadge, PlayerChip, PlayerCircle, RoleCard, TargetPicker } from '../src/index.ts';
import { axeViolations } from './axe.ts';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function card() {
  return (
    <RoleCard
      face={<span>Voyante</span>}
      hiddenLabel="Votre role est cache"
      holdHint="Maintenez pour reveler"
      timedRevealLabel="Reveler 5 s"
    />
  );
}

const OPTIONS = [
  { id: 'p1', label: 'Alice' },
  { id: 'p2', label: 'Bob' },
  { id: 'p3', label: 'Chloe' },
];

const GALLERY = (
  <>
    {card()}
    <PlayerCircle
      label="Joueurs"
      items={[
        { id: 'p1', node: <PlayerChip name="Alice" badges={<MayorBadge label="Maire" />} /> },
        { id: 'p2', node: <PlayerChip name="Bob" deadLabel="Mort" detail="Voyante" /> },
        { id: 'p3', node: <PlayerChip name="Chloe" disconnectedLabel="Hors ligne" /> },
      ]}
    />
    <TargetPicker
      legend="Qui voulez-vous sonder ?"
      options={OPTIONS}
      confirmLabel="Confirmer"
      onConfirm={() => undefined}
    />
  </>
);

describe('Composants de jeu (docs/06)', () => {
  it.each(['night', 'day'])('ne signalent aucune violation axe en theme %s', async (phase) => {
    const { container } = render(<main data-phase={phase}>{GALLERY}</main>);

    expect(await axeViolations(container)).toEqual([]);
  });

  describe('RoleCard (US-30)', () => {
    it('reste cachee, se montre tant qu on la maintient, puis se recache', () => {
      render(card());

      const button = screen.getByRole('button', { pressed: false });

      expect(screen.queryByText('Voyante')).toBeNull();
      fireEvent.pointerDown(button);
      expect(screen.getByText('Voyante')).toBeTruthy();
      fireEvent.pointerUp(button);
      expect(screen.queryByText('Voyante')).toBeNull();
    });

    it('se montre au clavier tant qu Espace est enfonce, et se recache au depart du focus', () => {
      render(card());

      const button = screen.getByRole('button', { pressed: false });

      fireEvent.keyDown(button, { key: ' ' });
      expect(button.getAttribute('aria-pressed')).toBe('true');
      fireEvent.keyUp(button, { key: ' ' });
      expect(button.getAttribute('aria-pressed')).toBe('false');
      fireEvent.keyDown(button, { key: 'Enter' });
      fireEvent.blur(button);
      expect(screen.queryByText('Voyante')).toBeNull();
    });

    it('« Reveler 5 s » la montre cinq secondes, puis la recache seule', () => {
      vi.useFakeTimers();
      render(card());

      fireEvent.click(screen.getByRole('button', { name: 'Reveler 5 s' }));
      expect(screen.getByText('Voyante')).toBeTruthy();
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(screen.queryByText('Voyante')).toBeNull();
    });
  });

  it('PlayerChip ecrit l etat, pas seulement une couleur', () => {
    render(<PlayerChip name="Bob" deadLabel="Mort" disconnectedLabel="Hors ligne" />);

    expect(screen.getByText('Mort')).toBeTruthy();
    expect(screen.getByText('Hors ligne')).toBeTruthy();
  });

  it('PlayerCircle se lit comme une liste, dans l ordre des places', () => {
    render(GALLERY);

    const items = screen.getByRole('list', { name: 'Joueurs' }).querySelectorAll('li');

    expect(items).toHaveLength(3);
    ['Alice', 'Bob', 'Chloe'].forEach((name, index) => {
      expect(items[index]?.textContent).toContain(name);
    });
    expect(items[0]?.getAttribute('style')).toContain('--seat-y: 10.00%');
  });

  describe('TargetPicker', () => {
    it('ne propose que les cibles recues et demande une confirmation', () => {
      const onConfirm = vi.fn();

      render(
        <TargetPicker
          legend="Qui ?"
          options={OPTIONS}
          confirmLabel="Confirmer"
          onConfirm={onConfirm}
        />,
      );

      const confirm = screen.getByRole('button', { name: 'Confirmer' });

      expect(screen.getAllByRole('radio')).toHaveLength(3);
      expect(confirm).toHaveProperty('disabled', true);
      fireEvent.click(screen.getByRole('radio', { name: 'Bob' }));
      fireEvent.click(confirm);
      expect(onConfirm).toHaveBeenCalledWith(['p2']);
    });

    it('a deux cibles, il en faut exactement deux', () => {
      const onConfirm = vi.fn();

      render(
        <TargetPicker
          legend="Les amoureux"
          options={OPTIONS}
          count={2}
          confirmLabel="Confirmer"
          onConfirm={onConfirm}
        />,
      );

      const confirm = screen.getByRole('button', { name: 'Confirmer' });

      fireEvent.click(screen.getByRole('checkbox', { name: 'Alice' }));
      expect(confirm).toHaveProperty('disabled', true);
      fireEvent.click(screen.getByRole('checkbox', { name: 'Bob' }));
      fireEvent.click(screen.getByRole('checkbox', { name: 'Chloe' }));
      fireEvent.click(confirm);
      // Une troisieme case remplace la plus ancienne.
      expect(onConfirm).toHaveBeenCalledWith(['p2', 'p3']);
    });
  });
});
