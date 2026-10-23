import type { ActionDescriptor, CommandInput, NarratorView, RoleId } from '@rougarou/protocol';
import { Button, Dialog, TargetPicker } from '@rougarou/ui';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormError } from '../components/Field.tsx';
import { useSendCommand } from './hooks.ts';
import { roleKey } from './roles.ts';

type Correction = Extract<
  ActionDescriptor,
  { type: 'CorrectKill' | 'CorrectRevive' | 'CorrectRole' }
>;
type RoleAction = Extract<ActionDescriptor, { type: 'CorrectRole' }>;

/**
 * Le mode correction (US-80, `R-18`) : tuer, ressusciter ou changer le role
 * d'un joueur, dans une fenetre pour ne pas encombrer le tableau. N'apparait
 * que quand le serveur propose ces actions.
 */
export function CorrectionDialog({ view }: { readonly view: NarratorView }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { send, busy, error } = useSendCommand();
  const options = (ids: readonly string[]) =>
    ids.map((id) => ({ id, label: view.players.find((player) => player.id === id)?.name ?? id }));
  const corrections = view.actions.filter(
    (action): action is Correction =>
      action.type === 'CorrectKill' ||
      action.type === 'CorrectRevive' ||
      action.type === 'CorrectRole',
  );

  if (corrections.length === 0) {
    return null;
  }

  const correct = async (cmd: CommandInput) => {
    const reply = await send(cmd);

    if (reply.ok) {
      setOpen(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="md"
        onClick={() => {
          setOpen(true);
        }}
      >
        {t('correction.open')}
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={t('correction.title')}
        description={t('correction.help')}
        closeLabel={t('common.close')}
      >
        <div className="flex max-h-[60dvh] flex-col gap-6 overflow-y-auto">
          {corrections.map((action) =>
            action.type === 'CorrectRole' ? (
              <RoleForm
                key={action.type}
                action={action}
                names={options(action.targets)}
                onSend={correct}
                busy={busy}
              />
            ) : action.targets.length === 0 ? null : (
              <TargetPicker
                key={action.type}
                legend={t(
                  action.type === 'CorrectKill' ? 'actions.correct_kill' : 'actions.correct_revive',
                )}
                options={options(action.targets)}
                confirmLabel={t('common.confirm')}
                busy={busy}
                onConfirm={([playerId]) => {
                  if (playerId !== undefined) {
                    void correct({ type: action.type, playerId });
                  }
                }}
              />
            ),
          )}
          <FormError message={error === null ? null : t(error)} />
        </div>
      </Dialog>
    </>
  );
}

function RoleForm({
  action,
  names,
  onSend,
  busy,
}: {
  readonly action: RoleAction;
  readonly names: readonly { id: string; label: string }[];
  readonly onSend: (cmd: CommandInput) => Promise<void>;
  readonly busy: boolean;
}) {
  const { t } = useTranslation();
  const playerField = useId();
  const roleField = useId();
  const [playerId, setPlayerId] = useState(names[0]?.id ?? '');
  const [role, setRole] = useState<RoleId>(action.roles[0] ?? 'villager');
  const field = 'min-h-11 rounded-md border border-border bg-surface px-3 text-text';

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void onSend({ type: 'CorrectRole', playerId, role });
      }}
    >
      <h3 className="font-display text-xl text-text">{t('actions.correct_role')}</h3>
      <label htmlFor={playerField} className="text-sm text-text">
        {t('correction.player')}
      </label>
      <select
        id={playerField}
        value={playerId}
        className={field}
        onChange={(event) => {
          setPlayerId(event.target.value);
        }}
      >
        {names.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <label htmlFor={roleField} className="text-sm text-text">
        {t('correction.role')}
      </label>
      <select
        id={roleField}
        value={role}
        className={field}
        onChange={(event) => {
          setRole(event.target.value as RoleId);
        }}
      >
        {action.roles.map((id) => (
          <option key={id} value={id}>
            {t(`roles.${roleKey(id)}.name`)}
          </option>
        ))}
      </select>
      <Button type="submit" loading={busy}>
        {t('common.confirm')}
      </Button>
    </form>
  );
}
