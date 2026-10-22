import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';

/**
 * Une vraie table pour les tests de bout en bout (`docs/09`) : un contexte de
 * navigateur par personne, chacun avec sa propre session invite (D-04).
 *
 * Le pilote lit la vue projetee que l'ecran de debogage expose
 * (`data-testid="view-json"`), et agit uniquement par l'interface, comme le
 * ferait un joueur.
 */

/** Ce que les tests lisent de la vue projetee. */
export interface SeenPlayer {
  readonly id: string;
  readonly name: string;
  readonly alive: boolean;
  readonly role: string | null;
}

export interface View {
  readonly kind: 'player' | 'narrator';
  readonly phase: string;
  readonly nightNumber: number;
  readonly me?: {
    readonly id: string;
    readonly role: string | null;
    readonly alive: boolean;
  } | null;
  readonly players: readonly SeenPlayer[];
  readonly actions: readonly { readonly type: string; readonly targets?: readonly string[] }[];
  readonly vote: { readonly round: number } | null;
  readonly election: { readonly stage: string; readonly round: number } | null;
  readonly winner: string | null;
}

export interface Seat {
  readonly name: string;
  readonly page: Page;
}

export interface Table {
  readonly narrator: Page;
  readonly seats: readonly Seat[];
  readonly contexts: readonly BrowserContext[];
  readonly code: string;
}

export const PLAYERS = ['Alice', 'Bob', 'Chloe', 'David', 'Eve'] as const;

export async function readView(page: Page): Promise<View> {
  const text = await page.getByTestId('view-json').textContent();

  return JSON.parse(text ?? 'null') as View;
}

async function signInGuest(page: Page, name: string): Promise<void> {
  await page.getByLabel('Pseudo').fill(name);
  await page.getByRole('button', { name: 'Jouer en invité' }).click();
}

/** Le meneur et cinq joueurs, connectes et assis au salon. */
export async function openTable(browser: Browser): Promise<Table> {
  const contexts: BrowserContext[] = [];
  const open = async () => {
    const context = await browser.newContext();

    contexts.push(context);
    return context.newPage();
  };

  const narrator = await open();

  await narrator.goto('/');
  await signInGuest(narrator, 'Meneur');
  await narrator.getByRole('button', { name: 'Créer une partie' }).click();
  await narrator.waitForURL(/\/game\//);

  const codeText = await narrator.getByText(/Code de la partie : [A-Z0-9]{6}/).textContent();
  const code = /([A-Z0-9]{6})$/.exec(codeText ?? '')?.[1] ?? '';

  expect(code).toHaveLength(6);

  const seats: Seat[] = [];

  for (const name of PLAYERS) {
    const page = await open();

    // Le lien d'invitation : connexion, puis le salon sans rien ressaisir (US-11).
    await page.goto(`/join/${code}`);
    await signInGuest(page, name);
    await page.waitForURL(/\/game\//);
    await expect(page.getByLabel('Pseudo')).toHaveValue(name);
    await page.getByRole('button', { name: 'Rejoindre' }).click();
    await expect.poll(async () => (await readView(page)).me?.id).toBeTruthy();
    seats.push({ name, page });
  }

  await expect.poll(async () => (await readView(narrator)).players.length).toBe(PLAYERS.length);
  return { narrator, seats, contexts, code };
}

/** Configure un loup et quatre villageois, distribue, puis lance la nuit 1. */
export async function startNight(table: Table): Promise<void> {
  const { narrator, seats } = table;

  await narrator.getByRole('button', { name: 'Phase suivante' }).click();
  await expect.poll(async () => (await readView(narrator)).phase).toBe('CONFIG');

  await narrator.getByRole('button', { name: 'Ajouter un Loup-garou' }).click();

  for (let index = 0; index < 4; index += 1) {
    await narrator.getByRole('button', { name: 'Ajouter un Villageois' }).click();
  }

  await narrator.getByRole('button', { name: 'Enregistrer la composition' }).click();
  await expect(narrator.getByRole('button', { name: 'Distribuer' })).toBeEnabled();
  await narrator.getByRole('button', { name: 'Distribuer' }).click();

  for (const { page } of seats) {
    await page.getByRole('button', { name: "J'ai vu mon rôle" }).click();
  }

  await expect(narrator.getByRole('button', { name: 'Phase suivante' })).toBeVisible();
  await narrator.getByRole('button', { name: 'Phase suivante' }).click();
  await expect.poll(async () => (await readView(narrator)).phase).toBe('NIGHT');
}

/**
 * Ce qu'un joueur a le droit de voir du role d'un autre (`CLAUDE.md` regle 2) :
 * un mort revele, un loup pour un autre loup, ou tout le monde en fin de partie.
 */
export function assertNoRoleLeak(view: View): void {
  if (view.phase === 'ENDED' || view.me === null || view.me === undefined) {
    return;
  }

  const { me } = view;

  for (const seen of view.players) {
    if (seen.id !== me.id && seen.role !== null) {
      const allowed =
        !seen.alive || !me.alive || (me.role === 'werewolf' && seen.role === 'werewolf');

      expect(allowed, `${me.id} voit le role de ${seen.id}`).toBe(true);
    }
  }
}

/** Choisit une cible dans le formulaire libelle `label`, puis confirme. */
async function choose(page: Page, label: string, target: string): Promise<void> {
  const form = page.locator('form').filter({ has: page.getByLabel(label, { exact: true }) });

  await form.getByLabel(label, { exact: true }).selectOption({ label: target });
  await form.getByRole('button', { name: 'Confirmer' }).click();
}

const TARGET_LABELS: Readonly<Record<string, string>> = {
  SubmitNightAction: 'Désigner la victime',
  CastVote: 'Voter',
  BreakTie: 'Départager',
  DesignateSuccessor: 'Désigner son successeur',
};

/**
 * Joue la partie par l'interface jusqu'a la fin. Le village vote toujours
 * contre le loup, qui tue un villageois la nuit : le village gagne.
 */
export async function playToTheEnd(table: Table, wolf: string): Promise<View> {
  const done = new Set<string>();

  for (let round = 0; round < 120; round += 1) {
    const narratorView = await readView(table.narrator);

    if (narratorView.phase === 'ENDED') {
      return narratorView;
    }

    let acted = false;

    for (const { page } of table.seats) {
      const view = await readView(page);

      assertNoRoleLeak(view);
      acted = (await actAsPlayer(page, view, wolf, done)) || acted;
    }

    if (!acted) {
      await table.narrator
        .getByRole('button', { name: /^(Phase suivante|Forcer la suite)$/ })
        .click();
    }

    await table.narrator.waitForTimeout(250);
  }

  throw new Error('La partie ne se termine pas');
}

async function actAsPlayer(
  page: Page,
  view: View,
  wolf: string,
  done: Set<string>,
): Promise<boolean> {
  const me = view.me;

  if (me === null || me === undefined) {
    return false;
  }

  const names = new Map(view.players.map((player) => [player.id, player.name]));

  for (const action of view.actions) {
    const key = [
      me.id,
      action.type,
      view.phase,
      view.nightNumber,
      view.vote?.round,
      view.election?.stage,
      view.election?.round,
    ].join(':');

    if (done.has(key)) {
      continue;
    }

    if (action.type === 'ConfirmRoleSeen') {
      done.add(key);
      await page.getByRole('button', { name: "J'ai vu mon rôle" }).click();
      return true;
    }

    const label = TARGET_LABELS[action.type];
    const targets = action.targets ?? [];

    if (label !== undefined && targets.length > 0) {
      const target =
        action.type === 'CastVote' && view.phase === 'DAY_VOTE' && targets.includes(wolf)
          ? wolf
          : (targets[0] ?? '');

      done.add(key);
      await choose(page, label, names.get(target) ?? target);
      return true;
    }
  }

  return false;
}
