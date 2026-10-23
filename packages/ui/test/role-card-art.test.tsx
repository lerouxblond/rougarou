import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';

import {
  ROLE_ICON_IDS,
  RoleCardArt,
  RoleIcon,
  TEAM_ICON_IDS,
  TeamIcon,
  type RoleIconId,
} from '../src/index.ts';

afterEach(cleanup);

// Sous jsdom, `import.meta.url` n'est pas une URL de fichier : on part du paquet, ou Vitest tourne.
const ICONS = join(process.cwd(), 'icons', '/');

/** Le balisage d'un SVG, sans commentaires ni blancs, balises auto-fermantes developpees. */
function normalize(svg: string): string {
  return svg
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/<(\w+)([^<>]*?)\s*\/>/g, '<$1$2></$1>')
    .trim();
}

/** `color-contrast` est verifie sur les tokens (`contrast.test.ts`) : jsdom ne calcule pas les couleurs. */
async function axeViolations(element: HTMLElement): Promise<axe.Result[]> {
  const results = await axe.run(element, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    rules: { 'color-contrast': { enabled: false } },
  });

  return results.violations;
}

const NAMES: Record<RoleIconId, string> = {
  werewolf: 'Loup-garou',
  villager: 'Villageois',
  seer: 'Voyante',
  witch: 'Sorcière',
  hunter: 'Chasseur',
  cupid: 'Cupidon',
  'little-girl': 'Petite fille',
};

describe('Icones (docs/07)', () => {
  it.each(ROLE_ICON_IDS)('l icone %s reprend exactement son fichier source', (role) => {
    const source = readFileSync(`${ICONS}icon-role-${role}.svg`, 'utf8');

    expect(normalize(renderToStaticMarkup(<RoleIcon role={role} />))).toBe(normalize(source));
  });

  it.each(TEAM_ICON_IDS)('l icone du camp %s reprend exactement son fichier source', (team) => {
    const source = readFileSync(`${ICONS}icon-team-${team}.svg`, 'utf8');

    expect(normalize(renderToStaticMarkup(<TeamIcon team={team} />))).toBe(normalize(source));
  });

  it('une icone est decorative : elle est cachee des lecteurs d ecran', () => {
    const { container } = render(<RoleIcon role="seer" />);

    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('RoleCardArt (docs/07, carte de repli)', () => {
  it.each(ROLE_ICON_IDS)(
    'la carte %s porte son nom et son camp, lus par les lecteurs d ecran',
    async (role) => {
      const team = role === 'werewolf' ? 'wolves' : 'village';
      const teamLabel = team === 'wolves' ? 'Loups' : 'Village';

      render(<RoleCardArt role={role} team={team} name={NAMES[role]} teamLabel={teamLabel} />);

      const card = screen.getByRole('figure', { name: NAMES[role] });

      expect(card.textContent).toContain(teamLabel);
      expect(await axeViolations(card)).toEqual([]);
    },
  );

  it('l accent suit le camp, par un token et jamais par une couleur en dur', () => {
    render(<RoleCardArt role="werewolf" team="wolves" name="Loup-garou" teamLabel="Loups" />);

    const card = screen.getByRole('figure', { name: 'Loup-garou' });

    expect(card.className).toContain('text-team-wolves');
    expect(card.outerHTML).not.toMatch(/#[0-9a-f]{3,6}\b/i);
    expect(card.outerHTML).not.toContain('style=');
  });
});
