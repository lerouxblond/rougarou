import type { ActionDescriptor, CommandInput } from '@rougarou/protocol';
import { Button, TargetPicker } from '@rougarou/ui';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormError } from '../components/Field.tsx';
import { useSendCommand } from './hooks.ts';

type ActionType = ActionDescriptor['type'];

/** Libelle de chaque action ; `Record` exhaustif : une action ajoutee au protocole doit avoir le sien. */
const LABELS: Record<ActionType, string> = {
  JoinGame: 'actions.join_game',
  LeaveGame: 'actions.leave_game',
  ConfirmRoleSeen: 'actions.confirm_role_seen',
  SubmitNightAction: 'actions.submit_night_action',
  DeclareCandidacy: 'actions.declare_candidacy',
  WithdrawCandidacy: 'actions.withdraw_candidacy',
  CastVote: 'actions.cast_vote',
  BreakTie: 'actions.break_tie',
  DesignateSuccessor: 'actions.designate_successor',
  HunterShoot: 'actions.hunter_shoot',
  KickPlayer: 'actions.kick_player',
  ReorderSeats: 'actions.reorder_seats',
  SetOptions: 'actions.set_options',
  SetComposition: 'actions.set_composition',
  Deal: 'actions.deal',
  AdvancePhase: 'actions.advance_phase',
  ResolveWolfTie: 'actions.resolve_wolf_tie',
  CorrectKill: 'actions.correct_kill',
  CorrectRevive: 'actions.correct_revive',
  CorrectRole: 'actions.correct_role',
  PauseTimer: 'actions.pause_timer',
  ResumeTimer: 'actions.resume_timer',
  ExtendTimer: 'actions.extend_timer',
};

/** Choix de bulletin qui ne sont pas des joueurs. */
const SPARE = '@spare';
const ABSTAIN = '@abstain';

interface ActionPanelProps {
  readonly actions: readonly ActionDescriptor[];
  /** Nom de chaque joueur, pour les listes de cibles. */
  readonly names: ReadonlyMap<string, string>;
  /** Actions qu'un ecran dedie presente deja. */
  readonly skip?: readonly ActionType[];
}

/**
 * Un bouton (et sa liste de cibles) par action recue du serveur. Le client ne
 * decide de rien : il ne montre que ce que `availableActions` propose
 * (`docs/04` §Projection, regle 1).
 */
export function ActionPanel({ actions, names, skip = [] }: ActionPanelProps) {
  const shown = actions.filter((action) => !skip.includes(action.type) && hasControl(action));

  return shown.length === 0 ? null : (
    <ul className="flex flex-col gap-3">
      {shown.map((action) => (
        <li key={action.type}>
          <ActionControl action={action} names={names} />
        </li>
      ))}
    </ul>
  );
}

/** Les actions qui se reglent ailleurs (pseudo, ordre, options, composition) n'ont pas de bouton ici. */
function hasControl(action: ActionDescriptor): boolean {
  return !['JoinGame', 'ReorderSeats', 'SetOptions', 'SetComposition', 'CorrectRole'].includes(
    action.type,
  );
}

function ActionControl({
  action,
  names,
}: {
  readonly action: ActionDescriptor;
  readonly names: ReadonlyMap<string, string>;
}) {
  const { t } = useTranslation();
  const { send, busy, error } = useSendCommand();

  switch (action.type) {
    case 'SubmitNightAction':
      switch (action.kind) {
        case 'witchPotions':
          return <WitchControl action={action} names={names} />;
        case 'cupidLink':
          return <CoupleControl action={action} names={names} />;
        case 'loversConfirm':
          return (
            <SimpleButton
              label={t(NIGHT_LABELS.loversConfirm)}
              busy={busy}
              error={error}
              onClick={() => send({ type: 'SubmitNightAction', action: { kind: 'loversConfirm' } })}
            />
          );
        case 'spy':
          return (
            <SimpleButton
              label={t(NIGHT_LABELS.spy)}
              busy={busy}
              error={error}
              onClick={() => send({ type: 'SubmitNightAction', action: { kind: 'spy' } })}
            />
          );
        default:
          return <TargetControl action={action} names={names} />;
      }
    case 'CastVote':
    case 'BreakTie':
    case 'DesignateSuccessor':
    case 'HunterShoot':
    case 'ResolveWolfTie':
    case 'KickPlayer':
    case 'CorrectKill':
    case 'CorrectRevive':
      return <TargetControl action={action} names={names} />;
    case 'AdvancePhase':
      return (
        <SimpleButton
          label={t(action.blocked ? 'actions.advance_phase_force' : LABELS.AdvancePhase)}
          busy={busy}
          error={error}
          onClick={() => send({ type: 'AdvancePhase', force: action.blocked })}
        />
      );
    case 'Deal':
      return (
        <div className="flex flex-col gap-2">
          <SimpleButton
            label={t(LABELS.Deal)}
            busy={busy || action.issues.length > 0}
            error={error}
            onClick={() => send({ type: 'Deal' })}
          />
          <ul className="text-sm text-danger">
            {action.issues.map((issue) => (
              <li key={issue}>{t(issue)}</li>
            ))}
          </ul>
        </div>
      );
    case 'LeaveGame':
    case 'ConfirmRoleSeen':
    case 'DeclareCandidacy':
    case 'WithdrawCandidacy':
    case 'PauseTimer':
    case 'ResumeTimer':
    case 'ExtendTimer': {
      const { type } = action;

      return (
        <SimpleButton
          label={t(LABELS[type])}
          busy={busy}
          error={error}
          onClick={() => send({ type })}
        />
      );
    }
    case 'JoinGame':
    case 'ReorderSeats':
    case 'SetOptions':
    case 'SetComposition':
      // Reglees par l'ecran du salon ou de la configuration.
      return null;
    case 'CorrectRole':
      // Choix d'un joueur et d'un role : ecran du meneur (M4, T9).
      return null;
  }
}

function SimpleButton({
  label,
  busy,
  error,
  onClick,
}: {
  readonly label: string;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onClick: () => unknown;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-1">
      <Button disabled={busy} onClick={onClick}>
        {label}
      </Button>
      <FormError message={error === null ? null : t(error)} />
    </div>
  );
}

/** Les actions qui se reglent en choisissant un joueur dans une liste. */
type TargetAction = Exclude<
  Extract<ActionDescriptor, { targets: readonly string[] }>,
  { kind: 'cupidLink' } | { type: 'CorrectRole' }
>;

/** Libelle de chaque action de nuit ; `Record` exhaustif, comme `LABELS`. */
const NIGHT_LABELS: Record<
  Extract<ActionDescriptor, { type: 'SubmitNightAction' }>['kind'],
  string
> = {
  wolfVote: 'actions.submit_night_action',
  seerProbe: 'actions.seer_probe',
  witchPotions: 'actions.witch_potions',
  cupidLink: 'actions.cupid_link',
  loversConfirm: 'actions.lovers_confirm',
  spy: 'actions.spy',
};

function labelOf(action: TargetAction): string {
  return action.type === 'SubmitNightAction' ? NIGHT_LABELS[action.kind] : LABELS[action.type];
}

function TargetControl({
  action,
  names,
}: {
  readonly action: TargetAction;
  readonly names: ReadonlyMap<string, string>;
}) {
  const { t } = useTranslation();
  const { send, busy, error } = useSendCommand();
  const options = [
    ...action.targets.map((target) => ({ id: target, label: names.get(target) ?? target })),
    ...(action.type === 'CastVote' && action.spare
      ? [{ id: SPARE, label: t('actions.spare') }]
      : []),
    ...(action.type === 'CastVote' && action.abstain
      ? [{ id: ABSTAIN, label: t('actions.abstain') }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-1">
      <TargetPicker
        legend={t(labelOf(action))}
        options={options}
        confirmLabel={t('common.confirm')}
        busy={busy}
        onConfirm={([choice]) => {
          if (choice !== undefined) {
            void send(toCommand(action, choice));
          }
        }}
      />
      <FormError message={error === null ? null : t(error)} />
    </div>
  );
}

function toCommand(action: TargetAction, choice: string): CommandInput {
  switch (action.type) {
    case 'SubmitNightAction':
      return { type: 'SubmitNightAction', action: { kind: action.kind, target: choice } };
    case 'CastVote':
      return {
        type: 'CastVote',
        ballot:
          choice === SPARE
            ? { kind: 'spare' }
            : choice === ABSTAIN
              ? { kind: 'abstain' }
              : { kind: 'player', playerId: choice },
      };
    case 'ResolveWolfTie':
      return { type: 'ResolveWolfTie', target: choice };
    case 'BreakTie':
    case 'DesignateSuccessor':
    case 'HunterShoot':
    case 'KickPlayer':
    case 'CorrectKill':
    case 'CorrectRevive':
      return { type: action.type, playerId: choice };
  }
}

type WitchAction = Extract<ActionDescriptor, { kind: 'witchPotions' }>;

/** Les deux potions en une seule reponse (`docs/02`) : « ne rien faire » est un choix comme un autre. */
function WitchControl({
  action,
  names,
}: {
  readonly action: WitchAction;
  readonly names: ReadonlyMap<string, string>;
}) {
  const { t } = useTranslation();
  const saveId = useId();
  const killId = useId();
  const { send, busy, error } = useSendCommand();
  const [save, setSave] = useState(false);
  const [kill, setKill] = useState('');

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void send({
          type: 'SubmitNightAction',
          action: { kind: 'witchPotions', save, kill: kill === '' ? null : kill },
        });
      }}
    >
      <p className="text-sm text-text">{t(NIGHT_LABELS.witchPotions)}</p>
      {action.canSave ? (
        <label htmlFor={saveId} className="flex min-h-11 items-center gap-2 text-text">
          <input
            id={saveId}
            type="checkbox"
            checked={save}
            onChange={(event) => {
              setSave(event.target.checked);
            }}
          />
          {t('actions.witch_save')}
        </label>
      ) : null}
      {action.killTargets.length > 0 ? (
        <>
          <label htmlFor={killId} className="text-sm text-text">
            {t('actions.witch_kill')}
          </label>
          <select
            id={killId}
            value={kill}
            onChange={(event) => {
              setKill(event.target.value);
            }}
            className="min-h-11 rounded-card border border-border bg-surface px-3 text-text"
          >
            <option value="">{t('actions.witch_kill_none')}</option>
            {action.killTargets.map((target) => (
              <option key={target} value={target}>
                {names.get(target) ?? target}
              </option>
            ))}
          </select>
        </>
      ) : null}
      <Button type="submit" disabled={busy}>
        {t('common.confirm')}
      </Button>
      <FormError message={error === null ? null : t(error)} />
    </form>
  );
}

type CoupleAction = Extract<ActionDescriptor, { kind: 'cupidLink' }>;

/** Cupidon choisit deux amoureux distincts (`docs/02`), lui compris. */
function CoupleControl({
  action,
  names,
}: {
  readonly action: CoupleAction;
  readonly names: ReadonlyMap<string, string>;
}) {
  const { t } = useTranslation();
  const { send, busy, error } = useSendCommand();

  return (
    <div className="flex flex-col gap-1">
      <TargetPicker
        legend={t(NIGHT_LABELS.cupidLink)}
        options={action.targets.map((target) => ({
          id: target,
          label: names.get(target) ?? target,
        }))}
        count={2}
        confirmLabel={t('common.confirm')}
        busy={busy}
        onConfirm={([first, second]) => {
          if (first !== undefined && second !== undefined) {
            void send({
              type: 'SubmitNightAction',
              action: { kind: 'cupidLink', lovers: [first, second] },
            });
          }
        }}
      />
      <FormError message={error === null ? null : t(error)} />
    </div>
  );
}
