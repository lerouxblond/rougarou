import {
  resolveFakeWake,
  type GameOptions,
  type NarratorView,
  type TimerKey,
} from '@rougarou/protocol';
import { Button, Switch } from '@rougarou/ui';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormError } from '../components/Field.tsx';
import { useSendCommand } from './hooks.ts';

type Toggle = {
  [K in keyof GameOptions]-?: GameOptions[K] extends boolean ? K : never;
}[keyof GameOptions];
type Choice =
  | 'playMode'
  | 'dealMode'
  | 'pilotMode'
  | 'mayorSuccession'
  | 'voteVisibility'
  | 'tieBreak'
  | 'wolfVoteMode'
  | 'seerMode'
  | 'witchSelfSave';

type Field =
  | { readonly kind: 'toggle'; readonly key: Toggle }
  | { readonly kind: 'choice'; readonly key: Choice; readonly values: readonly string[] };

/**
 * Les options de `docs/01` §8, groupees (US-21). `roleplay`, `parallelNight`
 * et le mode de jeu attendent leur jalon (`R-15`) : ils ne sont pas proposes.
 */
const GROUPS: readonly { readonly id: string; readonly fields: readonly Field[] }[] = [
  {
    id: 'table',
    fields: [
      { kind: 'choice', key: 'playMode', values: ['inPerson', 'remote'] },
      { kind: 'choice', key: 'pilotMode', values: ['assisted', 'manual'] },
      { kind: 'choice', key: 'dealMode', values: ['simultaneous', 'ceremony'] },
    ],
  },
  {
    id: 'votes',
    fields: [
      { kind: 'toggle', key: 'mayor' },
      { kind: 'choice', key: 'mayorSuccession', values: ['designate', 'reelect'] },
      { kind: 'choice', key: 'voteVisibility', values: ['public', 'secret'] },
      { kind: 'toggle', key: 'allowSpare' },
      { kind: 'toggle', key: 'allowAbstain' },
      { kind: 'choice', key: 'tieBreak', values: ['mayor', 'revote', 'nobody'] },
    ],
  },
  {
    id: 'night',
    fields: [
      { kind: 'choice', key: 'wolfVoteMode', values: ['unanimous', 'majority'] },
      { kind: 'toggle', key: 'wolvesWinOnParity' },
      { kind: 'choice', key: 'seerMode', values: ['role', 'team'] },
      { kind: 'choice', key: 'witchSelfSave', values: ['never', 'firstNightOnly', 'always'] },
    ],
  },
  {
    id: 'reveal',
    fields: [
      { kind: 'toggle', key: 'revealRoleOnDeath' },
      { kind: 'toggle', key: 'deadSeeRoles' },
    ],
  },
];

/** Les minuteurs reglables (`docs/12` §4) ; ceux du role play attendent M5. */
const TIMERS: readonly TimerKey[] = [
  'roleReveal',
  'ceremonyCard',
  'nightAction',
  'wolfVote',
  'hunterShot',
  'mayorSuccessor',
  'tieBreak',
  'mayorCandidacy',
  'mayorVote',
  'debate',
  'dayVote',
];

/** Le segment i18n d'une option : `voteVisibility` devient `vote_visibility` (`docs/09`). */
function optionKey(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function ChoiceField({
  field,
  value,
  onChange,
}: {
  readonly field: Extract<Field, { kind: 'choice' }>;
  readonly value: string;
  readonly onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  const id = useId();
  const name = optionKey(field.key);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-text">
        {t(`options.${name}.label`)}
      </label>
      <span id={`${id}-help`} className="text-sm text-text-muted">
        {t(`options.${name}.help`)}
      </span>
      <select
        id={id}
        aria-describedby={`${id}-help`}
        value={value}
        className="min-h-11 rounded-md border border-border bg-surface px-3 text-text"
        onChange={(event) => {
          onChange(event.target.value);
        }}
      >
        {field.values.map((option) => (
          <option key={option} value={option}>
            {t(`options.${name}.values.${optionKey(option)}`)}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Un nombre borne, par exemple un pourcentage de risque. */
function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly onChange: (value: number) => void;
}) {
  const id = useId();

  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="text-text">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        value={value}
        className="min-h-11 w-24 rounded-md border border-border bg-surface px-3 text-right text-text"
        onChange={(event) => {
          onChange(Math.max(min, Math.min(max, Number(event.target.value))));
        }}
      />
    </div>
  );
}

function TimerField({
  timer,
  value,
  onChange,
}: {
  readonly timer: TimerKey;
  readonly value: number | null;
  readonly onChange: (value: number | null) => void;
}) {
  const { t } = useTranslation();
  const id = useId();

  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="text-text">
        {t(`options.timers.${optionKey(timer)}`)}
      </label>
      <input
        id={id}
        type="number"
        min={5}
        max={3600}
        placeholder={t('options.timers.none')}
        value={value ?? ''}
        className="min-h-11 w-24 rounded-md border border-border bg-surface px-3 text-right text-text"
        onChange={(event) => {
          onChange(event.target.value === '' ? null : Number(event.target.value));
        }}
      />
    </div>
  );
}

/**
 * Le reglage des options (US-21) : groupes Table, Votes, Nuit, Revelations,
 * Minuteurs, chaque option avec son aide. Le brouillon reste local jusqu'a
 * « Enregistrer » ; c'est le moteur qui l'accepte ou le refuse.
 */
export function ConfigOptions({ view }: { readonly view: NarratorView }) {
  const { t } = useTranslation();
  const { send, busy, error } = useSendCommand();
  const [draft, setDraft] = useState<GameOptions>(view.options);
  const set = <K extends keyof GameOptions>(key: K, value: GameOptions[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  return (
    <section className="flex flex-col gap-6">
      <h2 className="font-display text-2xl text-text">{t('options.title')}</h2>
      {GROUPS.map((group) => (
        <fieldset
          key={group.id}
          className="flex flex-col gap-4 rounded-card border border-border p-4"
        >
          <legend className="px-1 font-display text-xl text-text">
            {t(`options.groups.${group.id}`)}
          </legend>
          {group.fields.map((field) =>
            field.kind === 'toggle' ? (
              <Switch
                key={field.key}
                label={t(`options.${optionKey(field.key)}.label`)}
                description={t(`options.${optionKey(field.key)}.help`)}
                checked={draft[field.key]}
                onCheckedChange={(checked) => {
                  set(field.key, checked);
                }}
              />
            ) : (
              <ChoiceField
                key={field.key}
                field={field}
                value={draft[field.key]}
                onChange={(value) => {
                  setDraft((current) => ({ ...current, [field.key]: value }));
                }}
              />
            ),
          )}
          {group.id === 'night' ? (
            <>
              <Switch
                label={t('options.fake_wake_for_dead_roles.label')}
                description={t('options.fake_wake_for_dead_roles.help')}
                checked={resolveFakeWake(draft)}
                onCheckedChange={(checked) => {
                  set('fakeWakeForDeadRoles', checked);
                }}
              />
              <p className="text-sm text-text-muted">{t('options.little_girl_risk.help')}</p>
              <NumberField
                label={t('options.little_girl_risk.base')}
                value={draft.littleGirlRisk.base}
                min={0}
                max={50}
                onChange={(base) => {
                  set('littleGirlRisk', { ...draft.littleGirlRisk, base });
                }}
              />
              <NumberField
                label={t('options.little_girl_risk.increase')}
                value={draft.littleGirlRisk.increase}
                min={0}
                max={25}
                onChange={(increase) => {
                  set('littleGirlRisk', { ...draft.littleGirlRisk, increase });
                }}
              />
            </>
          ) : null}
        </fieldset>
      ))}
      <fieldset className="flex flex-col gap-3 rounded-card border border-border p-4">
        <legend className="px-1 font-display text-xl text-text">
          {t('options.groups.timers')}
        </legend>
        <p className="text-sm text-text-muted">{t('options.timers.help')}</p>
        {TIMERS.map((timer) => (
          <TimerField
            key={timer}
            timer={timer}
            value={draft.timers[timer]}
            onChange={(value) => {
              set('timers', { ...draft.timers, [timer]: value });
            }}
          />
        ))}
      </fieldset>
      <Button
        variant="secondary"
        loading={busy}
        onClick={() => {
          void send({ type: 'SetOptions', options: draft });
        }}
      >
        {t('options.save')}
      </Button>
      <FormError message={error === null ? null : t(error)} />
    </section>
  );
}
