import type { ActionDescriptor, CommandInput } from '@rougarou/protocol';
import { Button } from '@rougarou/ui';
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
  return !['JoinGame', 'ReorderSeats', 'SetOptions', 'SetComposition'].includes(action.type);
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
    case 'CastVote':
    case 'BreakTie':
    case 'DesignateSuccessor':
    case 'HunterShoot':
    case 'ResolveWolfTie':
    case 'KickPlayer':
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

type TargetAction = Extract<
  ActionDescriptor,
  {
    type:
      | 'SubmitNightAction'
      | 'CastVote'
      | 'BreakTie'
      | 'DesignateSuccessor'
      | 'HunterShoot'
      | 'ResolveWolfTie'
      | 'KickPlayer';
  }
>;

function TargetControl({
  action,
  names,
}: {
  readonly action: TargetAction;
  readonly names: ReadonlyMap<string, string>;
}) {
  const { t } = useTranslation();
  const id = useId();
  const { send, busy, error } = useSendCommand();
  const choices = [
    ...action.targets.map((target) => ({ value: target, label: names.get(target) ?? target })),
    ...(action.type === 'CastVote' && action.spare
      ? [{ value: SPARE, label: t('actions.spare') }]
      : []),
    ...(action.type === 'CastVote' && action.abstain
      ? [{ value: ABSTAIN, label: t('actions.abstain') }]
      : []),
  ];
  const [choice, setChoice] = useState(choices[0]?.value ?? '');

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void send(toCommand(action, choice));
      }}
    >
      <label htmlFor={id} className="text-sm text-text">
        {t(LABELS[action.type])}
      </label>
      <select
        id={id}
        value={choice}
        onChange={(event) => {
          setChoice(event.target.value);
        }}
        className="min-h-11 rounded-card border border-border bg-surface px-3 text-text"
      >
        {choices.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Button type="submit" disabled={busy || choice === ''}>
        {t('common.confirm')}
      </Button>
      <FormError message={error === null ? null : t(error)} />
    </form>
  );
}

function toCommand(action: TargetAction, choice: string): CommandInput {
  switch (action.type) {
    case 'SubmitNightAction':
      return { type: 'SubmitNightAction', action: { kind: 'wolfVote', target: choice } };
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
      return { type: action.type, playerId: choice };
  }
}
