import type { NarratorView } from '@rougarou/protocol';

/** Une cle i18n et ses parametres. */
export interface Line {
  readonly key: string;
  readonly params?: Readonly<Record<string, string | number>>;
}

interface StepTexts {
  readonly title: string;
  readonly wake: string;
  readonly sleep: string;
}

/** Les textes de chaque etape de nuit (`docs/02` §Ordre de nuit). */
const STEPS: Readonly<Record<string, StepTexts>> = {
  cupid: {
    title: 'night.cupid.title',
    wake: 'roles.cupid.narrator.wake',
    sleep: 'roles.cupid.narrator.sleep',
  },
  lovers: {
    title: 'night.lovers.title',
    wake: 'roles.cupid.narrator.lovers_wake',
    sleep: 'roles.cupid.narrator.lovers_sleep',
  },
  seer: {
    title: 'night.seer.title',
    wake: 'roles.seer.narrator.wake',
    sleep: 'roles.seer.narrator.sleep',
  },
  wolves: {
    title: 'night.wolves.title',
    wake: 'roles.werewolf.narrator.wake',
    sleep: 'roles.werewolf.narrator.sleep',
  },
  witch: {
    title: 'night.witch.title',
    wake: 'roles.witch.narrator.wake',
    sleep: 'roles.witch.narrator.sleep',
  },
};

/** Une etape sans texte connu (un role a venir) : son identifiant tient lieu de titre. */
export function stepTexts(step: string): StepTexts {
  return STEPS[step] ?? { title: step, wake: 'script.step_unknown', sleep: 'script.step_unknown' };
}

export interface Script {
  readonly current: Line;
  readonly previous?: Line;
  readonly next?: Line;
}

const PHASE_SCRIPTS: Readonly<Record<string, string>> = {
  LOBBY: 'script.lobby',
  CONFIG: 'script.config',
  DEAL: 'script.deal',
  PRESENTATIONS: 'script.presentations',
  MAYOR_ELECTION: 'script.election',
  DAY_DEBATE: 'script.debate',
  DAY_VOTE: 'script.vote',
  EXECUTION: 'script.execution',
  ENDED: 'script.ended',
};

/**
 * Le texte que le meneur lit maintenant (US-41), avec celui d'avant et celui
 * d'apres. La nuit, il suit l'etape en cours : son reveil, puis son coucher
 * une fois resolue.
 */
export function scriptOf(view: NarratorView): Script {
  const { night } = view;

  if (view.phase === 'NIGHT' && night !== null) {
    const step = night.steps[night.current];

    if (step === undefined) {
      return { current: { key: 'script.night_over' } };
    }

    const texts = stepTexts(step);
    const before = night.steps[night.current - 1];
    const after = night.steps[night.current + 1];

    return {
      current: { key: night.stepResolved ? texts.sleep : texts.wake },
      previous: { key: before === undefined ? 'script.nightfall' : stepTexts(before).sleep },
      next: { key: after === undefined ? 'script.dawn' : stepTexts(after).wake },
    };
  }

  if (view.phase === 'DAWN') {
    return {
      current: { key: view.dawn?.announced === true ? 'script.dawn_effects' : 'script.dawn' },
    };
  }

  return { current: { key: PHASE_SCRIPTS[view.phase] ?? 'script.lobby' } };
}

/** Le libelle du bouton principal (`docs/12` §1), selon le moment. */
export function primaryLabel(view: NarratorView): string {
  switch (view.phase) {
    case 'LOBBY':
      return 'narrator.primary.configure';
    case 'DEAL':
      return view.ceremony?.turn == null
        ? 'narrator.primary.start_night'
        : 'narrator.primary.next_player';
    case 'NIGHT':
      return 'narrator.primary.next_step';
    case 'DAWN':
      return view.dawn?.announced === true
        ? 'narrator.primary.to_day'
        : 'narrator.primary.daybreak';
    case 'MAYOR_ELECTION':
      return view.election?.stage === 'candidacy'
        ? 'narrator.primary.open_vote'
        : 'narrator.primary.close_vote';
    case 'DAY_DEBATE':
      return 'narrator.primary.open_vote';
    case 'DAY_VOTE':
      return 'narrator.primary.close_vote';
    case 'EXECUTION':
      return 'narrator.primary.start_night';
    default:
      return 'actions.advance_phase';
  }
}

/** Ce qui bloque le bouton principal (`docs/12` §1, « En attente : … »). */
export function blockerOf(view: NarratorView): Line {
  const [effect] = view.pending;

  if (effect !== undefined) {
    const name = view.players.find((player) => player.id === effect.from)?.name ?? effect.from;

    return {
      key: effect.kind === 'hunterShot' ? 'pending.hunter_shot' : 'pending.mayor_succession',
      params: { name },
    };
  }

  switch (view.phase) {
    case 'DEAL':
      return {
        key: 'narrator.blocked.deal',
        params: { count: view.players.filter((player) => !player.roleSeen).length },
      };
    case 'NIGHT': {
      const step = view.night?.steps[view.night.current];

      return { key: 'narrator.blocked.step', params: { step: step ?? '' } };
    }
    case 'DAY_VOTE':
      return { key: 'narrator.blocked.tie' };
    default:
      return { key: 'narrator.blocked.generic' };
  }
}
