import { resolveFakeWake, type Actor, type NightAction, type PlayerId } from '@rougarou/protocol';

import { isError, requireAlivePlayer } from '../auth.ts';
import { getMode } from '../modes/index.ts';
import { getRole, registeredRoles } from '../roles/index.ts';
import { resolveWolfTie } from '../roles/werewolf.ts';
import type { EngineError } from '../result.ts';
import { seatedPlayers, type Death, type GameState, type NightStepId } from '../state.ts';
import { clearTimer, engineError, startTimer, type Push, type Tx } from '../tx.ts';
import { wakesOnNight, type NightStepSpec } from './types.ts';

/**
 * Le plan de la nuit `nightNumber` (`R-20`) : les etapes des roles distribues
 * et celles du mode, triees par ordre. Un role dont tous les porteurs sont
 * morts est saute, sauf avec `fakeWakeForDeadRoles`, ou le meneur l'appelle
 * quand meme pour ne pas trahir sa mort.
 */
export function nightPlan(state: GameState, nightNumber: number): NightStepSpec[] {
  const fakeWake = resolveFakeWake(state.options);
  const steps = new Map<NightStepId, NightStepSpec>();

  for (const player of seatedPlayers(state)) {
    const step = player.role === null ? undefined : getRole(player.role).nightStep;

    if (step !== undefined && wakesOnNight(step.wakes, nightNumber)) {
      const awake = step.actors(state).length > 0;

      if (awake || fakeWake) {
        steps.set(step.id, step);
      }
    }
  }

  for (const step of getMode(state.options.gameMode).nightSteps) {
    if (wakesOnNight(step.wakes, nightNumber)) {
      steps.set(step.id, step);
    }
  }

  return [...steps.values()].sort((left, right) => left.order - right.order);
}

/** La specification d'une etape, declaree par un role ou par le mode. */
function findStep(state: GameState, id: NightStepId): NightStepSpec {
  const declared = [
    ...registeredRoles().flatMap((role) => (role.nightStep === undefined ? [] : [role.nightStep])),
    ...getMode(state.options.gameMode).nightSteps,
  ];
  const spec = declared.find((step) => step.id === id);

  if (spec === undefined) {
    throw new Error(`Etape de nuit inconnue : ${id}`);
  }

  return spec;
}

/**
 * L'etape en cours. Pendant la nuit, il y en a toujours une : au-dela de la
 * derniere, la nuit se termine aussitot.
 */
export function currentStep(state: GameState): NightStepSpec {
  const id = state.night?.steps[state.night.current];

  if (id === undefined) {
    throw new Error('Aucune etape de nuit en cours.');
  }

  return findStep(state, id);
}

/** La nuit tombe : on calcule le plan et on lance la premiere etape. */
export function startNight(tx: Tx): void {
  const number = tx.state.nightNumber + 1;
  const steps = nightPlan(tx.state, number).map((step) => step.id);

  clearTimer(tx);
  tx.emit({ type: 'NightStarted', number, steps });
  tx.emit({ type: 'PhaseChanged', phase: 'NIGHT' });
  enterStep(tx, 0);
}

/**
 * Entre dans l'etape `index`. Au-dela de la derniere, la nuit se termine.
 * Une etape sans acteur vivant (reveil simule, `R-20`) est resolue d'emblee.
 */
function enterStep(tx: Tx, index: number): void {
  const night = tx.state.night;

  if (night === null) {
    throw new Error('Etape de nuit hors de la nuit.');
  }

  if (index >= night.steps.length) {
    endNight(tx);
    return;
  }

  tx.emit({ type: 'NightStepStarted', index });

  const step = currentStep(tx.state);

  if (step.actors(tx.state).length === 0) {
    step.resolveByDefault(tx);
    afterResolution(tx);
    return;
  }

  startTimer(tx, step.timer);
}

/**
 * Une etape vient d'etre resolue. En pilotage `assisted`, la suivante
 * s'enchaine seule ; en `manual`, le meneur la lance (`docs/12` §1).
 */
function afterResolution(tx: Tx): void {
  clearTimer(tx);

  if (tx.state.options.pilotMode === 'assisted') {
    goToNextStep(tx);
  }
}

function goToNextStep(tx: Tx): void {
  const night = tx.state.night;

  if (night !== null) {
    enterStep(tx, night.current + 1);
  }
}

/**
 * Fin de la nuit : les intentions sont resolues ensemble (`R-21`), dans
 * l'ordre de `R-40`. Les morts ne sont visibles que du meneur jusqu'a
 * « Lever le jour » (`R-12`).
 */
function endNight(tx: Tx): void {
  const deaths: Death[] = [];
  const victim = tx.state.night?.wolfVictim ?? null;

  if (victim !== null && tx.state.players[victim]?.alive === true) {
    deaths.push({ playerId: victim, cause: 'wolves' });
  }

  clearTimer(tx);
  tx.emit({ type: 'NightEnded', deaths });
  tx.emit({ type: 'PhaseChanged', phase: 'DAWN' });
}

/** Un joueur agit pendant l'etape en cours. */
export function submitNightAction(tx: Tx, actor: Actor, action: NightAction): EngineError | null {
  const player = requireAlivePlayer(tx.state, actor);

  if (isError(player)) {
    return player;
  }

  if (tx.state.phase !== 'NIGHT') {
    return engineError('WRONG_PHASE');
  }

  const error = currentStep(tx.state).submit(tx, player.id, action);

  if (error === null && tx.state.night?.stepResolved === true) {
    afterResolution(tx);
  }

  return error;
}

/** Le meneur departage une egalite du vote des loups (`R-34`). */
export function narratorResolveWolfTie(tx: Tx, target: PlayerId): EngineError | null {
  if (tx.state.phase !== 'NIGHT') {
    return engineError('WRONG_PHASE');
  }

  const error = resolveWolfTie(tx, target);

  if (error === null) {
    afterResolution(tx);
  }

  return error;
}

/**
 * Le meneur avance dans la nuit (etape suivante, ou fin de la nuit), ou le
 * minuteur de l'etape expire. Une etape non resolue prend son action par
 * defaut (`R-10`, `R-13`, `R-14`). A l'expiration, la suite depend du
 * pilotage : en `manual`, c'est toujours le meneur qui passe a l'etape suivante.
 */
export function advanceNight(tx: Tx, push: Push): EngineError | null {
  const step = currentStep(tx.state);

  if (tx.state.night?.stepResolved !== true) {
    if (push === 'advance') {
      return engineError('PENDING_ACTIONS');
    }

    if (push === 'force') {
      tx.emit({ type: 'PhaseForced', phase: 'NIGHT' });
    }

    step.resolveByDefault(tx);

    if (push === 'timeout') {
      afterResolution(tx);
      return null;
    }
  }

  clearTimer(tx);
  goToNextStep(tx);
  return null;
}
