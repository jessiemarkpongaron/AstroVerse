# CLAUDE.md — AstroVerse

Astrology web app: birth chart (natal), "Big Three", full planet/house reading,
future reading (transits), compatibility, and career themes. Built for Filipino users
(English only, in simple, warm language). Part of the DigitalVerse Solutions product line.

## Read first
- `docs/PRD.md` — what we're building and why, features, acceptance criteria
- `docs/ARCHITECTURE.md` — stack, folders, data model, APIs
- `docs/ASTRO_ENGINE.md` — calculation rules, formulas, validation fixtures
- `docs/INTERPRETATION.md` — how readings are written (static text + AI), guardrails
- `docs/ROADMAP.md` — phases and milestones; work in this order

## Stack
- Frontend: React 18 + Vite + TypeScript (strict) + Tailwind CSS + React Router
- Astronomy: `astronomy-engine` (MIT) for planet positions; houses computed in our own code
- Dates/timezones: `luxon` (IANA zones, historical offsets)
- Backend: Supabase (Postgres, Auth, Row Level Security, Edge Functions)
- AI readings: Claude API, called ONLY from a Supabase Edge Function (never from the browser)
- Payments (Phase 3): PayMongo (GCash, Maya, cards) via Edge Function + webhook
- Hosting: Cloudflare Pages
- Tests: Vitest; Playwright for a few end-to-end flows

## Commands
- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — ESLint
- `npm test` — Vitest (must pass before any milestone is "done")
- `npx supabase functions serve` — run Edge Functions locally

## Rules
1. **Engine first.** `src/lib/astro/` is pure TypeScript with no React, no network, and
   full unit tests. UI only consumes its typed outputs.
2. **Never compute astronomy from memory.** Use `astronomy-engine` functions. If unsure of an
   API, read `node_modules/astronomy-engine/astronomy.d.ts`.
3. **All times go through UTC.** Convert local birth time → UTC with luxon using the
   birthplace's IANA zone (historical rules). Never assume the browser's timezone.
   **Exception:** Philippine births (`Asia/Manila`) use UTC+8 standard time; tzdb's historical
   PH DST periods are ignored by default (1942–45 occupation time is kept). See `time.ts`.
4. **Show uncertainty.** If birth time is unknown or approximate, flag anything that depends
   on it (Ascendant, houses, Moon near a sign edge, any body within 1° of a cusp).
5. **Secrets** live in `.env.local` / Supabase secrets. Keep `.env.example` current.
   The Claude API key is never shipped to the client.
6. **Readings are entertainment/reflection, not advice.** Follow the guardrails in
   `docs/INTERPRETATION.md` for every prompt and every static text.
7. **Privacy.** Birth data is personal. RLS on every table; users only see their own rows.
   Saved charts of other people require the user to confirm they have permission.
8. Mobile-first UI (most users are on phones). Test at 360px width.
9. Small, focused commits. Update docs when behavior changes.

## Code style
- Functional React components + hooks; no class components
- Named exports; one component per file; colocate tests as `*.test.ts`
- Degrees are always `number` in [0, 360); sign index 0 = Aries … 11 = Pisces
- Use the shared types in `src/lib/astro/types.ts` everywhere
