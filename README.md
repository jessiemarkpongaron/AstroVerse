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

| Command             | What it does                    |
| ------------------- | ------------------------------- |
| `npm run dev`       | Vite dev server                 |
| `npm run build`     | Type-check + production build   |
| `npm run typecheck` | `tsc` (no emit)                 |
| `npm run lint`      | ESLint                          |
| `npm run format`    | Prettier (write)                |
| `npm test`          | Vitest (unit + component tests) |

## Project layout

- `src/lib/astro/` — pure TypeScript astrology engine (no React, no network)
- `src/components/`, `src/pages/`, `src/hooks/` — UI
- `scripts/` — dev-only tools (e.g. fixture generation with Swiss Ephemeris; never bundled)
- `docs/` — PRD, architecture, engine spec, interpretation guide, roadmap

## Notes

- Tests for engine code sit next to the source (`*.test.ts`); shared fixture data lives in
  `src/lib/astro/__tests__/fixtures.json`.
- Component tests opt into jsdom with `// @vitest-environment jsdom` at the top of the file.
