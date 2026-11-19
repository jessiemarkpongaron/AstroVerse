/**
 * Post-build: writes static HTML for the public sign pages (dist/signs/gemini.html is served at
 * /signs/gemini), plus sitemap.xml and robots.txt. Uses the SSR bundle built from
 * src/prerender.tsx into .ssr/. The client app then renders the same page over it.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const dist = new URL('../dist/', import.meta.url);
const ssr = new URL('../.ssr/prerender.js', import.meta.url);
const { pages, render, SITE_URL } = await import(ssr.href);

const template = readFileSync(new URL('index.html', dist), 'utf8');
const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function page(meta) {
  const url = `${SITE_URL}${meta.path}`;
  const head = [
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:site_name" content="AstroVerse" />`,
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
  ].join('\n    ');
  let html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
      `<meta name="description" content="${esc(meta.description)}" />`,
    )
    .replace('  </head>', `    ${head}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${render(meta.path)}</div>`);
  for (const must of [meta.title, '<link rel="canonical"', 'id="root"><']) {
    if (!html.includes(must.startsWith('<') || must.startsWith('id') ? must : esc(must))) {
      throw new Error(`Pre-render of ${meta.path} is missing ${must}`);
    }
  }
  return html;
}

const all = pages();
for (const meta of all) {
  const file = new URL(`.${meta.path}.html`, dist);
  mkdirSync(dirname(file.pathname), { recursive: true });
  writeFileSync(file, page(meta));
}

const urls = ['/', ...all.map((m) => m.path)];
writeFileSync(
  new URL('sitemap.xml', dist),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${SITE_URL}${u === '/' ? '/' : u}</loc></url>`)
    .join('\n')}\n</urlset>\n`,
);
writeFileSync(
  new URL('robots.txt', dist),
  `User-agent: *\nDisallow: /chart\nDisallow: /charts\nDisallow: /auth/\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
);
rmSync(new URL('../.ssr/', import.meta.url), { recursive: true, force: true });
console.log(`Pre-rendered ${all.length} pages + sitemap.xml (${urls.length} URLs) + robots.txt`);
