# Architecture — AstroVerse

## 1. High-level

```
Browser (React PWA on Cloudflare Pages)
 ├─ src/lib/astro/        pure TS engine — runs in the browser (fast, no server cost)
 ├─ Geocoding             → Open-Meteo Geocoding API (free, returns lat/lon/timezone)
 └─ Supabase client       → Auth, Postgres (RLS)
                          → Edge Functions:
                               generate-reading   (Claude API; caches results)
                               create-checkout    (PayMongo, Phase 3)
                               paymongo-webhook   (Phase 3)
```

Chart math runs **client-side** so the free tier is instant and costs nothing.
Only AI readings and payments touch the server.

## 2. Folder structure

```
astroverse/
├─ CLAUDE.md
├─ docs/
├─ src/
│  ├─ lib/
│  │  ├─ astro/
│  │  │  ├─ types.ts           shared types (Body, SignIndex, ChartPoint, Aspect, Chart…)
│  │  │  ├─ zodiac.ts          normalizeDeg, angleDiff, signOf, sign names
│  │  │  ├─ format.ts          display formatting (15°12' Taurus)
│  │  │  ├─ time.ts            local birth time + IANA zone → UTC (luxon)
│  │  │  ├─ positions.ts       planets, Moon, Sun, mean/true node (astronomy-engine)
│  │  │  ├─ angles.ts          sidereal time, Ascendant, Midheaven
│  │  │  ├─ houses.ts          Placidus + Whole Sign (+ Porphyry fallback)
│  │  │  ├─ aspects.ts         major aspects with orbs
│  │  │  ├─ transits.ts        2-year transit scanner
│  │  │  ├─ synastry.ts        cross-chart aspects (Phase 3)
│  │  │  ├─ uncertainty.ts     cusp + birth-time sensitivity flags
│  │  │  ├─ chart.ts           buildChart(input, {houseSystem, observedDst}) → Chart (single entry point)
│  │  │  ├─ *.test.ts          unit tests, next to each module
│  │  │  └─ __tests__/         fixtures.json (generated) + fixture helpers
│  │  ├─ interpret/
│  │  │  ├─ static/            JSON text: signs, houses, planets-in-signs, aspects
│  │  │  └─ buildPayload.ts    compact chart summary sent to the AI function
│  │  ├─ geo.ts                Open-Meteo geocoding client (PH-first ranking, "name, hint" queries)
│  │  ├─ display.ts            glyphs (text presentation, no emoji), labels, deg°min′ formatting
│  │  ├─ flags.ts              which uncertainty flags belong on Big Three cards
│  │  ├─ chartState.ts         router state type for form → /chart
│  │  ├─ birthForm.ts          form validation → BirthInput
│  │  ├─ shareLink.ts          encode/decode birth data in the URL fragment
│  │  ├─ supabase.ts           browser client (publishable key; null if env missing)
│  │  ├─ charts.ts             save/list/delete charts, row ↔ BirthInput mapping
│  │  ├─ database.types.ts     generated: npm run gen:types
│  │  └─ pendingChart.ts       chart to save after sign-in (this device, ≤1 h)
│  ├─ components/
│  │  ├─ BirthForm/            form + place autocomplete
│  │  ├─ BigThreeCard/
│  │  ├─ ChartWheel/           SVG wheel + wheelGeometry.ts (rotation, label spreading via PAVA)
│  │  ├─ AspectsList/
│  │  ├─ PlacementsTable/
│  │  ├─ ReadingView/
│  │  ├─ TransitTimeline/
│  │  └─ ui/                   SegmentedControl, UncertaintyNotes, …
│  ├─ pages/                   Home, Chart, Reading, Forecast, Compatibility, Account, Pricing
│  ├─ hooks/
│  └─ main.tsx
├─ supabase/
│  ├─ migrations/
│  └─ functions/
│     ├─ generate-reading/
│     ├─ create-checkout/
│     └─ paymongo-webhook/
├─ scripts/gen-fixtures.ts     dev-only Swiss Ephemeris (sweph, AGPL) fixture generator; never bundled
├─ public/ (icons, manifest.webmanifest, fonts)
├─ .env.example
└─ package.json
```

## 3. Core types (src/lib/astro/types.ts)

```ts
export type Body = 'Sun'|'Moon'|'Mercury'|'Venus'|'Mars'|'Jupiter'|'Saturn'
  |'Uranus'|'Neptune'|'Pluto'|'NorthNode';
export type Angle = 'Ascendant'|'Midheaven';
export type PointName = Body | Angle;
export type HouseSystemChoice = 'placidus'|'whole-sign';      // what the user can pick
export type HouseSystem = HouseSystemChoice | 'porphyry';      // porphyry = auto fallback >66°
export type TimeAccuracy = 'exact'|'approximate'|'unknown';

export interface BirthInput {
  date: string;            // 'YYYY-MM-DD'
  time: string | null;     // 'HH:mm' local, null if unknown
  timeAccuracy: TimeAccuracy;
  place: { name: string; lat: number; lon: number; tz: string }; // tz = IANA
}

export interface ChartPoint {
  name: PointName;
  longitude: number;       // 0–360 tropical, ecliptic of date
  sign: number;            // 0 = Aries … 11 = Pisces
  degreeInSign: number;    // 0–30
  house: number | null;    // 1–12, null if time unknown
  retrograde: boolean;
  speed: number;           // degrees/day
}

export interface Aspect {
  a: PointName; b: PointName;
  type: 'conjunction'|'sextile'|'square'|'trine'|'opposition';
  orb: number; applying: boolean;
}

export interface UncertaintyFlag {
  point: PointName | null; // null = chart-wide (e.g. DST ambiguity)
  kind: 'sign-cusp'|'house-cusp'|'time-unknown'
      |'dst-ambiguous'|'house-system-fallback'|'moon-sign-change';
  message: string;         // human-readable, e.g. "Rising may be Libra if born before ~3:00 PM"
}

export interface Chart {
  input: BirthInput;
  utc: string;             // ISO
  points: ChartPoint[];
  houses: { system: HouseSystem; cusps: number[] } | null; // 12 longitudes
  aspects: Aspect[];
  flags: UncertaintyFlag[];
}
```

## 4. Database (Supabase Postgres)

```sql
profiles   (id uuid pk = auth.users.id, display_name text, locale text default 'en',
            created_at timestamptz)

charts     (id uuid pk, user_id uuid fk → profiles, label text,
            birth_date date, birth_time time null, time_accuracy text,
            place_name text, lat double precision, lon double precision, tz text,
            is_self boolean default false, consent_confirmed boolean default false,
            created_at timestamptz)

readings   (id uuid pk, chart_id uuid fk → charts on delete cascade,
            kind text check (kind in ('natal','forecast','career','synastry')),
            input_hash text,          -- hash of chart payload + prompt version
            content jsonb,            -- structured sections
            model text, prompt_version text, created_at timestamptz,
            unique (chart_id, kind, input_hash))

purchases  (id uuid pk, user_id uuid, chart_id uuid, product text,
            amount_centavos int, status text, paymongo_ref text, created_at timestamptz)
```

- Implemented in `supabase/migrations/20261118000000_profiles_charts_readings.sql` (M7).
- RLS enabled on all tables: `user_id = auth.uid()` (readings via join to charts). `anon` has no
  table privileges at all; `authenticated` may read/update only `display_name`/`locale` on its
  profile, CRUD its own charts, and **read/delete** (never write) its readings — readings are
  written only by Edge Functions with the service role.
- Constraints: consent required for others' charts (`is_self or consent_confirmed`), birth time
  present iff accuracy ≠ unknown, dates 1900–2100, lat/lon ranges, label 1–60 chars, at most one
  `is_self` chart per user, readings unique per (chart, kind, input_hash), `on delete cascade`
  from charts to readings. Profiles are created by a `security definer` trigger on sign-up.
- Tests: `supabase/tests/database/rls.test.sql` (pgTAP, 31 checks) and
  `src/lib/charts.integration.test.ts` (app data layer with two real users); `npm run test:db`.
- `purchases` rows are inserted/updated only by the webhook function (service role).

## 5. Edge Function: generate-reading
1. Verify the user's JWT; load the chart (RLS) and check entitlement (free vs premium kind).
2. Recompute nothing server-side — the client sends the compact payload from
   `buildPayload.ts`; the function validates it with zod and recomputes `input_hash`.
3. If a cached reading with that hash exists → return it.
4. Else call Claude with the system prompt in INTERPRETATION.md, ask for JSON sections,
   validate, store, return.
5. Rate limit: 20 generations per user per day.

## 6. Environment variables (.env.example)
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
# Supabase function secrets (set with `supabase secrets set`):
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=
PAYMONGO_SECRET_KEY=
PAYMONGO_WEBHOOK_SECRET=
```

## 7. Deployment
- Cloudflare (Workers with static assets, Git-connected; classic Pages works the same): build
  `npm run build`, output `dist`, SPA fallback to `index.html` (verified live for `/chart`). Node from `.nvmrc`. Headers/CSP in `public/_headers`, verified
  after each build by `scripts/check-csp.mjs`; e2e tests apply the same CSP.
- Service worker: `sw/sw.js` template → `dist/sw.js` via `scripts/vite-sw-plugin.ts`
  (precache = public shell + hashed assets, version = hash of that list). Navigations are
  network-first with cached shell fallback; same-origin assets cache-first; cross-origin
  (Open-Meteo, analytics) untouched.
- Share links: birth data lives in the URL fragment; ChartPage moves it into router state and
  clears the fragment after reading.
- Analytics: Cloudflare Web Analytics, enabled in the dashboard (auto-injected, cookie-free).
- Supabase: `supabase db push`, `supabase functions deploy <name>`
- PWA: manifest + service worker caching the app shell (charts work offline once loaded)
