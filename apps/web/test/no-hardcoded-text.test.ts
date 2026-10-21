// @vitest-environment node
// Ce test lit les sources du depot : il n'a rien a faire dans un DOM simule.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../src', import.meta.url));

/** Tous les composants `.tsx` de l'app. */
function components(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return components(path);
    }

    return entry.name.endsWith('.tsx') ? [path] : [];
  });
}

const FILES = components(SRC);

/**
 * Texte visible ecrit directement entre deux balises JSX.
 *
 * On ignore ce qui est entre accolades (`{t('…')}`), qui est du code, et les
 * fragments d'une seule lettre ou de ponctuation.
 */
function hardCodedText(source: string): string[] {
  return (source.match(/>[^<>{}]*[A-Za-zÀ-ÿ]{3,}[^<>{}]*</g) ?? []).map((match) =>
    match.slice(1, -1).trim(),
  );
}

describe('aucun texte en dur (CLAUDE.md regle 6)', () => {
  it('trouve bien des composants a verifier', () => {
    expect(FILES.length).toBeGreaterThan(0);
  });

  it.each(FILES)('%s ne contient aucun libelle ecrit en dur', (file) => {
    expect(hardCodedText(readFileSync(file, 'utf8'))).toEqual([]);
  });

  it('detecte un libelle ecrit en dur quand il y en a un', () => {
    expect(hardCodedText('<button>Créer une partie</button>')).toEqual(['Créer une partie']);
    expect(hardCodedText("<button>{t('home.create_game')}</button>")).toEqual([]);
  });
});
