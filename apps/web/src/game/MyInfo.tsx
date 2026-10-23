import type { PlayerView } from '@rougarou/protocol';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { MaskedName } from './MaskedName.tsx';
import { roleKey } from './roles.ts';

type Knowledge = NonNullable<PlayerView['me']>['knowledge'][number];

/**
 * « Mes infos » (J22, ADR 0010) : ce que le joueur a appris en secret. La
 * region est annoncee : une info qui arrive en pleine nuit est lue aussitot.
 */
export function MyInfo({
  knowledge,
  names,
}: {
  readonly knowledge: readonly Knowledge[];
  readonly names: ReadonlyMap<string, string>;
}) {
  const { t } = useTranslation();
  const title = useId();

  if (knowledge.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby={title}
      aria-live="polite"
      className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4 text-text"
    >
      <h2 id={title} className="font-display text-xl">
        {t('my_info.title')}
      </h2>
      <ul className="flex flex-col gap-2">
        {knowledge.map((info, index) => (
          <li key={index}>
            <InfoLine info={info} names={names} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function InfoLine({
  info,
  names,
}: {
  readonly info: Knowledge;
  readonly names: ReadonlyMap<string, string>;
}) {
  const { t } = useTranslation();
  const name = (id: string) => names.get(id) ?? id;

  switch (info.kind) {
    case 'seerRole':
      return t('my_info.seer_role', {
        night: info.night,
        name: name(info.playerId),
        role: t(`roles.${roleKey(info.role)}.name`),
      });
    case 'seerTeam':
      return t('my_info.seer_team', {
        night: info.night,
        name: name(info.playerId),
        team: t(`teams.${info.team}`),
      });
    case 'couple':
      return t('my_info.couple', { first: name(info.players[0]), second: name(info.players[1]) });
    case 'lover':
      return t('my_info.lover', {
        name: name(info.playerId),
        role: t(`roles.${roleKey(info.role)}.name`),
      });
    case 'wolfGlimpse':
      return (
        <span className="flex flex-col gap-1">
          {t('my_info.wolf_glimpse', { night: info.night })}
          {info.masks.map((mask, index) => (
            <MaskedName key={index} mask={mask} />
          ))}
        </span>
      );
    case 'littleGirlSuspects':
      return t('my_info.little_girl_suspects', {
        night: info.night,
        names: info.players.map(name).join(', '),
      });
  }
}
