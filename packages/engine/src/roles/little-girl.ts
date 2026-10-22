import type { LittleGirlRisk, PlayerId } from '@rougarou/protocol';

import type { NightObserverSpec } from '../night/types.ts';
import type { Rng } from '../rng.ts';
import {
  alivePlayers,
  getPlayer,
  livingWithRole,
  type GameState,
  type GlimpsedWolf,
} from '../state.ts';
import { engineError } from '../tx.ts';
import { teamOf } from './index.ts';
import type { RoleDefinition } from './types.ts';
import { livingWolves } from './werewolf.ts';

/** Probabilite maximale d'etre reperee (`docs/02`). */
const MAX_SPOT_CHANCE = 75;

/** Nombre de suspects que recoivent les loups, elle comprise. */
const SUSPECTS = 3;

/** Les caracteres d'un pseudo, un par point de code (accents compris). */
function charactersOf(name: string): string[] {
  return Array.from(name);
}

function isSpace(character: string): boolean {
  return character.trim() === '';
}

/**
 * Nombre de lettres devoilees : un tiers des caracteres hors espaces, arrondi
 * a l'inferieur, au moins une a partir de 3. En dessous, seule la longueur se voit.
 */
export function revealedCount(name: string): number {
  const letters = charactersOf(name).filter((character) => !isSpace(character)).length;

  return letters < 3 ? 0 : Math.max(1, Math.floor(letters / 3));
}

/** Le pseudo partiel : une case par caractere, espaces visibles, `null` pour une lettre cachee. */
export function maskName(name: string, revealed: readonly number[]): (string | null)[] {
  return charactersOf(name).map((character, index) =>
    isSpace(character) || revealed.includes(index) ? character : null,
  );
}

/**
 * Probabilite d'etre reperee la n-ieme nuit ou elle espionne :
 * `min(base + (n - 1) * increase, 75)` points de % (`docs/02`).
 */
export function spotChance(risk: LittleGirlRisk, nth: number): number {
  return Math.min(risk.base + (nth - 1) * risk.increase, MAX_SPOT_CHANCE) / 100;
}

/** Tire les lettres devoilees de chaque loup et leur ordre, pour cette nuit. */
function drawPack(state: GameState, rng: Rng): GlimpsedWolf[] {
  return rng.shuffle(livingWolves(state)).map((wolf) => {
    const characters = charactersOf(getPlayer(state, wolf).name);
    const letters = characters.flatMap((character, index) => (isSpace(character) ? [] : [index]));
    const revealed = rng
      .shuffle(letters)
      .slice(0, revealedCount(getPlayer(state, wolf).name))
      .sort((left, right) => left - right);

    return { wolf, revealed };
  });
}

/** Elle et 2 non-loups vivants tires au hasard, dans l'ordre des places. */
function drawSuspects(state: GameState, spy: PlayerId, rng: Rng): PlayerId[] {
  const others = alivePlayers(state)
    .map((player) => player.id)
    .filter((id) => id !== spy && teamOf(state, id) !== 'wolves');
  const chosen = new Set([spy, ...rng.shuffle(others).slice(0, SUSPECTS - 1)]);

  return state.seats.filter((id) => chosen.has(id));
}

/** Ce qu'elle voit de la meute : pseudos partiels et cibles en direct, jamais un identifiant de loup. */
function packView(state: GameState): { mask: (string | null)[]; target: PlayerId | null }[] {
  const votes = state.night?.wolfVotes ?? {};

  return (state.night?.spy?.pack ?? []).map(({ wolf, revealed }) => ({
    mask: maskName(getPlayer(state, wolf).name, revealed),
    target: votes[wolf] ?? null,
  }));
}

/**
 * La Petite fille regarde l'etape des loups sans en etre acteur : elle ne la
 * bloque jamais (`docs/02`, P21).
 */
const spyObserver: NightObserverSpec = {
  step: 'wolves',

  observers: (state) => livingWithRole(state, 'little-girl'),

  submit(tx, observer, action) {
    if (action.kind !== 'spy') {
      return engineError('INVALID_COMMAND', 'errors.night.wrong_action');
    }

    if (tx.state.night?.stepResolved !== false || tx.state.night.spy !== null) {
      return engineError('WRONG_PHASE', 'errors.little_girl.already_spied');
    }

    const { rng } = tx.ctx;
    const nth = (tx.state.spyNights[observer] ?? 0) + 1;
    const pack = drawPack(tx.state, rng);
    const caught = rng.next() < spotChance(tx.state.options.littleGirlRisk, nth);
    const suspects = caught ? drawSuspects(tx.state, observer, rng) : [];
    const night = tx.state.nightNumber;

    tx.emit({ type: 'LittleGirlSpied', playerId: observer, pack, caught, suspects });
    tx.emit({
      type: 'KnowledgeGained',
      playerId: observer,
      knowledge: { kind: 'wolfGlimpse', night, masks: packView(tx.state).map((wolf) => wolf.mask) },
    });

    for (const wolf of caught ? livingWolves(tx.state) : []) {
      tx.emit({
        type: 'KnowledgeGained',
        playerId: wolf,
        knowledge: { kind: 'littleGirlSuspects', night, players: suspects },
      });
    }

    return null;
  },

  actionsFor(state) {
    return state.night?.spy === null ? [{ type: 'SubmitNightAction', kind: 'spy' }] : [];
  },

  viewFor(state, observer) {
    const spying = state.night?.spy?.playerId === observer;

    return {
      step: 'spy',
      resolved: state.night?.stepResolved ?? false,
      pack: spying ? packView(state) : null,
    };
  },
};

/**
 * Petite fille (`docs/02`) : elle choisit d'espionner la meute, au risque
 * d'etre reperee, un risque qui grandit a chaque nuit espionnee.
 */
export const littleGirl: RoleDefinition = {
  id: 'little-girl',
  team: 'village',
  tier: 'core',
  unique: true,
  wakes: 'never',
  nightObservers: [spyObserver],
  knowsTeammates: false,
};
