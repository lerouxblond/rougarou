import type { RoleId } from '@rougarou/protocol';
import { RoleCard as HoldToReveal, RoleCardArt } from '@rougarou/ui';
import { useTranslation } from 'react-i18next';

import { CARD_TEAMS, hasCardArt, roleKey } from './roles.ts';

/**
 * La carte du joueur (US-30) : le geste « maintenir pour reveler » vient du
 * design system ; ici, on lui donne la face du role, traduite (`docs/07`).
 */
export function RoleCard({ role }: { readonly role: RoleId }) {
  const { t } = useTranslation();
  const name = t(`roles.${roleKey(role)}.name`);

  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-display text-xl text-text">{t('game.your_role')}</h2>
      <HoldToReveal
        hiddenLabel={t('game.role_hidden')}
        holdHint={t('game.hold_to_reveal')}
        timedRevealLabel={t('game.reveal_timed')}
        face={
          <span className="flex flex-col items-center gap-2">
            {hasCardArt(role) ? (
              <RoleCardArt
                role={role}
                team={CARD_TEAMS[role]}
                name={name}
                teamLabel={t(`teams.${CARD_TEAMS[role]}`)}
              />
            ) : (
              <span className="font-display text-2xl">{name}</span>
            )}
            <span className="text-sm text-text-muted">
              {t(`roles.${roleKey(role)}.description`)}
            </span>
          </span>
        }
      />
    </div>
  );
}
