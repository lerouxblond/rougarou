import type { NarratorView, Phase, PlayerView } from '@rougarou/protocol';

type View = PlayerView | NarratorView;

/**
 * Un moment de la partie qui merite un son ou une vibration (`docs/12` §5).
 * On les deduit de deux vues successives : le client ne decide de rien, il
 * remarque seulement ce que le serveur a change.
 */
export type Cue =
  | 'cardDealt'
  | 'nightfall'
  | 'yourTurn'
  | 'daybreak'
  | 'death'
  | 'youDied'
  | 'mayor'
  | 'voteOpen'
  | 'voteClose'
  | 'victory';

/** Le theme de l'interface pour une phase (`docs/06` : nuit hors partie et la nuit). */
export function phaseTheme(phase: Phase | null): 'night' | 'day' {
  switch (phase) {
    case null:
    case 'LOBBY':
    case 'CONFIG':
    case 'DEAL':
    case 'NIGHT':
      return 'night';
    case 'DAWN':
    case 'PRESENTATIONS':
    case 'MAYOR_ELECTION':
    case 'DAY_DEBATE':
    case 'DAY_VOTE':
    case 'EXECUTION':
    case 'ENDED':
      return 'day';
  }
}

function deadCount(view: View): number {
  return view.players.filter((player) => !player.alive).length;
}

function mayorOf(view: View): string | null {
  return view.players.find((player) => player.mayor)?.id ?? null;
}

function votingOpen(view: View): boolean {
  return (
    (view.vote !== null && !view.vote.closed) ||
    (view.phase === 'MAYOR_ELECTION' && view.election?.stage === 'vote')
  );
}

function role(view: View): string | null {
  return view.kind === 'player' ? (view.me?.role ?? null) : null;
}

function alive(view: View): boolean {
  return view.kind === 'player' && view.me?.alive === true;
}

/** Ce qui vient de se passer entre `before` et `after`. La premiere vue ne declenche rien. */
export function cuesOf(before: View | null, after: View): Cue[] {
  if (before === null) {
    return [];
  }

  const cues: Cue[] = [];

  if (role(before) === null && role(after) !== null && after.phase === 'DEAL') {
    cues.push('cardDealt');
  }

  if (before.phase !== 'NIGHT' && after.phase === 'NIGHT') {
    cues.push('nightfall');
  }

  if (after.phase === 'NIGHT' && before.actions.length === 0 && after.actions.length > 0) {
    cues.push('yourTurn');
  }

  if (
    phaseTheme(before.phase) === 'night' &&
    phaseTheme(after.phase) === 'day' &&
    after.phase !== 'ENDED'
  ) {
    cues.push('daybreak');
  }

  if (deadCount(after) > deadCount(before)) {
    cues.push('death');
  }

  if (alive(before) && !alive(after) && after.kind === 'player' && after.me !== null) {
    cues.push('youDied');
  }

  const mayor = mayorOf(after);

  if (mayor !== null && mayor !== mayorOf(before)) {
    cues.push('mayor');
  }

  if (!votingOpen(before) && votingOpen(after)) {
    cues.push('voteOpen');
  }

  if (votingOpen(before) && !votingOpen(after)) {
    cues.push('voteClose');
  }

  if (before.phase !== 'ENDED' && after.phase === 'ENDED') {
    cues.push('victory');
  }

  return cues;
}
