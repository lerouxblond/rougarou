import { describe, expect, it } from 'vitest';

import { checkVictory } from '../src/victory.ts';
import { EIGHT_ROLES, FIVE_ROLES, firstNight, NARRATOR, setup, types } from './dsl.ts';

describe('Aube en deux temps (R-12)', () => {
  it('les morts sont calculees mais pas encore appliquees avant « Lever le jour »', () => {
    const game = firstNight(setup({ roles: FIVE_ROLES }), 'Bob');

    expect(game.state.phase).toBe('DAWN');
    expect(game.state.dawn?.announced).toBe(false);
    expect(game.state.players.Bob?.alive).toBe(true);
  });

  it('« Lever le jour » annonce et applique les morts', () => {
    const game = firstNight(setup({ roles: FIVE_ROLES }), 'Bob').advance();

    expect(types(game.last)).toEqual(['DeathsAnnounced', 'PlayerKilled']);
    expect(game.state.players.Bob).toMatchObject({ alive: false, roleRevealed: true });
  });

  it('R-43 : sans revealRoleOnDeath, le role du mort reste cache', () => {
    const game = firstNight(
      setup({ roles: FIVE_ROLES, options: { revealRoleOnDeath: false } }),
      'Bob',
    ).advance();

    expect(game.state.players.Bob?.roleRevealed).toBe(false);
  });

  it('une nuit sans victime : l aube n annonce aucun mort', () => {
    const game = setup({ roles: FIVE_ROLES }).advance().advance(true).advance();

    expect(types(game.last)).toEqual(['DeathsAnnounced']);
  });

  it('apres l annonce, le meneur passe au jour : election du Maire le premier jour (R-50)', () => {
    const game = firstNight(setup({ roles: FIVE_ROLES }), 'Bob')
      .advance()
      .advance();

    expect(game.state.phase).toBe('MAYOR_ELECTION');
    expect(game.state.dawn).toBeNull();
  });

  it('sans Maire en option, on passe directement au debat', () => {
    const game = firstNight(setup({ roles: FIVE_ROLES, options: { mayor: false } }), 'Bob')
      .advance()
      .advance();

    expect(game.state.phase).toBe('DAY_DEBATE');
  });
});

describe('Victoire (R-01, R-02, R-05, R-06)', () => {
  it('R-02 : les loups gagnent quand tous les non-loups sont morts', () => {
    const roles = {
      Alice: 'werewolf',
      Bob: 'werewolf',
      Chloe: 'werewolf',
      David: 'werewolf',
      Eve: 'villager',
    } as const;
    // Composition invalide en Classique (R-07), mais rejouee : on teste la condition seule.
    const game = firstNight(setup({ roles }), 'Eve').advance();

    expect(game.state.phase).toBe('ENDED');
    expect(game.state.winner).toBe('wolves');
    expect(types(game.last)).toEqual([
      'DeathsAnnounced',
      'PlayerKilled',
      'GameEnded',
      'PhaseChanged',
    ]);
  });

  it('R-02 : avec wolvesWinOnParity, la parite suffit', () => {
    const roles = {
      Alice: 'werewolf',
      Bob: 'werewolf',
      Chloe: 'villager',
      David: 'villager',
      Eve: 'villager',
    } as const;
    const game = firstNight(
      setup({ roles, options: { wolvesWinOnParity: true } }),
      'Eve',
    ).advance();

    expect(game.state.winner).toBe('wolves');
  });

  it('R-02 : sans l option, la parite ne suffit pas', () => {
    const roles = {
      Alice: 'werewolf',
      Bob: 'werewolf',
      Chloe: 'villager',
      David: 'villager',
      Eve: 'villager',
    } as const;
    const game = firstNight(setup({ roles }), 'Eve').advance();

    expect(game.state.winner).toBeNull();
    expect(game.state.phase).toBe('DAWN');
  });

  it('R-01 : le village gagne quand le dernier loup est execute', () => {
    const game = firstNight(setup({ roles: FIVE_ROLES, options: { mayor: false } }), 'Bob')
      .advance()
      .advance()
      .advance()
      .votes({ Alice: 'Chloe', Chloe: 'Alice', David: 'Alice', Eve: 'Alice' })
      .advance();

    expect(game.state.winner).toBe('village');
    expect(game.state.phase).toBe('ENDED');
  });

  it('une partie terminee refuse toute commande', () => {
    const roles = {
      Alice: 'werewolf',
      Bob: 'werewolf',
      Chloe: 'werewolf',
      David: 'werewolf',
      Eve: 'villager',
    } as const;

    firstNight(setup({ roles }), 'Eve')
      .advance()
      .rejects(NARRATOR, { type: 'AdvancePhase' }, 'WRONG_PHASE');
  });

  it('R-05 : pas de victoire verifiee pendant la nuit, seulement apres la resolution', () => {
    const roles = {
      Alice: 'werewolf',
      Bob: 'werewolf',
      Chloe: 'werewolf',
      David: 'werewolf',
      Eve: 'villager',
    } as const;
    const game = firstNight(setup({ roles }), 'Eve');

    expect(game.state.winner).toBeNull();
  });

  it('R-06 : la condition « tout le monde est mort » passe avant les autres', () => {
    const game = setup({ roles: EIGHT_ROLES });

    for (const id of game.state.seats) {
      game.replay({ type: 'PlayerKilled', playerId: id, cause: 'vote', roleRevealed: true });
    }

    expect(checkVictory(game.state)).toBe('nobody');
  });
});
