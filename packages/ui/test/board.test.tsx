import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  BalanceMeter,
  NarratorScript,
  NightStepList,
  PhaseBanner,
  Timer,
  VoteBoard,
  type StepState,
} from '../src/index.ts';
import { axeViolations } from './axe.ts';

afterEach(cleanup);

const T0 = 1_000_000;
const STATES: Record<StepState, string> = {
  upcoming: 'a venir',
  current: 'en cours',
  done: 'faite',
  skipped: 'passee',
};

function timer(now: number, paused: number | null = null) {
  return (
    <Timer
      deadline={paused === null ? T0 + 45_000 : null}
      pausedRemaining={paused}
      label="Temps restant"
      pausedLabel="En pause"
      announce={(seconds) => `Plus que ${seconds} secondes`}
      now={now}
    />
  );
}

const ENTRIES = [
  { id: 'p1', label: 'Alice', votes: 1, voters: ['Bob'] },
  { id: 'p2', label: 'Bob', votes: 3, voters: ['Alice', 'Chloe'] },
];

const BOARD = (
  <>
    <PhaseBanner title="Le vote" subtitle="Jour 2" timer={timer(T0)} />
    <NarratorScript
      label="Texte a lire"
      current="La Voyante se reveille."
      previous="Le village s endort."
      next="Les loups se reveillent."
      previousLabel="Avant"
      nextLabel="Ensuite"
    />
    <NightStepList
      label="Ordre de la nuit"
      stateLabels={STATES}
      steps={[
        { id: 'cupid', label: 'Cupidon', state: 'done' },
        { id: 'seer', label: 'Voyante', state: 'current' },
        { id: 'wolves', label: 'Loups', state: 'upcoming' },
      ]}
    />
    <VoteBoard
      label="Votes"
      entries={ENTRIES}
      visibility="public"
      progress="3 sur 5 ont vote"
      votesLabel={(votes) => `${votes} voix`}
    />
    <BalanceMeter
      label="Equilibre"
      score={5}
      verdict="village"
      verdictLabel="Avantage village"
      wolvesLabel="Loups"
      villageLabel="Village"
    />
  </>
);

describe('Tableau de partie (docs/06)', () => {
  it.each(['night', 'day'])('ne signale aucune violation axe en theme %s', async (phase) => {
    const { container } = render(<main data-phase={phase}>{BOARD}</main>);

    expect(await axeViolations(container)).toEqual([]);
  });

  describe('Timer', () => {
    it('affiche le temps restant, sans s annoncer avant 30 s', () => {
      render(timer(T0));

      expect(screen.getByRole('timer', { name: 'Temps restant' }).textContent).toBe('0:45');
      expect(screen.queryByText(/Plus que/)).toBeNull();
    });

    it.each([
      [20_000, 'Plus que 30 secondes'],
      [36_000, 'Plus que 10 secondes'],
      [45_000, 'Plus que 0 secondes'],
    ])('a %i ms, annonce « %s »', (elapsed, announcement) => {
      render(timer(T0 + elapsed));

      expect(screen.getByText(announcement).getAttribute('aria-live')).toBe('polite');
    });

    it('en pause, montre la duree restante et le dit', () => {
      render(timer(T0, 12_000));

      expect(screen.getByRole('timer').textContent).toBe('0:12');
      expect(screen.getByText('En pause')).toBeTruthy();
    });

    it('sans minuteur, ne rend rien', () => {
      const { container } = render(
        <Timer
          deadline={null}
          pausedRemaining={null}
          label="Temps"
          pausedLabel="En pause"
          announce={String}
        />,
      );

      expect(container.textContent).toBe('');
    });
  });

  it('PhaseBanner annonce le changement de phase', () => {
    render(<PhaseBanner title="La nuit tombe" subtitle="Nuit 1" />);

    expect(
      screen
        .getByRole('heading', { name: 'La nuit tombe' })
        .parentElement?.getAttribute('aria-live'),
    ).toBe('polite');
  });

  it('NightStepList marque l etape en cours et ecrit chaque etat', () => {
    render(BOARD);

    const current = screen.getByText('Voyante').closest('li');

    expect(current?.getAttribute('aria-current')).toBe('step');
    expect(screen.getByText('faite')).toBeTruthy();
  });

  it('VoteBoard public : candidats classes par voix, avec les votants', () => {
    render(BOARD);

    const rows = screen.getByRole('region', { name: 'Votes' }).querySelectorAll('li');

    expect(rows[0]?.textContent).toContain('Bob');
    expect(rows[0]?.textContent).toContain('Alice, Chloe');
  });

  it('VoteBoard secret : seulement le compteur', () => {
    render(
      <VoteBoard
        label="Votes"
        entries={ENTRIES}
        visibility="secret"
        progress="3 sur 5 ont vote"
        votesLabel={String}
      />,
    );

    expect(screen.getByText('3 sur 5 ont vote')).toBeTruthy();
    expect(screen.queryByText('Bob')).toBeNull();
  });

  it('BalanceMeter dit son verdict en toutes lettres', () => {
    render(BOARD);

    const meter = screen.getByRole('meter', { name: 'Equilibre' });

    expect(meter.getAttribute('aria-valuetext')).toBe('Avantage village');
    expect(meter.getAttribute('aria-valuenow')).toBe('5');
  });
});
