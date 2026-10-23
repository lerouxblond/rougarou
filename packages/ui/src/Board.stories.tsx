import type { Story, StoryDefault } from '@ladle/react';
import { useState } from 'react';

import { BalanceMeter } from './BalanceMeter.tsx';
import { NarratorScript } from './NarratorScript.tsx';
import { NightStepList, type StepState } from './NightStepList.tsx';
import { PhaseBanner } from './PhaseBanner.tsx';
import { Timer } from './Timer.tsx';
import { VoteBoard } from './VoteBoard.tsx';

export default {
  title: 'Tableau',
} satisfies StoryDefault;

const STATES: Record<StepState, string> = {
  upcoming: 'à venir',
  current: 'en cours',
  done: 'faite',
  skipped: 'passée',
};

export const Bandeau: Story = () => {
  const [deadline] = useState(() => Date.now() + 45_000);

  return (
    <div className="w-96">
      <PhaseBanner
        title="La nuit tombe"
        subtitle="Nuit 2"
        timer={
          <Timer
            deadline={deadline}
            pausedRemaining={null}
            label="Temps restant"
            pausedLabel="En pause"
            announce={(seconds) => `Plus que ${seconds} secondes`}
          />
        }
      />
    </div>
  );
};

export const Script: Story = () => (
  <div className="w-96">
    <NarratorScript
      label="Texte à lire"
      current="La Voyante se réveille et désigne un joueur dont elle veut connaître le rôle."
      previous="Cupidon se rendort."
      next="Les loups-garous se réveillent."
      previousLabel="Avant"
      nextLabel="Ensuite"
    />
  </div>
);

export const OrdreDeNuit: Story = () => (
  <NightStepList
    label="Ordre de la nuit"
    stateLabels={STATES}
    steps={[
      { id: 'cupid', label: 'Cupidon', state: 'done' },
      { id: 'lovers', label: 'Amoureux', state: 'skipped' },
      { id: 'seer', label: 'Voyante', state: 'current' },
      { id: 'wolves', label: 'Loups-garous', state: 'upcoming' },
      { id: 'witch', label: 'Sorcière', state: 'upcoming' },
    ]}
  />
);

export const Votes: Story = () => (
  <div className="w-80">
    <VoteBoard
      label="Votes"
      visibility="public"
      progress="5 sur 7 ont voté"
      votesLabel={(votes) => `${votes} voix`}
      entries={[
        { id: 'a', label: 'Alice', votes: 1, voters: ['Bob'] },
        { id: 'b', label: 'Bob', votes: 3, voters: ['Alice', 'Chloé'] },
        { id: 'c', label: 'Chloé', votes: 1, voters: ['Eve'] },
      ]}
    />
  </div>
);

export const Equilibre: Story = () => (
  <div className="flex w-80 flex-col gap-6">
    {(
      [
        [-9, 'wolves', 'Avantage loups'],
        [1, 'balanced', 'Équilibré'],
        [8, 'village', 'Avantage village'],
      ] as const
    ).map(([score, verdict, text]) => (
      <BalanceMeter
        key={verdict}
        label="Équilibre"
        score={score}
        verdict={verdict}
        verdictLabel={text}
        wolvesLabel="Loups"
        villageLabel="Village"
      />
    ))}
  </div>
);
