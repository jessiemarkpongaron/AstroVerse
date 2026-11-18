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
- [ ] Cloudflare Pages deploy (owner connects repo in dashboard)
- [x] SPA fallback, PWA manifest + service worker, `_headers` (CSP, caching), e2e tests
- [ ] Basic analytics (Cloudflare Web Analytics — enable in dashboard; see README)

## Phase 2 — Accounts, AI readings, forecast

### M7. Supabase
- [ ] Migrations for profiles, charts, readings (+ RLS policies + tests for RLS)
- [ ] Auth: magic link + Google; "Save chart"; "My charts" page; delete chart

### M8. AI natal reading
- [ ] Static interpretation JSON (draft in batches, I review)
- [ ] `buildPayload.ts`, `generate-reading` Edge Function, zod schemas, caching, rate limit
- [ ] Reading page with sections, loading skeleton, error state

### M9. Forecast & career
- [ ] `transits.ts` scanner + tests (known transit windows)
- [ ] Transit timeline UI grouped by theme
- [ ] AI forecast + career readings

## Phase 3 — Monetize & grow

### M10. Compatibility
- [ ] `synastry.ts`, two-chart UI, consent checkbox, AI synastry reading

### M11. Payments (PayMongo)
- [ ] `create-checkout` + `paymongo-webhook` functions (signature verification)
- [ ] `purchases` table, entitlement checks, Pricing page, receipt email

### M12. Growth
- [ ] Shareable Big Three image (1080×1350)
- [ ] Filipino/Taglish locale for UI + readings
- [ ] SEO pages: "/signs/gemini", "/rising/scorpio" etc. (static, prerendered)
- [ ] Daily/weekly horoscope (optional, generated + cached once per sign per day)
