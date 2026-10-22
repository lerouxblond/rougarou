import { teamOf, type GameState } from '@rougarou/engine';
import type { TeamId } from '@rougarou/protocol';
import { eq } from 'drizzle-orm';

import type { Database } from '../auth.ts';
import * as schema from '../db/schema.ts';

/** Le joueur a-t-il gagne ? Le couple mixte gagne a deux, chacun hors de son camp (`R-03`). */
function wonGame(state: GameState, id: string, team: TeamId | null): boolean {
  if (state.winner === 'lovers') {
    return state.lovers?.includes(id) === true;
  }

  return team !== null && team === state.winner;
}

/** La partie est distribuee : son code ne sert plus qu'a revenir (US-11). */
export async function markPlaying(db: Database, gameId: string): Promise<void> {
  await db.update(schema.game).set({ status: 'playing' }).where(eq(schema.game.id, gameId));
}

/**
 * Resume d'une partie terminee dans D1 (`docs/04` §Durable Object) : la
 * partie libere son code, et chaque joueur garde sa ligne d'historique. Le
 * resume est ecrit une seule fois.
 */
export async function writeSummary(db: Database, state: GameState, now: number): Promise<void> {
  const players = state.seats.flatMap((id, seat) => {
    const player = state.players[id];

    if (player === undefined) {
      return [];
    }

    const team = teamOf(state, id);

    return [
      {
        gameId: state.gameId,
        userId: id,
        seat,
        displayName: player.name,
        finalRole: player.role,
        team,
        aliveAtEnd: player.alive,
        won: wonGame(state, id, team),
      },
    ];
  });

  await db.batch([
    db
      .update(schema.game)
      .set({ status: 'ended', endedAt: new Date(now), winner: state.winner })
      .where(eq(schema.game.id, state.gameId)),
    db.delete(schema.gamePlayer).where(eq(schema.gamePlayer.gameId, state.gameId)),
    ...(players.length > 0 ? [db.insert(schema.gamePlayer).values(players)] : []),
  ]);
}
