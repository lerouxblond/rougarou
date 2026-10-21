// Budget de taille du bundle initial (`docs/08`).
//
// La CI echoue si le JavaScript charge au premier rendu depasse 250 ko gzip.
// On mesure ce que `index.html` demande vraiment, et pas la somme de `dist/` :
// le service worker, Workbox et les morceaux charges a la demande ne pesent
// pas sur le premier rendu.
//
// Usage : node scripts/check-bundle-size.mjs

import { gzipSync } from 'node:zlib';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'apps', 'web', 'dist');

/** Budget du JS initial, en octets gzip (`docs/08`). */
const JS_BUDGET = 250 * 1024;

/** Budget de la CSS initiale : elle bloque le rendu, donc on la surveille aussi. */
const CSS_BUDGET = 100 * 1024;

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

if (!statSync(DIST, { throwIfNoEntry: false })?.isDirectory()) {
  fail(`${DIST} est absent. Lance "pnpm build" avant de mesurer.`);
}

const html = readFileSync(join(DIST, 'index.html'), 'utf8');

/** Fichiers references directement par `index.html`. */
function referenced(pattern) {
  return [...html.matchAll(pattern)]
    .map((match) => match[1])
    .filter((href) => href !== undefined && !href.startsWith('http'))
    .map((href) => href.replace(/^\//, ''));
}

const scripts = referenced(/<script[^>]+src="([^"]+)"/g);
const styles = referenced(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g);

if (scripts.length === 0) {
  fail("index.html ne reference aucun script : le build n'a probablement pas abouti.");
}

function gzipSize(files) {
  return files.reduce((total, file) => total + gzipSync(readFileSync(join(DIST, file))).length, 0);
}

const jsSize = gzipSize(scripts);
const cssSize = gzipSize(styles);

const kilobytes = (bytes) => `${(bytes / 1024).toFixed(1)} ko`;
const share = (bytes, budget) => `${((bytes / budget) * 100).toFixed(0)} %`;

console.log(
  `JS initial  ${kilobytes(jsSize)} gzip / ${kilobytes(JS_BUDGET)} (${share(jsSize, JS_BUDGET)})`,
);
console.log(
  `CSS initiale ${kilobytes(cssSize)} gzip / ${kilobytes(CSS_BUDGET)} (${share(cssSize, CSS_BUDGET)})`,
);

// Donne de la visibilite sur ce qui grossit, sans faire echouer la commande.
const chunks = readdirSync(join(DIST, 'assets'))
  .filter((file) => file.endsWith('.js'))
  .map((file) => ({ file, size: gzipSync(readFileSync(join(DIST, 'assets', file))).length }))
  .sort((a, b) => b.size - a.size)
  .slice(0, 5);

console.log('\nPlus gros morceaux JS :');
for (const { file, size } of chunks) {
  console.log(`  ${kilobytes(size).padStart(9)}  assets/${file}`);
}

if (jsSize > JS_BUDGET) {
  fail(`Le JS initial depasse le budget de ${kilobytes(jsSize - JS_BUDGET)} (docs/08).`);
}

if (cssSize > CSS_BUDGET) {
  fail(`La CSS initiale depasse le budget de ${kilobytes(cssSize - CSS_BUDGET)} (docs/08).`);
}

console.log('\n✓ Budget respecte.');
