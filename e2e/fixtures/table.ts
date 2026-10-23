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

/** Une action proposee par le serveur, telle que les tests la lisent. */
export interface Action {
  readonly type: string;
  readonly kind?: string;
  readonly targets?: readonly string[];
  readonly canSave?: boolean;
  readonly killTargets?: readonly string[];
}

export interface View {
  readonly kind: 'player' | 'narrator';
  readonly phase: string;
  readonly nightNumber: number;
  readonly me?: {
    readonly id: string;
    readonly role: string | null;
    readonly alive: boolean;
    readonly knowledge: readonly { readonly kind: string; readonly playerId?: string }[];
  } | null;
  readonly players: readonly SeenPlayer[];
  readonly actions: readonly Action[];
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

/** Le meneur et ses joueurs (cinq par defaut), connectes et assis au salon. */
export async function openTable(
  browser: Browser,
  players: readonly string[] = PLAYERS,
): Promise<Table> {
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

  for (const name of players) {
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

  await expect.poll(async () => (await readView(narrator)).players.length).toBe(players.length);
  return { narrator, seats, contexts, code };
}

/** Nombre d'exemplaires de chaque role, par nom affiche. */
export type Composition = Readonly<Record<string, number>>;

/**
 * Configure la composition (un loup et quatre villageois par defaut),
 * distribue, puis lance la nuit 1.
 */
export async function startNight(
  table: Table,
  composition: Composition = { 'Loup-garou': 1, Villageois: 4 },
): Promise<void> {
  const { narrator, seats } = table;

  await narrator.getByRole('button', { name: 'Phase suivante' }).click();
  await expect.poll(async () => (await readView(narrator)).phase).toBe('CONFIG');

  for (const [role, count] of Object.entries(composition)) {
    for (let index = 0; index < count; index += 1) {
      await narrator.getByRole('button', { name: `Ajouter un ${role}` }).click();
    }
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
 * un mort revele, un loup pour un autre loup, un role appris en secret (Voyante,
 * amoureux, ADR 0010), ou tout le monde en fin de partie.
 */
export function assertNoRoleLeak(view: View): void {
  if (view.phase === 'ENDED' || view.me === null || view.me === undefined) {
    return;
  }

  const { me } = view;

  for (const seen of view.players) {
    if (seen.id !== me.id && seen.role !== null) {
      const learned = me.knowledge.some(
        (info) => (info.kind === 'seerRole' || info.kind === 'lover') && info.playerId === seen.id,
      );
      const allowed =
        !seen.alive || !me.alive || learned || (me.role === 'werewolf' && seen.role === 'werewolf');

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

/** Libelle du formulaire de cible de chaque action (catalogue francais). */
const TARGET_LABELS: Readonly<Record<string, string>> = {
  wolfVote: 'Désigner la victime',
  seerProbe: 'Sonder un joueur',
  CastVote: 'Voter',
  BreakTie: 'Départager',
  DesignateSuccessor: 'Désigner son successeur',
  HunterShoot: 'Tirer',
};

/** Les boutons simples des actions de nuit. */
const NIGHT_BUTTONS: Readonly<Record<string, string>> = {
  loversConfirm: "J'ai découvert mon amoureux",
  spy: 'Espionner la meute',
};

/**
 * Les choix d'une partie scenarisee. Chaque fonction recoit la vue du joueur
 * qui agit et l'action proposee par le serveur.
 */
export interface Policy {
  /** La cible d'une action a cible unique. */
  target(view: View, action: Action): string;
  /** Les potions de la Sorciere. Par defaut : rien. */
  potions?(view: View, action: Action): { readonly save: boolean; readonly kill: string | null };
  /** Le couple de Cupidon. Par defaut : les deux premieres cibles. */
  couple?(view: View, action: Action): readonly [string, string];
}

/** M2 : le village vote toujours contre le loup ; sinon, la premiere cible. */
export function voteAgainst(wolf: string): Policy {
  return {
    target: (view, action) => {
      const targets = action.targets ?? [];

      return action.type === 'CastVote' && view.phase === 'DAY_VOTE' && targets.includes(wolf)
        ? wolf
        : (targets[0] ?? '');
    },
  };
}

/** Une etape de la partie, vue par un joueur : chaque action n'est jouee qu'une fois. */
function actionKey(view: View, action: Action): string {
  return [
    view.me?.id,
    action.type,
    action.kind,
    view.phase,
    view.nightNumber,
    view.vote?.round,
    view.election?.stage,
    view.election?.round,
  ].join(':');
}

/**
 * Joue la partie par l'interface jusqu'a la fin, selon `policy`. A chaque
 * tour, la Petite fille passe en premier, pour espionner avant que la meute
 * ne se decide. `seen` recoit le type (et le genre) de chaque action jouee.
 */
export async function playToTheEnd(
  table: Table,
  policy: Policy,
  seen = new Set<string>(),
): Promise<View> {
  const done = new Set<string>();

  for (let round = 0; round < 200; round += 1) {
    const narratorView = await readView(table.narrator);

    if (narratorView.phase === 'ENDED') {
      return narratorView;
    }

    const views = await Promise.all(
      table.seats.map(async (seat) => ({ seat, view: await readView(seat.page) })),
    );
    const ordered = [...views].sort(
      (left, right) =>
        Number(right.view.me?.role === 'little-girl') -
        Number(left.view.me?.role === 'little-girl'),
    );
    let acted = false;

    for (const { seat, view } of ordered) {
      assertNoRoleLeak(view);
      acted = (await actAsPlayer(seat.page, view, policy, done, seen)) || acted;
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
  policy: Policy,
  done: Set<string>,
  seen: Set<string>,
): Promise<boolean> {
  if (view.me === null || view.me === undefined) {
    return false;
  }

  const names = new Map(view.players.map((player) => [player.id, player.name]));
  const nameOf = (id: string) => names.get(id) ?? id;

  for (const action of view.actions) {
    const key = actionKey(view, action);

    if (done.has(key)) {
      continue;
    }

    const played = await play(page, view, action, policy, nameOf);

    if (played) {
      done.add(key);
      seen.add(action.kind ?? action.type);
      return true;
    }
  }

  return false;
}

/** Joue une action par l'interface. Renvoie `false` si elle n'a pas de controle connu. */
async function play(
  page: Page,
  view: View,
  action: Action,
  policy: Policy,
  nameOf: (id: string) => string,
): Promise<boolean> {
  if (action.type === 'ConfirmRoleSeen') {
    await page.getByRole('button', { name: "J'ai vu mon rôle" }).click();
    return true;
  }

  const button = NIGHT_BUTTONS[action.kind ?? ''];

  if (button !== undefined) {
    await page.getByRole('button', { name: button }).click();
    return true;
  }

  if (action.kind === 'witchPotions') {
    const { save, kill } = policy.potions?.(view, action) ?? { save: false, kill: null };
    const form = page.locator('form').filter({ hasText: 'Vos potions' });

    if (save) {
      await form.getByLabel('Sauver la victime avec la potion de vie').check();
    }

    if (kill !== null) {
      await form.getByLabel('Potion de mort').selectOption({ label: nameOf(kill) });
    }

    await form.getByRole('button', { name: 'Confirmer' }).click();
    return true;
  }

  if (action.kind === 'cupidLink') {
    const targets = action.targets ?? [];
    const [first, second] = policy.couple?.(view, action) ?? [targets[0] ?? '', targets[1] ?? ''];
    const form = page.locator('form').filter({ hasText: 'Former le couple' });

    await form.getByLabel('Premier amoureux').selectOption({ label: nameOf(first) });
    await form.getByLabel('Second amoureux').selectOption({ label: nameOf(second) });
    await form.getByRole('button', { name: 'Confirmer' }).click();
    return true;
  }

  const label = TARGET_LABELS[action.kind ?? action.type];

  if (label !== undefined && (action.targets ?? []).length > 0) {
    await choose(page, label, nameOf(policy.target(view, action)));
    return true;
  }

  return false;
}
