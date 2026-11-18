/**
 * Post-build check: every inline <script> in dist/index.html must be allowed by a
 * 'sha256-…' source in dist/_headers' Content-Security-Policy. Fails the build otherwise.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const headers = readFileSync(new URL('../dist/_headers', import.meta.url), 'utf8');
const csp = /Content-Security-Policy:\s*(.+)/.exec(headers)?.[1] ?? '';
if (!csp) throw new Error('No Content-Security-Policy found in dist/_headers');

const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
  (m) => m[1],
);
let ok = true;
for (const body of inline) {
  const hash = `'sha256-${createHash('sha256').update(body).digest('base64')}'`;
  if (!csp.includes(hash)) {
    console.error(
      `CSP is missing ${hash} for an inline script in index.html. Update public/_headers.`,
    );
    ok = false;
  }
}
if (!ok) process.exit(1);
console.log(
  `CSP check OK (${inline.length} inline script${inline.length === 1 ? '' : 's'} allowed by hash)`,
);
