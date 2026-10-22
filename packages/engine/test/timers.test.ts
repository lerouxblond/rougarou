import { commandSchema, type Actor, type CommandInput, type PlayerView } from '@rougarou/protocol';
import { describe, expect, it } from 'vitest';

import {
  applyToRecord,
  availableActions,
  createRecord,
  createRng,
  projectView,
  type GameRecord,
} from '../src/index.ts';
import { EIGHT_ROLES, FIVE_ROLES, NARRATOR, player, setup, SYSTEM, T0, types } from './dsl.ts';

const PAUSE = { type: 'PauseTimer' } as const;
const RESUME = { type: 'ResumeTimer' } as const;
const EXTEND = { type: 'ExtendTimer' } as const;

/** La nuit 1 est lancee : le vote des loups court pour 90 s (D-02). */
function night() {
  return setup({ roles: FIVE_ROLES }).advance();
}

describe('Pause (R-16)', () => {
  it('range la duree restante et retire l echeance', () => {
    const game = night();

    game.now = T0 + 30_000;
    game.narrator(PAUSE);

    expect(game.state.deadline).toBeNull();
    expect(game.state.pausedRemaining).toBe(60_000);
    expect(types(game.last)).toEqual(['TimerPaused']);
  });

  it('en pause, le minuteur ne peut pas expirer', () => {
    const game = night().narrator(PAUSE);

    game.now = T0 + 1_000_000;
    game.rejects(SYSTEM, { type: 'Timeout' }, 'INVALID_COMMAND');
  });

  it('une echeance depassee mais pas encore traitee laisse 0 ms', () => {
    const game = night();

    game.now = T0 + 95_000;
    game.narrator(PAUSE);

    expect(game.state.pausedRemaining).toBe(0);
  });

  it('refuse une seconde pause, et une pause sans minuteur', () => {
    night().narrator(PAUSE).rejects(NARRATOR, PAUSE, 'INVALID_COMMAND');
    setup({ roles: FIVE_ROLES }).rejects(NARRATOR, PAUSE, 'INVALID_COMMAND');
  });

  it('seul le meneur met en pause', () => {
    night()
      .rejects(player('Alice'), PAUSE, 'FORBIDDEN')
      .rejects(SYSTEM, PAUSE, 'FORBIDDEN')
      .rejects(player('Bob'), EXTEND, 'FORBIDDEN')
      .rejects(player('Bob'), RESUME, 'FORBIDDEN');
  });
});

describe('Reprise (R-16)', () => {
  it('l echeance est decalee de la duree de la pause', () => {
    const game = night();

    game.now = T0 + 30_000;
    game.narrator(PAUSE);
    game.now = T0 + 200_000;
    game.narrator(RESUME);

    expect(game.state.deadline).toBe(T0 + 260_000);
    expect(game.state.pausedRemaining).toBeNull();

    game.now = T0 + 259_999;
    game.rejects(SYSTEM, { type: 'Timeout' }, 'TOO_EARLY');
    game.expire();
    expect(game.state.phase).toBe('DAWN');
  });

  it('refuse de reprendre un minuteur qui n est pas en pause', () => {
    night().rejects(NARRATOR, RESUME, 'INVALID_COMMAND');
  });
});

describe('+30 s (R-16)', () => {
  it('repousse l echeance d un minuteur en marche', () => {
    const game = night().narrator(EXTEND).narrator(EXTEND);

    expect(game.state.deadline).toBe(T0 + 150_000);
  });

  it('allonge la duree restante d un minuteur en pause', () => {
    const game = night();

    game.now = T0 + 30_000;
    game.narrator(PAUSE).narrator(EXTEND);

    expect(game.state.pausedRemaining).toBe(90_000);
    expect(game.state.deadline).toBeNull();
  });

  it('refuse sans minuteur', () => {
    setup({ roles: FIVE_ROLES, options: { timers: { wolfVote: null } } })
      .advance()
      .rejects(NARRATOR, EXTEND, 'INVALID_COMMAND');
  });
});

describe('La pause tombe quand l etape change (R-16)', () => {
  it('le minuteur suivant demarre normalement', () => {
    const game = setup({ roles: EIGHT_ROLES }).advance().narrator(PAUSE);

    game.wolfVote('Alice', 'Chloe').wolfVote('Bob', 'Chloe');

    expect(game.state.phase).toBe('DAWN');
    expect(game.state.pausedRemaining).toBeNull();
    expect(game.state.deadline).toBeNull();
  });

  it('un forcage pendant la pause ne laisse aucun minuteur en suspens', () => {
    const game = night().narrator(PAUSE).advance(true);

    expect(game.state.pausedRemaining).toBeNull();
  });
});

describe('Actions du meneur (R-16)', () => {
  it('propose Pause et +30 s quand un minuteur court, Reprendre et +30 s en pause', () => {
    const running = night();
    const of = (game: typeof running) =>
      availableActions(game.state, { kind: 'narrator' })
        .map((action) => action.type)
        .filter((type) => type.endsWith('Timer'))
        .sort();

    expect(of(running)).toEqual(['ExtendTimer', 'PauseTimer']);
    expect(of(running.narrator(PAUSE))).toEqual(['ExtendTimer', 'ResumeTimer']);
    expect(of(setup({ roles: FIVE_ROLES }))).toEqual([]);
  });
});

describe('Projection de la pause (R-16)', () => {
  it('le loup qui agit voit la pause ; un villageois ne voit rien changer', () => {
    const game = night();
    const before = JSON.stringify(projectView(game.state, { kind: 'player', playerId: 'Bob' }));

    game.now = T0 + 10_000;
    game.narrator(PAUSE).narrator(EXTEND);

    const wolf = projectView(game.state, { kind: 'player', playerId: 'Alice' }) as PlayerView;
    const villager = JSON.stringify(projectView(game.state, { kind: 'player', playerId: 'Bob' }));

    expect(wolf.deadline).toBeNull();
    expect(wolf.pausedRemaining).toBe(110_000);
    expect(villager).toBe(before);
  });

  it('le meneur voit la duree restante', () => {
    const game = night().narrator(PAUSE);

    expect(projectView(game.state, { kind: 'narrator' })).toMatchObject({
      deadline: null,
      pausedRemaining: 90_000,
    });
  });
});

describe('Annuler une pause (R-11)', () => {
  const rng = createRng(5);

  function ok(record: GameRecord, actor: Actor, command: CommandInput, now = T0): GameRecord {
    const result = applyToRecord(
      record,
      { actor, cmd: commandSchema.parse(command) },
      { now, rng },
    );

    if (!result.ok) {
      throw new Error(`${command.type} refusee : ${result.error.code}`);
    }

    return result.record;
  }

  it('l annulation retablit l echeance d origine', () => {
    let record = createRecord('game-t');

    for (const name of Object.keys(FIVE_ROLES)) {
      record = ok(record, player(name), { type: 'JoinGame', name });
    }

    record = ok(record, NARRATOR, { type: 'AdvancePhase' });
    record = ok(record, NARRATOR, {
      type: 'SetComposition',
      composition: { werewolf: 1, villager: 4 },
    });
    record = ok(record, NARRATOR, { type: 'Deal' });

    for (const name of Object.keys(FIVE_ROLES)) {
      record = ok(record, player(name), { type: 'ConfirmRoleSeen' });
    }

    record = ok(record, NARRATOR, { type: 'AdvancePhase' });
    const running = record.state;

    record = ok(record, NARRATOR, PAUSE, T0 + 5_000);
    record = ok(record, NARRATOR, { type: 'Undo' });

    expect(record.state).toEqual(running);
  });
});
