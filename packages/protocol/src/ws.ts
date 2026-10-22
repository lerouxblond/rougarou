import { z } from 'zod';

import { commandSchema } from './commands.ts';
import { errorCodeSchema, messageKeySchema } from './errors.ts';
import { playerIdSchema } from './ids.ts';
import { PROTOCOL_VERSION } from './version.ts';
import { narratorViewSchema, playerViewSchema } from './views.ts';

/**
 * Messages WebSocket (`docs/04` §Protocole). Chacun porte la version du
 * protocole `v` : un client plus ancien recoit `PROTOCOL_OUTDATED`.
 */
const version = z.literal(PROTOCOL_VERSION);

/** Identifiant de correlation d'une commande, repris dans `ack` ou `error`. */
const correlationIdSchema = z.string().min(1).max(64);

/**
 * Client → serveur. Le client n'envoie jamais d'acteur : le serveur le deduit
 * du socket authentifie (`docs/04` §Securite). Le chat arrive en M5.
 */
export const clientMessageSchema = z.discriminatedUnion('t', [
  z.strictObject({ v: version, t: z.literal('cmd'), id: correlationIdSchema, cmd: commandSchema }),
  z.strictObject({ v: version, t: z.literal('ping') }),
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;

/** Un message avant validation, tel que le client l'ecrit. */
export type ClientMessageInput = z.input<typeof clientMessageSchema>;

/** Serveur → client. */
export const serverMessageSchema = z.discriminatedUnion('t', [
  z.strictObject({
    v: version,
    t: z.literal('state'),
    /**
     * Revision de la partie : elle croit a chaque commande acceptee, `Undo`
     * compris. Un trou chez le client declenche une resynchronisation.
     */
    seq: z.int().min(0),
    view: z.union([playerViewSchema, narratorViewSchema]),
  }),
  z.strictObject({ v: version, t: z.literal('ack'), id: correlationIdSchema }),
  z.strictObject({
    v: version,
    t: z.literal('error'),
    id: correlationIdSchema.optional(),
    code: errorCodeSchema,
    messageKey: messageKeySchema,
  }),
  /** Joueurs connectes, envoye au meneur seul (`R-61`, `R-63`). */
  z.strictObject({ v: version, t: z.literal('presence'), connected: z.array(playerIdSchema) }),
  z.strictObject({ v: version, t: z.literal('pong') }),
]);

export type ServerMessage = z.infer<typeof serverMessageSchema>;

/**
 * La version d'un message de forme quelconque, ou `null`. Le serveur la lit
 * avant toute validation, pour repondre `PROTOCOL_OUTDATED` a un ancien
 * client plutot qu'une erreur de schema.
 */
export function messageVersionOf(raw: unknown): number | null {
  const parsed = z.object({ v: z.int() }).safeParse(raw);

  return parsed.success ? parsed.data.v : null;
}
