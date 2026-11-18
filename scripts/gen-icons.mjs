/**
 * Dev-only: render scripts/icon.svg to PNG app icons in public/icons (uses Playwright Chromium).
 *   node scripts/gen-icons.mjs
 * Full-bleed background, so the same art works as a maskable icon (content stays in the
 * central 80% safe zone).
 */
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const svg = readFileSync(new URL('./icon.svg', import.meta.url), 'utf8');
const sizes = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['maskable-512.png', 512],
  ['apple-touch-icon.png', 180],
];
const browser = await chromium.launch();
for (const [name, size] of sizes) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<html><body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`,
  );
  await page.screenshot({ path: new URL(`../public/icons/${name}`, import.meta.url).pathname });
  await page.close();
}
await browser.close();
console.log('icons written to public/icons');
