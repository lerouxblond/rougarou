import { expect, test } from '@playwright/test';

/**
 * Fumee du jalon M0 : l'accueil s'affiche, la PWA est installable et l'API
 * repond, le tout servi par le meme Worker.
 */

test("l'accueil s'affiche et vient d'i18n", async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('La nuit tombe sur le village');
  // Sans session : connexion, ou jeu en invite (D-04).
  await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Jouer en invité' })).toBeVisible();
});

test('la page est en theme nuit hors partie (docs/06)', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('data-phase', 'night');

  // Le token doit etre charge : c'est ce qui prouve que `design/tokens.css`
  // est bien applique.
  const token = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim().toLowerCase(),
  );

  expect(token).toBe('#070a12');

  // `design/tokens.css` anime le fond de `html` sur `--motion-phase`
  // (1 200 ms). Au chargement, la valeur calculee est donc une interpolation :
  // on attend que la transition soit finie avant de comparer.
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor), {
      timeout: 5000,
    })
    .toBe('rgb(7, 10, 18)');
});

test('le lien d evitement precede tout le reste et vise le contenu', async ({ page }) => {
  await page.goto('/');

  const firstInteractive = page.locator('a, button').first();

  await expect(firstInteractive).toHaveText('Aller au contenu');
  await expect(firstInteractive).toHaveAttribute('href', '#contenu');
  await expect(page.locator('#contenu')).toBeAttached();
});

test('le premier Tab atteint le lien d evitement (CLAUDE.md regle 9)', async ({
  page,
  isMobile,
}) => {
  // Safari iOS sort les elements masques par `clip` de l'ordre de tabulation,
  // et un appareil tactile n'a de toute facon pas de touche Tab : la regle
  // vise les claviers, donc on la verifie sur le navigateur de bureau.
  test.skip(isMobile, 'Navigation au clavier : sur ordinateur seulement.');

  await page.goto('/');

  // On part du `body` pour que le premier Tab parte bien du debut du document.
  await page.locator('body').press('Tab');

  const focused = page.locator(':focus');

  await expect(focused).toHaveText('Aller au contenu');
  // Il est masque jusqu'au focus, puis visible : c'est tout son interet.
  await expect(focused).toBeVisible();
});

test('les boutons sont atteignables au clavier', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Jouer en invité' }).focus();

  await expect(page.locator(':focus')).toHaveText('Jouer en invité');
});

test('la PWA est installable : manifest et service worker sont servis', async ({ request }) => {
  const manifest = await request.get('/manifest.webmanifest');
  expect(manifest.status()).toBe(200);

  const body: unknown = await manifest.json();
  const { name, icons } = body as { name: string; icons: { src: string }[] };

  expect(name).toBe('Rougarou');
  expect(icons.length).toBeGreaterThan(0);

  const serviceWorker = await request.get('/sw.js');
  expect(serviceWorker.status()).toBe(200);

  // Chaque icone annoncee doit exister.
  for (const icon of icons) {
    const response = await request.get(`/${icon.src}`);
    expect(response.status(), `icone ${icon.src}`).toBe(200);
  }
});

test('l API repond et n est pas servie par le repli SPA', async ({ request }) => {
  const health = await request.get('/api/health');

  expect(health.status()).toBe(200);
  expect(health.headers()['content-type']).toContain('application/json');

  const body = (await health.json()) as { status: string; protocol: number };
  expect(body.status).toBe('ok');
  expect(body.protocol).toBeGreaterThan(0);

  // Une route d'API inconnue renvoie du JSON, jamais `index.html`.
  const unknown = await request.get('/api/inconnue');
  expect(unknown.status()).toBe(404);
  expect(unknown.headers()['content-type']).toContain('application/json');
});

test('une route inconnue du client rend la SPA', async ({ page }) => {
  const response = await page.goto('/une/route/inconnue');

  expect(response?.status()).toBe(200);
  await expect(page.locator('#root')).toBeAttached();
});

test('les en-tetes de securite sont appliques (docs/04)', async ({ request }) => {
  const response = await request.get('/');
  const headers = response.headers();

  expect(headers['content-security-policy']).toContain("default-src 'self'");
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['x-content-type-options']).toBe('nosniff');
});
