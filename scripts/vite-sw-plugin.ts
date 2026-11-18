import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';

/** Public files to precache in addition to the bundle (paths as served). */
const PUBLIC_PRECACHE = [
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

/**
 * Emits dist/sw.js from sw/sw.js with the list of built assets to precache and a version
 * derived from their names (hashed), so each deploy gets a fresh cache.
 */
export function swPlugin(): Plugin {
  return {
    name: 'astroverse-sw',
    apply: 'build',
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle)
        .filter((f) => f.startsWith('assets/'))
        .sort()
        .map((f) => `/${f}`);
      const precache = [...PUBLIC_PRECACHE, ...assets];
      const version = createHash('sha256').update(precache.join('\n')).digest('hex').slice(0, 12);
      let source = readFileSync(new URL('../sw/sw.js', import.meta.url), 'utf8');
      for (const [token, value] of [
        ["'__VERSION__'", JSON.stringify(version)],
        ['__PRECACHE__', JSON.stringify(precache)],
      ] as const) {
        const count = source.split(token).length - 1;
        if (count !== 1) this.error(`sw/sw.js must contain ${token} exactly once (found ${count})`);
        source = source.replace(token, value);
      }
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}
