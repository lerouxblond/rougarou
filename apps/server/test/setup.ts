import { applyD1Migrations } from 'cloudflare:test';
import { env } from 'cloudflare:workers';

// Applique le schema sur la D1 de test avant chaque fichier (`docs/09` §Tests).
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
