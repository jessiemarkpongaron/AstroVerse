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
  expect(sitemap.match(/<url>/g)).toHaveLength(38);
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
