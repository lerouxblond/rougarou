import type { RoleId } from '@rougarou/protocol';
import { RoleCardArt } from '@rougarou/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CARD_TEAMS, hasCardArt, roleKey } from './roles.ts';

/**
 * La carte du joueur, face cachee par defaut. Elle se retourne tant qu'on la
 * maintient (doigt, souris, ou Espace et Entree au clavier) et se recache des
 * qu'on relache (US-30). Visible, elle montre la carte de repli du role (`docs/07`).
 */
export function RoleCard({ role }: { readonly role: RoleId }) {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(false);
  const show = () => {
    setRevealed(true);
  };
  const hide = () => {
    setRevealed(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-display text-xl text-text">{t('game.your_role')}</h2>
      <button
        type="button"
        aria-pressed={revealed}
        className="tap-target min-h-40 rounded-card border border-border bg-surface-raised p-6 text-text select-none focus-visible:outline-2 focus-visible:outline-focus"
        onPointerDown={show}
        onPointerUp={hide}
        onPointerLeave={hide}
        onPointerCancel={hide}
        onBlur={hide}
        onKeyDown={(event) => {
          if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            show();
          }
        }}
        onKeyUp={hide}
      >
        {revealed ? (
          <span className="flex flex-col items-center gap-2">
            {hasCardArt(role) ? (
              <RoleCardArt
                role={role}
                team={CARD_TEAMS[role]}
                name={t(`roles.${roleKey(role)}.name`)}
                teamLabel={t(`teams.${CARD_TEAMS[role]}`)}
              />
            ) : (
              <span className="font-display text-2xl">{t(`roles.${roleKey(role)}.name`)}</span>
            )}
            <span className="text-sm text-text-muted">
              {t(`roles.${roleKey(role)}.description`)}
            </span>
          </span>
        ) : (
          <span className="flex flex-col gap-1">
            <span>{t('game.role_hidden')}</span>
            <span className="text-sm text-text-muted">{t('game.hold_to_reveal')}</span>
          </span>
        )}
      </button>
    </div>
  );
}
