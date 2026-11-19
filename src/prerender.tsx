/* eslint-disable react-refresh/only-export-components -- build-time entry, never hot-reloaded */
/**
 * Build-time entry (vite build --ssr): renders the public sign pages to HTML so search engines
 * and link previews see real content. Used only by scripts/prerender.mjs; never shipped.
 */
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { App } from './App.tsx';
import {
  SIGNS_INDEX_META,
  SIGN_PAGE_KINDS,
  SITE_URL,
  ALL_SIGNS,
  signPageMeta,
  HOROSCOPE_INDEX_META,
  horoscopeMeta,
  type PageMeta,
} from './lib/signPages.ts';

export { SITE_URL };

export function pages(): PageMeta[] {
  return [
    SIGNS_INDEX_META,
    ...SIGN_PAGE_KINDS.flatMap((k) => ALL_SIGNS.map((s) => signPageMeta(k, s))),
    HOROSCOPE_INDEX_META,
    ...ALL_SIGNS.map(horoscopeMeta),
  ];
}

export function render(path: string): string {
  return renderToString(
    <StaticRouter location={path}>
      <App />
    </StaticRouter>,
  );
}
