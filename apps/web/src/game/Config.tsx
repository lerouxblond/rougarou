import { balanceOf, type Composition, type NarratorView, type RoleId } from '@rougarou/protocol';
import { BalanceMeter, Button, Stepper } from '@rougarou/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormError } from '../components/Field.tsx';
import { ConfigOptions } from './ConfigOptions.tsx';
import { useSendCommand } from './hooks.ts';
import { roleKey } from './roles.ts';

/** Les roles proposes : ceux du palier `core` (M3, `docs/02`). Les autres arrivent en M6. */
const ROLES: readonly RoleId[] = [
  'werewolf',
  'villager',
  'seer',
  'witch',
  'hunter',
  'cupid',
  'little-girl',
];

/** Les roles qui ne peuvent etre qu'en un exemplaire (`docs/02`). */
const UNIQUE: ReadonlySet<RoleId> = new Set(['seer', 'witch', 'hunter', 'cupid', 'little-girl']);

/**
 * La composition (US-20) : la suggestion du mode pour ce nombre de joueurs,
 * des compteurs + et −, et l'indicateur d'equilibre qui suit chaque changement.
 * Le brouillon reste local jusqu'a « Enregistrer » ; c'est le moteur qui le
 * valide (`Deal.issues`).
 */
function CompositionEditor({ view }: { readonly view: NarratorView }) {
  const { t } = useTranslation();
  const { send, busy, error } = useSendCommand();
  const [draft, setDraft] = useState<Composition>(view.composition);
  const total = ROLES.reduce((sum, role) => sum + (draft[role] ?? 0), 0);
  const balance = balanceOf(draft);

  function change(role: RoleId, count: number): void {
    const others = Object.entries(draft).filter(([other]) => other !== role);

    setDraft(Object.fromEntries(count === 0 ? others : [...others, [role, count]]));
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-text">{t('game.composition')}</h2>
        {view.suggestion === null ? null : (
          <Button
            variant="ghost"
            size="md"
            onClick={() => {
              if (view.suggestion !== null) {
                setDraft(view.suggestion);
              }
            }}
          >
            {t('game.use_suggestion')}
          </Button>
        )}
      </div>
      <p aria-live="polite" className="text-text-muted">
        {t('game.composition_count', { count: total, players: view.players.length })}
      </p>
      <BalanceMeter
        label={t('balance.label')}
        score={balance.score}
        verdict={balance.verdict}
        verdictLabel={t(`balance.${balance.verdict}`)}
        wolvesLabel={t('teams.wolves')}
        villageLabel={t('teams.village')}
      />
      <ul className="flex flex-col gap-2">
        {ROLES.map((role) => {
          const name = t(`roles.${roleKey(role)}.name`);

          return (
            <li key={role} className="rounded-md bg-surface px-3 py-1">
              <Stepper
                label={name}
                value={draft[role] ?? 0}
                min={0}
                max={UNIQUE.has(role) ? 1 : 24}
                onChange={(count) => {
                  change(role, count);
                }}
                decrementLabel={t('game.decrease', { role: name })}
                incrementLabel={t('game.increase', { role: name })}
              />
            </li>
          );
        })}
      </ul>
      <Button
        variant="secondary"
        loading={busy}
        onClick={() => {
          void send({ type: 'SetComposition', composition: draft });
        }}
      >
        {t('game.save_composition')}
      </Button>
      <FormError message={error === null ? null : t(error)} />
    </section>
  );
}

/** La configuration du meneur : la composition, puis les options. */
export function Config({ view }: { readonly view: NarratorView }) {
  return (
    <div className="flex flex-col gap-8">
      <CompositionEditor view={view} />
      <ConfigOptions view={view} />
    </div>
  );
}
