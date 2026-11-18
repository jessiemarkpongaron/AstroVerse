import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';

/** Trimmed real Open-Meteo response (captured 2026-11-18). */
export const CARRASCAL_RESULTS = {
  results: [
    {
      id: 3126210,
      name: 'Carrascal',
      latitude: 41.48478,
      longitude: -5.8121,
      country_code: 'ES',
      country: 'Spain',
      admin1: 'Castille and León',
      timezone: 'Europe/Madrid',
    },
    {
      id: 1718262,
      name: 'Carrascal',
      latitude: 9.37028,
      longitude: 125.94917,
      country_code: 'PH',
      country: 'Philippines',
      admin1: 'Caraga',
      admin2: 'Province of Surigao del Sur',
      timezone: 'Asia/Manila',
      population: 4385,
    },
  ],
};

export async function mockPlaceSearch(page: Page) {
  await page.route('https://geocoding-api.open-meteo.com/**', (route) =>
    route.fulfill({ json: CARRASCAL_RESULTS }),
  );
}

/** The site-wide CSP from public/_headers (the `/*` block). */
export function siteCsp(): string {
  const headers = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
  const csp = /Content-Security-Policy:\s*(.+)/.exec(headers)?.[1];
  if (!csp) throw new Error('CSP not found in public/_headers');
  return csp.trim();
}

/** Serve same-origin responses with the production CSP (vite preview ignores _headers). */
export async function applyCsp(page: Page) {
  const csp = siteCsp();
  await page.route('http://localhost:4173/**', async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: { ...response.headers(), 'content-security-policy': csp },
    });
  });
}

export const CARRASCAL_HASH =
  'd=1990-05-31&t=15%3A30&a=exact&p=Carrascal%2C+Surigao+del+Sur%2C+Philippines&lat=9.37028&lon=125.94917&tz=Asia%2FManila';
