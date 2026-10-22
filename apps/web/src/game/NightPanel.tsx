import type { PlayerView } from '@rougarou/protocol';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { MaskedName } from './MaskedName.tsx';

type Night = NonNullable<PlayerView['night']>;

/**
 * L'etape de nuit telle que le serveur la montre au joueur qui y prend part
 * (`docs/12` §2). Les autres n'en recoivent rien : ce panneau n'existe pas
 * pour eux.
 */
export function NightPanel({
  night,
  names,
}: {
  readonly night: Night;
  readonly names: ReadonlyMap<string, string>;
}) {
  const { t } = useTranslation();
  const title = useId();

  return (
    <section
      aria-labelledby={title}
      className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4 text-text"
    >
      <h2 id={title} className="font-display text-xl">
        {t(`night.${night.step}.title`)}
      </h2>
      <StepBody night={night} names={names} />
      {night.resolved ? <p className="text-sm text-text-muted">{t('night.resolved')}</p> : null}
    </section>
  );
}

function StepBody({
  night,
  names,
}: {
  readonly night: Night;
  readonly names: ReadonlyMap<string, string>;
}) {
  const { t } = useTranslation();
  const name = (id: string) => names.get(id) ?? id;

  switch (night.step) {
    case 'wolves':
      return (
        <ul className="flex flex-col gap-1">
          {Object.entries(night.wolfVotes).map(([wolf, target]) => (
            <li key={wolf}>{t('night.wolves.vote', { wolf: name(wolf), target: name(target) })}</li>
          ))}
        </ul>
      );
    case 'seer':
      return <p>{t('night.seer.prompt')}</p>;
    case 'witch':
      return (
        <>
          <p>
            {night.victim === null
              ? t('night.witch.no_victim')
              : t('night.witch.victim', { name: name(night.victim) })}
          </p>
          <p className="text-sm text-text-muted">
            {t(night.potions.life ? 'night.witch.life_left' : 'night.witch.life_used')}
            {' · '}
            {t(night.potions.death ? 'night.witch.death_left' : 'night.witch.death_used')}
          </p>
        </>
      );
    case 'cupid':
      return <p>{t('night.cupid.prompt')}</p>;
    case 'lovers':
      return (
        <p>
          {t('night.lovers.partner', { name: name(night.partner) })}
          {night.confirmed ? ` ${t('night.lovers.confirmed')}` : ''}
        </p>
      );
    case 'spy':
      return night.pack === null ? (
        <p>{t('night.spy.prompt')}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {night.pack.map((wolf, index) => (
            <li key={index} className="flex flex-wrap items-center gap-2">
              <MaskedName mask={wolf.mask} />
              <span>
                {wolf.target === null
                  ? t('night.spy.undecided')
                  : t('night.spy.target', { name: name(wolf.target) })}
              </span>
            </li>
          ))}
        </ul>
      );
  }
}
