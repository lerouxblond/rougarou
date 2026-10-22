/// <reference types="@cloudflare/vitest-plugin/types" />

import type { D1Migration } from '@cloudflare/vitest-plugin';

import type { Env as WorkerEnv } from '../src/env.ts';
import type app from '../src/index.ts';

/**
 * Declare le module principal du Worker.
 *
 * `cloudflare:workers` expose les entrypoints sous `exports`, dont le type est
 * derive de `Cloudflare.GlobalProps['mainModule']`. En le declarant ici, les
 * tests appellent `worker.default.fetch()` avec le type reel de l'app Hono,
 * verifie par le compilateur plutot que par un cast.
 */
declare global {
  namespace Cloudflare {
    interface GlobalProps {
      mainModule: { default: typeof app };
    }

    /** Les bindings du Worker, plus les migrations injectees par `vitest.config.ts`. */
    interface Env extends WorkerEnv {
      readonly TEST_MIGRATIONS: D1Migration[];
    }
  }
}
