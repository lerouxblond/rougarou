import type { RoleId } from '@rougarou/protocol';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * La carte du joueur, face cachee par defaut. Elle se retourne tant qu'on la
 * maintient (doigt, souris, ou Espace et Entree au clavier) et se recache des
 * qu'on relache (US-30). Version brute de M2 : le visuel arrive en M4.
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
          <span className="flex flex-col gap-2">
            <span className="font-display text-2xl">{t(`roles.${role}.name`)}</span>
            <span className="text-sm text-text-muted">{t(`roles.${role}.description`)}</span>
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
