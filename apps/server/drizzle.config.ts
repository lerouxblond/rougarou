import { defineConfig } from 'drizzle-kit';

/** Genere les migrations SQL de D1 a partir de `src/db/schema.ts` (`docs/04`). */
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './migrations',
});
