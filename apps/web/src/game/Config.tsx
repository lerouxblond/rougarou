import type { Composition, NarratorView, RoleId } from '@rougarou/protocol';
import { Button } from '@rougarou/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormError } from '../components/Field.tsx';
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

/**
 * Configuration brute (M2, roles de M3) : compteurs par role, puis « Distribuer ». La
 * composition en cours d'edition est un etat de formulaire ; c'est le moteur
 * qui la valide (`Deal.issues`).
 */
export function Config({ view }: { readonly view: NarratorView }) {
  const { t } = useTranslation();
  const { send, busy, error } = useSendCommand();
  const [draft, setDraft] = useState<Composition>(view.composition);
  const total = ROLES.reduce((sum, role) => sum + (draft[role] ?? 0), 0);

  function change(role: RoleId, by: number): void {
    const count = Math.max(0, (draft[role] ?? 0) + by);
    const others = Object.entries(draft).filter(([other]) => other !== role);

    setDraft(Object.fromEntries(count === 0 ? others : [...others, [role, count]]));
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-xl text-text">{t('game.composition')}</h2>
      <p className="text-text-muted">
        {t('game.composition_count', { count: total, players: view.players.length })}
      </p>
      <ul className="flex flex-col gap-2">
        {ROLES.map((role) => {
          const name = t(`roles.${roleKey(role)}.name`);

          return (
            <li key={role} className="flex items-center gap-3 rounded-card bg-surface p-3">
              <span className="grow text-text">{name}</span>
              <Button
                size="md"
                variant="secondary"
                aria-label={t('game.decrease', { role: name })}
                onClick={() => {
                  change(role, -1);
                }}
              >
                −
              </Button>
              <output className="w-8 text-center text-text" aria-live="polite">
                {draft[role] ?? 0}
              </output>
              <Button
                size="md"
                variant="secondary"
                aria-label={t('game.increase', { role: name })}
                onClick={() => {
                  change(role, 1);
                }}
              >
                +
              </Button>
            </li>
          );
        })}
      </ul>
      <Button
        variant="secondary"
        disabled={busy}
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
