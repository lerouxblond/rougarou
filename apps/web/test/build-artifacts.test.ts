// @vitest-environment node
// Ce test lit le resultat du build : il tourne hors DOM simule.

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const MANIFEST = `${DIST}/manifest.webmanifest`;

/**
 * La PWA doit etre installable (definition de « termine » de M0). Ces
 * verifications portent sur le build, pas sur la configuration : elles
 * echouent si `vite build` cesse de produire ce qu'il faut.
 *
 * Elles ne s'executent que si `dist/` existe, pour qu'un `pnpm test` lance
 * avant le premier build ne soit pas bloquant. La CI construit avant de
 * tester, donc elles y sont toujours actives.
 */
const built = existsSync(MANIFEST);
const describeBuilt = built ? describe : describe.skip;

describeBuilt('artefacts de build de la PWA', () => {
  const manifest: unknown = JSON.parse(readFileSync(MANIFEST, 'utf8'));

  function field(name: string): unknown {
    return (manifest as Record<string, unknown>)[name];
  }

  it('produit un service worker', () => {
    expect(existsSync(`${DIST}/sw.js`)).toBe(true);
  });

  it('declare un nom, une portee et un point d entree', () => {
    expect(field('name')).toBe('Rougarou');
    expect(field('start_url')).toBe('/');
    expect(field('scope')).toBe('/');
    expect(field('display')).toBe('standalone');
  });

  it('est en francais (D-16)', () => {
    expect(field('lang')).toBe('fr');
  });

  it('utilise le fond de nuit de design/tokens.css (docs/06)', () => {
    expect(field('background_color')).toBe('#070A12');
    expect(field('theme_color')).toBe('#070A12');
  });

  it('fournit les icones exigees pour l installation, dont une maskable', () => {
    const icons = field('icons') as { src: string; sizes: string; purpose?: string }[];

    expect(icons.map((icon) => icon.sizes)).toContain('192x192');
    expect(icons.map((icon) => icon.sizes)).toContain('512x512');
    expect(icons.some((icon) => icon.purpose === 'maskable')).toBe(true);

    for (const icon of icons) {
      expect(existsSync(`${DIST}/${icon.src}`)).toBe(true);
    }
  });
});
