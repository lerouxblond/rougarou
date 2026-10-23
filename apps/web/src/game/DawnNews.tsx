import type { PlayerView } from '@rougarou/protocol';
import { useTranslation } from 'react-i18next';

import { roleKey } from './roles.ts';

/** Le texte de chaque effet en attente (`R-42`). */
const PENDING_KEYS: Record<PlayerView['pending'][number]['kind'], string> = {
  hunterShot: 'pending.hunter_shot',
  mayorSuccession: 'pending.mayor_succession',
};

/**
 * L'annonce de l'aube (US-50) et les effets a la mort qui attendent un
 * joueur (`R-42`). Les morts sont publiques, jamais leur cause (`docs/04`) ;
 * le role suit `revealRoleOnDeath`, c'est-a-dire ce que la vue en dit.
 */
export function DawnNews({ view }: { readonly view: PlayerView }) {
  const { t } = useTranslation();
  const player = (id: string) => view.players.find((seen) => seen.id === id);
  const name = (id: string) => player(id)?.name ?? id;

  return (
    <>
      {view.deaths === null ? null : (
        <section aria-live="polite" className="flex flex-col gap-2">
          <h2 className="font-display text-2xl text-text">{t('dawn.title')}</h2>
          {view.deaths.length === 0 ? (
            <p className="text-text">{t('dawn.nobody')}</p>
          ) : (
            <ul className="flex flex-col gap-1 text-text">
              {view.deaths.map((id) => {
                const role = player(id)?.role ?? null;

                return (
                  <li key={id}>
                    {role === null
                      ? t('dawn.death', { name: name(id) })
                      : t('dawn.death_role', {
                          name: name(id),
                          role: t(`roles.${roleKey(role)}.name`),
                        })}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
      {view.pending.length === 0 ? null : (
        <ul aria-live="polite" className="flex flex-col gap-1 text-text-muted">
          {view.pending.map((effect) => (
            <li key={`${effect.kind}-${effect.from}`}>
              {t(PENDING_KEYS[effect.kind], { name: name(effect.from) })}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
