import { expect, test } from '@playwright/test';
import { CARRASCAL_HASH, applyCsp, mockPlaceSearch } from './helpers.ts';

test.describe('with production CSP', () => {
  test.use({ serviceWorkers: 'block' }); // route() must see every request

  test('PRD F1: form → Sun Gemini, Moon Virgo, Rising Scorpio; no CSP violations', async ({
    page,
  }) => {
    const violations: string[] = [];
    page.on('console', (m) => {
      if (/Content.Security.Policy/i.test(m.text())) violations.push(m.text());
    });
    page.on('pageerror', (e) => violations.push(String(e)));
    await applyCsp(page);
    await mockPlaceSearch(page);

    await page.goto('/');
    await page.getByLabel('Birth date').fill('1990-05-31');
    await page.getByLabel('Birth time').fill('15:30');
    await page.getByRole('combobox', { name: 'Birth place' }).fill('Carrascal');
    await page.getByRole('option', { name: 'Carrascal, Surigao del Sur, Philippines' }).click();
    await page.getByRole('button', { name: 'See my chart' }).click();

    const bigThree = page.getByRole('region', { name: 'Big Three' });
    const cards = bigThree.locator(':scope > ul > li');
    await expect(cards.nth(0)).toContainText('Gemini');
    await expect(cards.nth(1)).toContainText('Virgo');
    await expect(cards.nth(2)).toContainText('Scorpio');
    await expect(page.getByRole('img', { name: /Birth chart wheel/ })).toBeVisible();

    expect(violations).toEqual([]);
  });
});

test('share link opens the chart and removes birth data from the URL', async ({ page }) => {
  await page.goto(`/chart#${CARRASCAL_HASH}`);
  await expect(page.getByRole('heading', { name: 'Your Big Three' })).toBeVisible();
  await expect(page).toHaveURL(/\/chart$/);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your Big Three' })).toBeVisible();
});

test('free full reading opens from the chart, at the top, with no network calls', async ({
  page,
}) => {
  const external: string[] = [];
  page.on('request', (r) => {
    if (!r.url().startsWith('http://localhost')) external.push(r.url());
  });
  await page.goto(`/chart#${CARRASCAL_HASH}`);
  await page.getByRole('link', { name: 'Read your full reading' }).click();
  await expect(page.getByRole('heading', { name: 'Your full reading' })).toBeInViewport();
  await expect(page.getByRole('region', { name: 'Personality' })).toContainText('Sun in Gemini');
  await expect(page.getByRole('region', { name: 'Life Lessons' })).toContainText(
    'Pluto in Scorpio',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  expect(external).toEqual([]);
});

test('works offline after the first visit (service worker)', async ({ page, context }) => {
  await page.goto(`/chart#${CARRASCAL_HASH}`);
  await expect(page.getByRole('heading', { name: 'Your Big Three' })).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // Make sure the page is controlled by the active worker before going offline.
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your Big Three' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Big Three' })).toContainText('Scorpio');
});

test('PWA manifest and icons are served', async ({ request }) => {
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest.display).toBe('standalone');
  for (const icon of manifest.icons as { src: string }[]) {
    const res = await request.get(icon.src);
    expect(res.status(), icon.src).toBe(200);
    expect(res.headers()['content-type']).toContain('image/png');
  }
});
