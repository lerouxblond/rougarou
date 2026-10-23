import { z } from 'zod';

// La CSP du web interdit `eval` (`docs/04`), et un Worker aussi. Sans
// `jitless`, Zod sonde `new Function` au premier parse : l'erreur est avalee,
// mais le navigateur signale quand meme une violation de CSP.
z.config({ jitless: true });
