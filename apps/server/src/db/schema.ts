import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

/**
 * Schema D1 (`docs/04` §Base de donnees). Les tables sont en `snake_case` au
 * singulier (`docs/09`). Les migrations sont generees par drizzle-kit dans
 * `apps/server/migrations` et appliquees avant chaque deploiement (`docs/08`).
 */

const timestamp = (name: string) => integer(name, { mode: 'timestamp_ms' });

const createdAt = () =>
  timestamp('created_at')
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

const updatedAt = () =>
  timestamp('updated_at')
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

// --- Tables de Better Auth (ADR 0003) ---------------------------------------
// Les cles TypeScript suivent les noms de champs attendus par l'adaptateur.

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  /** Compte invite (D-04, plugin `anonymous`). */
  isAnonymous: integer('is_anonymous', { mode: 'boolean' }).notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = sqliteTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index('session_user_id_idx').on(table.userId)],
);

export const account = sqliteTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index('account_user_id_idx').on(table.userId)],
);

export const verification = sqliteTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
);

// --- Tables de l'application ------------------------------------------------

export const profile = sqliteTable('profile', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  displayName: text('display_name').notNull(),
  avatarId: text('avatar_id'),
  locale: text('locale').notNull().default('fr'),
  /** Preferences (sons, vibrations), en JSON. */
  prefs: text('prefs', { mode: 'json' }).notNull().default('{}'),
});

/** Statut d'une partie : `lobby` jusqu'a la distribution, `playing`, puis `ended`. */
export const GAME_STATUSES = ['lobby', 'playing', 'ended'] as const;

export const game = sqliteTable(
  'game',
  {
    /** ULID, nom du Durable Object (`docs/04`). */
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    /** `null` si le compte du meneur a ete supprime (D-21). */
    narratorId: text('narrator_id').references(() => user.id, { onDelete: 'set null' }),
    status: text('status', { enum: GAME_STATUSES }).notNull().default('lobby'),
    playMode: text('play_mode', { enum: ['inPerson', 'remote'] })
      .notNull()
      .default('inPerson'),
    /** Ecrit seulement a `ENDED` pour un mode deguise (`docs/04`). */
    gameModeId: text('game_mode_id'),
    options: text('options', { mode: 'json' }),
    createdAt: createdAt(),
    endedAt: timestamp('ended_at'),
    winner: text('winner'),
  },
  (table) => [
    // Un code n'est reserve que par une partie active (`docs/04`).
    uniqueIndex('game_active_code_idx')
      .on(table.code)
      .where(sql`${table.status} != 'ended'`),
  ],
);

export const gamePlayer = sqliteTable(
  'game_player',
  {
    gameId: text('game_id')
      .notNull()
      .references(() => game.id, { onDelete: 'cascade' }),
    /** `null` une fois le compte supprime : la ligne reste, anonymisee (D-21). */
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    seat: integer('seat').notNull(),
    /** Pseudo dans cette partie : il reste dans l'historique des autres. */
    displayName: text('display_name').notNull(),
    character: text('character', { mode: 'json' }),
    finalRole: text('final_role'),
    team: text('team'),
    aliveAtEnd: integer('alive_at_end', { mode: 'boolean' }),
    won: integer('won', { mode: 'boolean' }),
  },
  (table) => [
    primaryKey({ columns: [table.gameId, table.seat] }),
    index('game_player_user_id_idx').on(table.userId),
  ],
);

export const preset = sqliteTable(
  'preset',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    modeId: text('mode_id').notNull(),
    name: text('name').notNull(),
    composition: text('composition', { mode: 'json' }).notNull(),
    options: text('options', { mode: 'json' }).notNull(),
  },
  (table) => [index('preset_owner_id_idx').on(table.ownerId)],
);
