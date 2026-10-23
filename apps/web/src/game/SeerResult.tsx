import type { PlayerView } from '@rougarou/protocol';
import { RoleCardArt, TEAM_ICON_IDS, TeamIcon, type TeamIconId } from '@rougarou/ui';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { CARD_TEAMS, hasCardArt, roleKey } from './roles.ts';

type Knowledge = NonNullable<PlayerView['me']>['knowledge'][number];

/**
 * Ce que la Voyante vient d'apprendre (`docs/03` : le resultat s'affiche en
 * prive). Il vient de ses infos, ou le serveur l'a range : le client ne
 * calcule rien. Rien a montrer si elle n'a sonde personne (minuteur, forcage).
 */
export function SeerResult({
  knowledge,
  nightNumber,
  names,
}: {
  readonly knowledge: readonly Knowledge[];
  readonly nightNumber: number;
  readonly names: ReadonlyMap<string, string>;
}) {
  const { t } = useTranslation();
  const title = useId();
  const info = knowledge.find(
    (entry) =>
      (entry.kind === 'seerRole' || entry.kind === 'seerTeam') && entry.night === nightNumber,
  );

  if (info?.kind !== 'seerRole' && info?.kind !== 'seerTeam') {
    return <p>{t('night.seer.no_probe')}</p>;
  }

  const name = names.get(info.playerId) ?? info.playerId;

  return (
    <div role="status" aria-labelledby={title} className="flex flex-col items-center gap-3">
      <h3 id={title} className="sr-only">
        {t('night.seer.result_title')}
      </h3>
      {info.kind === 'seerRole' ? (
        <>
          {hasCardArt(info.role) ? (
            <RoleCardArt
              role={info.role}
              team={CARD_TEAMS[info.role]}
              name={t(`roles.${roleKey(info.role)}.name`)}
              teamLabel={t(`teams.${CARD_TEAMS[info.role]}`)}
            />
          ) : null}
          <p className="font-display text-2xl">
            {t('night.seer.result_role', {
              name,
              role: t(`roles.${roleKey(info.role)}.name`),
            })}
          </p>
        </>
      ) : (
        <>
          {hasTeamIcon(info.team) ? <TeamIcon team={info.team} className="size-16" /> : null}
          <p className="font-display text-2xl">
            {t('night.seer.result_team', { name, team: t(`teams.${info.team}`) })}
          </p>
        </>
      )}
    </div>
  );
}

function hasTeamIcon(team: string): team is TeamIconId {
  return (TEAM_ICON_IDS as readonly string[]).includes(team);
}
