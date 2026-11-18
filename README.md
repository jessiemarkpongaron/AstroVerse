# AstroVerse

Astrology web app for Filipino users: birth chart, Big Three, readings, transits,
compatibility and career themes. See `CLAUDE.md` and `docs/` for the full spec.

## Requirements

- Node.js ≥ 22.12 (developed on 22.23)
- npm ≥ 10

## Setup

```bash
npm install
cp .env.example .env.local   # fill in values; never commit .env.local
npm run dev                  # http://localhost:5173
```

Phase 1 needs no secrets: the chart engine runs in the browser and geocoding uses
the public Open-Meteo API. Supabase/Anthropic/PayMongo values are for Phase 2+, and
server-side secrets go in Supabase function secrets, never in `VITE_*` vars.

## Scripts

| Command                | What it does                                            |
| ---------------------- | ------------------------------------------------------- |
| `npm run dev`          | Vite dev server                                         |
| `npm run build`        | Type-check + production build                           |
| `npm run typecheck`    | `tsc` (no emit)                                         |
| `npm run lint`         | ESLint                                                  |
| `npm run format`       | Prettier (write)                                        |
| `npm test`             | Vitest (unit + component tests)                         |
| `npm run test:e2e`     | Playwright e2e on the production build (360px Chromium) |
| `npm run gen:fixtures` | Regenerate engine fixtures (Swiss Ephemeris, dev-only)  |

## Project layout

- `src/lib/astro/` — pure TypeScript astrology engine (no React, no network)
- `src/components/`, `src/pages/`, `src/hooks/` — UI
- `scripts/` — dev-only tools (e.g. fixture generation with Swiss Ephemeris; never bundled)
- `docs/` — PRD, architecture, engine spec, interpretation guide, roadmap

## Notes

- Tests for engine code sit next to the source (`*.test.ts`); shared fixture data lives in
  `src/lib/astro/__tests__/fixtures.json`.
- Component tests opt into jsdom with `// @vitest-environment jsdom` at the top of the file.

## Accounts (Supabase)

Local development uses the Supabase CLI (Docker required):

```bash
npx supabase start -x studio,imgproxy,edge-runtime,logflare,vector,realtime,storage-api,mailpit,postgres-meta,supavisor
npm run test:db      # pgTAP RLS tests + app integration test against the local stack
npm run gen:types    # regenerate src/lib/database.types.ts after schema changes
npx supabase stop
```

To point the dev server at the local stack, put its `API_URL` and `ANON_KEY` (from
`npx supabase status`) in `.env.local` as `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
Local Google sign-in needs `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `_SECRET` in
`supabase/.env` (git-ignored) and `enabled = true` under `[auth.external.google]`.

Hosted project setup (once):

1. `npx supabase login`, `npx supabase link --project-ref <ref>`, `npx supabase db push`.
2. Supabase → Authentication → URL Configuration: Site URL = the live domain; Redirect URLs =
   `https://<live domain>/auth/callback` and `http://localhost:5173/auth/callback`.
3. Google: Google Cloud Console → OAuth client (Web). Authorized redirect URI =
   `https://<ref>.supabase.co/auth/v1/callback`. Paste the client ID/secret into Supabase →
   Authentication → Providers → Google.
4. Email: Supabase's built-in email sender is heavily rate-limited; configure custom SMTP
   (Authentication → Emails → SMTP) before launch.
5. Cloudflare build env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (publishable key), then
   redeploy. The CSP in `public/_headers` already allows the project's `*.supabase.co` origin.

## Deploy (Cloudflare)

Live: **https://astroverse.digitalverseph.com** (custom domain on the `digitalverseph.com` Cloudflare
zone). The site runs as a Cloudflare **Worker with static assets** connected to this repo (the
newer default; `_headers` and SPA fallback behave as on Pages). Classic Pages setup:

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → pick this repo.
2. Build settings: production branch `main`, build command `npm run build`, output `dist`.
   Node version comes from `.nvmrc` (22).
3. Environment variables (Production and Preview): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   (publishable key). Never put secret/service-role keys here. `VITE_*` values are baked in at
   build time — redeploy after changing them.
4. Every push to `main` deploys; pull requests get preview URLs.

What ships with the build:

- **SPA routing:** Pages serves `index.html` for unknown paths (we have no `404.html`).
- **`public/_headers`:** security headers + Content-Security-Policy, immutable caching for
  `/assets/*`. The inline theme script is allowed by hash; `npm run build` fails if it drifts
  (`scripts/check-csp.mjs`). Add new third-party origins (e.g. Supabase in Phase 2) to the CSP.
- **PWA:** `manifest.webmanifest`, icons (`node scripts/gen-icons.mjs` regenerates them from
  `scripts/icon.svg`) and `dist/sw.js` (generated by `scripts/vite-sw-plugin.ts` with a
  versioned precache). Charts work offline after the first visit; place search needs a network.

### Analytics

Enable **Cloudflare Web Analytics** in the dashboard (Pages project → Metrics → Web Analytics →
Enable). Cloudflare injects the beacon automatically; it is cookie-free and needs no code here.
The CSP already allows `static.cloudflareinsights.com` and `cloudflareinsights.com`.

Privacy check after enabling: share links put birth data in the URL fragment, and the chart page
removes it from the address bar as soon as it has read it. Open a share link with DevTools →
Network, find the beacon request to `cloudflareinsights.com`, and confirm its payload has no `#d=`.
