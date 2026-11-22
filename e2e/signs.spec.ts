import { expect, test } from '@playwright/test';
import { applyCsp } from './helpers.ts';

test('sign pages are pre-rendered: real content and meta tags before any JavaScript', async ({
  request,
}) => {
  const html = await (await request.get('/signs/gemini')).text();
  expect(html).toContain(
    '<title>Gemini Sun Sign: Traits, Strengths &amp; Dates | AstroVerse</title>',
  );
  expect(html).toContain(
    '<link rel="canonical" href="https://astroverse.digitalverseph.com/signs/gemini" />',
  );
  expect(html).toMatch(/<h1[^>]*>.*Gemini.*Sun<\/h1>/);
  expect(html).toContain('May 21 – June 20');

  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap.match(/<url>/g)).toHaveLength(52);
  expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap: ');
});

test.describe('with production CSP', () => {
  test.use({ serviceWorkers: 'block' });

  test('sign page runs the app with no errors and links to the chart form', async ({ page }) => {
    const problems: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') problems.push(m.text());
    });
    page.on('pageerror', (e) => problems.push(String(e)));
    await applyCsp(page);

    await page.goto('/rising/scorpio');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Scorpio\s*Rising/);
    await page.getByRole('link', { name: 'Scorpio Sun' }).click();
    await expect(page).toHaveURL(/\/signs\/scorpio$/);
    await expect(page).toHaveTitle('Scorpio Sun Sign: Traits, Strengths & Dates | AstroVerse');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await page.getByRole('link', { name: 'Get your free birth chart' }).click();
    await expect(page.getByRole('button', { name: 'See my chart' })).toBeVisible();
    expect(problems).toEqual([]);
  });
});

test.describe('horoscope', () => {
  test.use({ serviceWorkers: 'block' });

  test('pre-rendered shell has no stale text; the page fills in today on the device', async ({
    page,
    request,
  }) => {
    const html = await (await request.get('/horoscope/gemini')).text();
    expect(html).toContain('<title>Gemini Horoscope Today &amp; This Week | AstroVerse</title>');
    expect(html).toContain('Loading today’s horoscope');
    expect(html).not.toContain('Today ·');

    const problems: string[] = [];
    page.on('pageerror', (e) => problems.push(String(e)));
    await applyCsp(page);
    await page.goto('/horoscope');
    await page.getByRole('link', { name: /Gemini/ }).click();
    await expect(page.getByRole('heading', { name: /^Today · / })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^This week · / })).toBeVisible();
    await expect(
      page.getByText(/^The Moon is in \w+, the \d+\w\w house counted from Gemini\.$/),
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    expect(problems).toEqual([]);
  });
});

test('support page shows the QR image and it can be saved', async ({ page, request }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Support AstroVerse' }).click();
  const img = page.getByRole('img', { name: /InstaPay QR code for AstroVerse DigitalVersePH/ });
  await expect(img).toBeVisible();
  expect(await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBe(720);
  const res = await request.get('/images/gcash-qr.png');
  expect(res.headers()['content-type']).toContain('image/png');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
});

test('signed-out visitors land on the login page and can skip to the form', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Welcome to AstroVerse' })).toBeVisible();
  await page.getByRole('link', { name: 'Continue without an account' }).click();
  await expect(page).toHaveURL(/\/start$/);
  await expect(page.getByRole('button', { name: 'See my chart' })).toBeVisible();
});

test('privacy page is pre-rendered and linked from the footer and login page', async ({
  page,
  request,
}) => {
  const html = await (await request.get('/privacy')).text();
  expect(html).toContain('<title>Privacy | AstroVerse</title>');
  expect(html).toContain('Delete my account');
  await page.goto('/login');
  await page.getByRole('link', { name: 'How we handle your data' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy' })).toBeVisible();
  await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Privacy' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
});
