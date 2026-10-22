import { describe, expect, it } from 'vitest';

import { EIGHT_ROLES, FIVE_ROLES, NARRATOR, player, setup, SYSTEM, T0, types } from './dsl.ts';

describe('Plan de nuit (R-20)', () => {
  it('appelle l etape des loups, calculee a partir des roles distribues', () => {
    const game = setup({ roles: FIVE_ROLES }).advance();

    expect(game.state.night).toMatchObject({ number: 1, steps: ['wolves'], current: 0 });
  });

  it('lance le minuteur du vote des loups : 90 s par defaut (D-02)', () => {
    const game = setup({ roles: FIVE_ROLES }).advance();

    expect(game.state.deadline).toBe(T0 + 90_000);
  });

  it('sans minuteur, il n y a pas d echeance', () => {
    const game = setup({ roles: FIVE_ROLES, options: { timers: { wolfVote: null } } }).advance();

    expect(game.state.deadline).toBeNull();
  });
});

describe('Vote des loups — unanimite (R-34)', () => {
  it('la victime est retenue des que tous les loups s accordent, puis l aube vient seule en pilotage assiste', () => {
    const game = setup({ roles: EIGHT_ROLES }).advance().wolfVote('Alice', 'Chloe');

    expect(game.state.phase).toBe('NIGHT');
    game.wolfVote('Bob', 'Chloe');

    expect(game.state.phase).toBe('DAWN');
    expect(game.state.dawn).toEqual({
      deaths: [{ playerId: 'Chloe', cause: 'wolves' }],
      announced: false,
    });
    expect(game.state.deadline).toBeNull();
  });

  it('un desaccord laisse l etape ouverte ; un loup peut changer d avis', () => {
    const game = setup({ roles: EIGHT_ROLES })
      .advance()
      .wolfVote('Alice', 'Chloe')
      .wolfVote('Bob', 'David');

    expect(game.state.phase).toBe('NIGHT');
    game.wolfVote('Bob', 'Chloe');
    expect(game.state.dawn?.deaths).toEqual([{ playerId: 'Chloe', cause: 'wolves' }]);
  });

  it('un loup ne cible ni un autre loup, ni un mort, ni un inconnu', () => {
    const game = setup({ roles: EIGHT_ROLES }).advance();
    const vote = (target: string) =>
      ({ type: 'SubmitNightAction', action: { kind: 'wolfVote', target } }) as const;

    game
      .rejects(player('Alice'), vote('Bob'), 'INVALID_TARGET')
      .rejects(player('Alice'), vote('Zoe'), 'UNKNOWN_PLAYER');
  });

  it('un non-loup ne vote pas avec les loups', () => {
    setup({ roles: EIGHT_ROLES })
      .advance()
      .rejects(
        player('Chloe'),
        { type: 'SubmitNightAction', action: { kind: 'wolfVote', target: 'David' } },
        'NOT_YOUR_TURN',
      );
  });

  it('on n agit pas la nuit hors de la nuit', () => {
    setup({ roles: FIVE_ROLES }).rejects(
      player('Alice'),
      { type: 'SubmitNightAction', action: { kind: 'wolfVote', target: 'Bob' } },
      'WRONG_PHASE',
    );
  });
});

describe('Vote des loups — majorite (R-34)', () => {
  const roles = { ...EIGHT_ROLES, Chloe: 'werewolf' } as const;

  it('la cible en tete l emporte une fois que tous ont vote', () => {
    const game = setup({ roles, options: { wolfVoteMode: 'majority' } })
      .advance()
      .wolfVote('Alice', 'David')
      .wolfVote('Bob', 'David');

    expect(game.state.phase).toBe('NIGHT');
    game.wolfVote('Chloe', 'Eve');
    expect(game.state.dawn?.deaths).toEqual([{ playerId: 'David', cause: 'wolves' }]);
  });

  it('une egalite attend le meneur, qui choisit parmi les ex aequo', () => {
    const game = setup({ roles: EIGHT_ROLES, options: { wolfVoteMode: 'majority' } })
      .advance()
      .wolfVote('Alice', 'David')
      .wolfVote('Bob', 'Eve');

    expect(game.state.night?.wolfTie).toEqual(['David', 'Eve']);
    game
      .rejects(player('Alice'), { type: 'ResolveWolfTie', target: 'David' }, 'FORBIDDEN')
      .rejects(NARRATOR, { type: 'ResolveWolfTie', target: 'Fanny' }, 'INVALID_TARGET')
      .narrator({ type: 'ResolveWolfTie', target: 'Eve' });

    expect(game.state.dawn?.deaths).toEqual([{ playerId: 'Eve', cause: 'wolves' }]);
  });

  it('un loup qui change d avis leve l egalite', () => {
    const game = setup({ roles: EIGHT_ROLES, options: { wolfVoteMode: 'majority' } })
      .advance()
      .wolfVote('Alice', 'David')
      .wolfVote('Bob', 'Eve')
      .wolfVote('Bob', 'David');

    expect(game.state.dawn?.deaths).toEqual([{ playerId: 'David', cause: 'wolves' }]);
  });

  it('le meneur ne departage rien sans egalite, ni hors de la nuit', () => {
    setup({ roles: EIGHT_ROLES })
      .rejects(NARRATOR, { type: 'ResolveWolfTie', target: 'David' }, 'WRONG_PHASE')
      .advance()
      .rejects(NARRATOR, { type: 'ResolveWolfTie', target: 'David' }, 'WRONG_PHASE');
  });
});

describe('Minuteur et forcage de nuit (R-10, R-13, R-14)', () => {
  it('a l expiration, pas de victime', () => {
    const game = setup({ roles: EIGHT_ROLES }).advance().wolfVote('Alice', 'Chloe').expire();

    expect(game.state.phase).toBe('DAWN');
    expect(game.state.dawn?.deaths).toEqual([]);
    expect(types(game.last)).toContain('TimerExpired');
  });

  it('refuse Timeout avant l echeance, et sans minuteur', () => {
    const game = setup({ roles: EIGHT_ROLES }).advance();

    game.now = T0 + 89_999;
    game.rejects(SYSTEM, { type: 'Timeout' }, 'TOO_EARLY');

    setup({ roles: EIGHT_ROLES, options: { timers: { wolfVote: null } } })
      .advance()
      .rejects(SYSTEM, { type: 'Timeout' }, 'INVALID_COMMAND');
  });

  it('seul le systeme envoie Timeout', () => {
    setup({ roles: EIGHT_ROLES }).advance().rejects(NARRATOR, { type: 'Timeout' }, 'FORBIDDEN');
  });

  it('le meneur ne passe pas une etape non resolue sans forcer ; en forcant, pas de victime', () => {
    const game = setup({ roles: EIGHT_ROLES })
      .advance()
      .rejects(NARRATOR, { type: 'AdvancePhase' }, 'PENDING_ACTIONS')
      .advance(true);

    expect(game.state.phase).toBe('DAWN');
    expect(game.state.dawn?.deaths).toEqual([]);
    expect(types(game.last)).toContain('PhaseForced');
  });
});

describe('Pilotage manuel (docs/12 §1)', () => {
  it('une etape resolue attend le meneur pour passer a la suite', () => {
    const game = setup({ roles: FIVE_ROLES, options: { pilotMode: 'manual' } })
      .advance()
      .wolfVote('Alice', 'Bob');

    expect(game.state.phase).toBe('NIGHT');
    expect(game.state.night?.stepResolved).toBe(true);
    game.rejects(
      player('Alice'),
      { type: 'SubmitNightAction', action: { kind: 'wolfVote', target: 'Chloe' } },
      'WRONG_PHASE',
    );

    game.advance();
    expect(game.state.dawn?.deaths).toEqual([{ playerId: 'Bob', cause: 'wolves' }]);
  });

  it('a l expiration, l etape prend son defaut mais le meneur garde la main', () => {
    const game = setup({ roles: FIVE_ROLES, options: { pilotMode: 'manual' } })
      .advance()
      .expire();

    expect(game.state.phase).toBe('NIGHT');
    expect(game.state.night).toMatchObject({ stepResolved: true, wolfVictim: null });
    game.rejects(SYSTEM, { type: 'Timeout' }, 'INVALID_COMMAND').advance();
    expect(game.state.phase).toBe('DAWN');
  });
});
