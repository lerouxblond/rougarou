/**
 * Version du protocole client↔serveur.
 *
 * Tout message WebSocket la porte. Un client trop ancien recoit
 * `PROTOCOL_OUTDATED` et l'app invite a se mettre a jour (`docs/04`).
 * On l'incremente des qu'un message change de forme de facon incompatible,
 * et la liste de controle de release le verifie (`docs/08`).
 */
export const PROTOCOL_VERSION = 5;
