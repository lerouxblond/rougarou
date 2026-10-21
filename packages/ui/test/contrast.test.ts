// @vitest-environment node
// Ce test lit un fichier du depot : il n'a rien a faire dans un DOM simule.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Contraste des tokens (`docs/06`, `CLAUDE.md` regle 9).
 *
 * `design/tokens.css` est la source de verite : on la lit telle quelle plutot
 * que de recopier des valeurs ici, pour qu'un changement de token fasse
 * echouer ce test au lieu de passer inapercu.
 */
const TOKENS_CSS = readFileSync(
  fileURLToPath(new URL('../../../design/tokens.css', import.meta.url)),
  'utf8',
);

/** Declarations `--nom: valeur;` d'un bloc, par nom. */
function declarations(block: string): Map<string, string> {
  const found = new Map<string, string>();

  for (const [, name, value] of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    if (name !== undefined && value !== undefined) {
      found.set(name, value.trim());
    }
  }

  return found;
}

/** Contenu du premier bloc dont le selecteur contient `selector`. */
function block(selector: string): string {
  const index = TOKENS_CSS.indexOf(selector);
  if (index === -1) {
    throw new Error(`Selecteur "${selector}" absent de design/tokens.css`);
  }

  const open = TOKENS_CSS.indexOf('{', index);
  const close = TOKENS_CSS.indexOf('}', open);

  return TOKENS_CSS.slice(open + 1, close);
}

// Les primitifs sont declares dans le premier bloc `:root`, les tokens
// semantiques dans les blocs de phase.
const primitives = declarations(block(':root {'));
const nightTokens = declarations(block('[data-phase="night"] {'));
const dayTokens = declarations(block('[data-phase="day"] {'));

/** Resout un token semantique en couleur hexadecimale. */
function resolve(tokens: Map<string, string>, name: string): string {
  const raw = tokens.get(name);
  if (raw === undefined) {
    throw new Error(`Token "${name}" absent du theme`);
  }

  const reference = /^var\((--[\w-]+)\)$/.exec(raw);
  if (reference === null) {
    return raw;
  }

  const target = reference[1]!;
  const primitive = primitives.get(target);
  if (primitive === undefined) {
    throw new Error(`Primitif "${target}" absent du bloc :root`);
  }

  return primitive;
}

/** Luminance relative d'une couleur `#rrggbb` (formule WCAG 2.1). */
function luminance(hex: string): number {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (match === null) {
    throw new Error(`Couleur hexadecimale attendue, recu "${hex}"`);
  }

  const digits = match[1]!;
  const channels = [0, 2, 4].map((offset) => {
    const value = Number.parseInt(digits.slice(offset, offset + 2), 16) / 255;

    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  }) as [number, number, number];

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** Rapport de contraste entre deux couleurs (de 1 a 21). */
function contrast(foreground: string, background: string): number {
  const a = luminance(foreground);
  const b = luminance(background);
  const [lighter, darker] = a > b ? [a, b] : [b, a];

  return (lighter + 0.05) / (darker + 0.05);
}

const THEMES = [
  { name: 'nuit', tokens: nightTokens },
  { name: 'jour', tokens: dayTokens },
] as const;

/** Paires texte/fond : 4,5:1 minimum (`docs/06`). */
const TEXT_PAIRS = [
  ['--color-text', '--color-bg'],
  ['--color-text', '--color-surface'],
  ['--color-text', '--color-surface-raised'],
  ['--color-text-muted', '--color-bg'],
  ['--color-text-muted', '--color-surface'],
  ['--color-accent', '--color-bg'],
  ['--color-accent', '--color-surface'],
  ['--color-danger', '--color-bg'],
  ['--color-danger', '--color-surface'],
  ['--color-on-accent', '--color-accent'],
  ['--team-village', '--color-bg'],
  ['--team-wolves', '--color-bg'],
  ['--team-vampires', '--color-bg'],
  ['--team-solo', '--color-bg'],
] as const;

/** Composants d'interface : 3:1 minimum (`docs/06`). */
const COMPONENT_PAIRS = [
  ['--color-focus', '--color-bg'],
  ['--color-focus', '--color-surface'],
] as const;

describe('design/tokens.css', () => {
  it('declare les deux themes', () => {
    expect(nightTokens.size).toBeGreaterThan(0);
    expect(dayTokens.size).toBeGreaterThan(0);
  });

  it('resout chaque token semantique en couleur hexadecimale', () => {
    for (const { tokens } of THEMES) {
      for (const [foreground, background] of TEXT_PAIRS) {
        expect(resolve(tokens, foreground)).toMatch(/^#[0-9a-f]{6}$/i);
        expect(resolve(tokens, background)).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });
});

describe.each(THEMES)('contraste du theme $name (docs/06)', ({ tokens }) => {
  it.each(TEXT_PAIRS)('%s sur %s atteint 4,5:1', (foreground, background) => {
    const ratio = contrast(resolve(tokens, foreground), resolve(tokens, background));

    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it.each(COMPONENT_PAIRS)('%s sur %s atteint 3:1', (foreground, background) => {
    const ratio = contrast(resolve(tokens, foreground), resolve(tokens, background));

    expect(ratio).toBeGreaterThanOrEqual(3);
  });
});

describe('formule de contraste', () => {
  it('donne 21:1 entre le noir et le blanc', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 1);
  });

  it('donne 1:1 entre une couleur et elle-meme', () => {
    expect(contrast('#F2C14E', '#F2C14E')).toBeCloseTo(1, 5);
  });
});
