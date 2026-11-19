# Roadmap — AstroVerse

Work top to bottom. A milestone is done only when typecheck, lint and tests pass and
its acceptance items are checked.

## Phase 1 — Free chart (MVP)

### M1. Project setup
- [x] Vite + React + TS (strict) + Tailwind + React Router + ESLint + Prettier + Vitest
- [x] Scripts: dev, build, typecheck, lint, test
- [x] `.env.example`, `README.md` with setup steps
- [x] Base layout: header, footer with disclaimer, dark/light theme

### M2. Astro engine — positions & angles
- [x] `types.ts`, `time.ts` (luxon), `positions.ts` (astronomy-engine), `angles.ts`
- [x] Mean North Node, speeds, retrograde
- [x] Fixtures file with ≥ 6 reference charts (see ASTRO_ENGINE §9) — **ask me to
      supply/confirm reference values if you can't fetch them**
- [x] Tests pass within tolerances

### M3. Astro engine — houses, aspects, uncertainty
- [x] Whole Sign + Placidus (+ Porphyry fallback), house assignment
- [x] Aspects with orbs/applying
- [x] Uncertainty flags incl. bisection for switch times
- [x] `buildChart(input)` single entry point + tests

### M4. Birth form + geocoding
- [x] Open-Meteo geocoding autocomplete (debounced, PH results ranked first)
- [x] Time accuracy selector, validation, shareable links with birth data in the URL
      fragment only (`/chart#d=…&t=…&a=…&p=…&lat=…&lon=…&tz=…`; never the person's name)
- [x] Acceptance: Carrascal example from PRD F1 works

### M5. Chart UI
- [x] Big Three card with cusp warnings
- [x] Placements table (sign, deg°min', house, ℞) + aspects list
- [x] SVG chart wheel (signs ring, house lines, planet glyphs with collision spacing, aspect lines)
- [x] House system toggle
- [x] Static short reading (Big Three + planet-in-sign snippets)
- [x] Mobile check at 360px; Lighthouse ≥ 90 performance/accessibility
      (2026-11-18, mobile profile: home 100/100, chart 97/100; chart page lazy-loaded)

### M6. Deploy Phase 1
- [x] Cloudflare deploy (2026-11-18): Workers static assets, Git-connected, custom domain
      **https://astroverse.digitalverseph.com**. Live check passed — TLS, headers/CSP, `/chart`
      deep link, SW offline reload, PRD F1. Pending: "Always Use HTTPS" redirect (dashboard).
- [x] SPA fallback, PWA manifest + service worker, `_headers` (CSP, caching), e2e tests
- [x] Basic analytics (Cloudflare Web Analytics, enabled 2026-11-18). Verified: beacon allowed by
      CSP; RUM payload records `/chart` only — no fragment, no birth data

## Phase 2 — Accounts, AI readings, forecast

### M7. Supabase
- [x] Migrations for profiles, charts, readings (+ RLS policies + tests for RLS) — local stack
- [x] Migration applied to the hosted project via SQL Editor (2026-11-18); verified anon gets
      `42501 permission denied` on all three tables. When the CLI is linked, run
      `npx supabase migration repair --status applied 20261118000000` before the next `db push`.
- [x] Auth UI: magic link + Google; "Save chart" (consent for others); "My charts"; delete chart
- [x] Hosted config: Cloudflare build variables `VITE_SUPABASE_*` (verified in live bundle; only the
      publishable key ships), Supabase Auth URLs
- [x] Owner end-to-end test on the live site: magic-link sign-in, save, My charts, delete
      (2026-11-18)
- [ ] Google OAuth client (optional) · custom SMTP (before real users)

### M8. Natal reading — free (static) done; AI built, switched off
- [x] Static interpretation JSON: `bigThree.json` + `planetInSign.json` (approved)
- [x] `buildPayload.ts` (structured flags, no free text), `generate-reading` Edge Function,
      shared zod schemas, cache by input hash, 20/day rate limit (`reading_generations`)
- [x] Reading page with sections, loading skeleton, error state; links from My charts and
      after saving a chart
- [x] Local end-to-end (`npm run test:db`) with a mock Claude API
- [x] **Free full reading** from static text at `/reading` (owner decision 2026-11-18: no API
      cost). Links from the chart page, My charts and after saving. AI reading hidden behind
      `VITE_AI_READINGS` until API credits exist (then premium).
- [x] Static text batches for the free reading, each owner-reviewed (2026-11-18):
      planet-in-house (120), Midheaven + North Node by sign (24), aspects (5 templates + 13
      themes). The free reading now covers all 8 sections.
- **M8 done (2026-11-18)** except the AI go-live below.
- [ ] Later, with API credits: run migration `20261118120000_reading_generations.sql`, set
      `ANTHROPIC_API_KEY`, deploy the function, set `VITE_AI_READINGS=true`, review first reading

### M9. Forecast & career — done (2026-11-18), free and static
- [x] `transits.ts` scanner + tests (Swiss Ephemeris reference dates: Pluto at 0° Aquarius,
      Saturn/Jupiter ingresses incl. retrograde, 2020 great conjunction; ±1 day)
- [x] Forecast page `/forecast`: "Happening now", periods grouped by 6 themes with dates, exact
      hits and "how to use this time", planets changing house (`forecast.json`, approved)
- [x] Career page `/career` (PRD F6): Midheaven + 10th/6th/2nd-house planets, work style by
      element, Mars/Saturn, strengths, 5 paths, timing from career-themed transits
      (`career.json`, approved). House rulers left out for now (owner decision).
- [ ] Later, with API credits: AI forecast + career readings (premium)

## Phase 3 — Monetize & grow

### M10. Compatibility — done (2026-11-18), free and static
- [x] `synastry.ts` + tests: cross-aspects (Sun–Saturn + Rising), tighter orbs, key contacts
      (Venus–Mars, Sun–Moon, Moon–Moon, Rising links); Moon/Rising left out without a birth time
- [x] Page `/compatibility`: compare with a saved chart, or enter details behind a permission
      checkbox; runs on the device, nothing sent or saved
- [x] Harmony / Growth areas / Challenges with Strong/Some/Light (never a %), up to 5 contacts
      each (`synastry.json`, approved), respect note and disclaimer
- [ ] Later, with API credits: AI synastry reading (premium)

### M11. Payments (PayMongo)
- [ ] `create-checkout` + `paymongo-webhook` functions (signature verification)
- [ ] `purchases` table, entitlement checks, Pricing page, receipt email

### M12. Growth
- [x] Shareable Big Three image (1080×1350): signs + 3 keywords, no birth data; made on the
      device, shared via the share sheet or downloaded
- [ ] Filipino/Taglish locale for UI + readings
- [x] SEO pages: `/signs`, `/signs/gemini`, `/moon/virgo`, `/rising/scorpio` (37 pages, approved
      Big Three text, Sun sign dates from astronomy-engine), pre-rendered at build with
      canonical/OG tags, `sitemap.xml`, `robots.txt`
- [ ] Daily/weekly horoscope (optional, generated + cached once per sign per day)
