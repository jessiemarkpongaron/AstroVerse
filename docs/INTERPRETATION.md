# Interpretation Spec — AstroVerse

Readings come from two layers:
1. **Static text** (free, instant, offline): short meanings for every sign, planet, house,
   planet-in-sign, planet-in-house and aspect type, stored as JSON in `src/lib/interpret/static/`.
2. **AI synthesis** (premium, cached): Claude weaves the static facts into a personal,
   flowing reading via the `generate-reading` Edge Function.

## 1. Static text
- Files: `signs.json`, `planets.json`, `houses.json`, `planetInSign.json` (10 × 12),
  `planetInHouse.json` (10 × 12), `pointInSign.json` (Midheaven, North Node),
  `aspects.json` (template per aspect type + a theme per point),
  `bigThree.json` (Sun/Moon/Rising meaning per sign, 2–3 sentences each).
- Tone: warm, clear, simple English (Grade 8 level). Second person ("You…").
- Every entry has `strengths`, `challenges`, `keywords` (3–5) so the UI can show chips.
- Write original text. Do not copy from books or websites.
- Have Claude Code draft them in batches of one planet at a time; review before committing.
- **Status (2026-11-18):** `bigThree.json` (36) and `planetInSign.json` Mercury–Pluto (96) are
  written and owner-approved; each planet's review status is stored in the file.
  `planetInHouse.json` (120, all ten planets), `pointInSign.json` (Midheaven + North Node, 24)
  and `aspects.json` (5 aspect templates + 13 point themes) are approved too. Only `approved`
  batches appear in the app; new batches go in as `draft` first.
- **Free full reading** (`src/lib/interpret/staticReading.ts`, page `/reading`): the same 8
  themes as the AI reading. Each section combines the approved entries for its placements —
  Big Three, planet in sign, planet in house, Midheaven/North Node by sign — plus up to 2 close
  aspects (orb ≤ 3°) anchored on the section's planets (no outer–outer or angle–angle pairs;
  each aspect used once). House, Rising and Midheaven texts are skipped without a birth time.
- **Aspects** use one template per type with the two points' themes filled in
  (`aspectEntry`), e.g. "Your way of loving and your sense of responsibility may pull against
  each other…". Themes contain no "and" so joined sentences read cleanly (tested).
- Extra guardrail tests: 2nd/8th-house texts avoid money/luck/inheritance wording; 5th/6th-house
  texts avoid health and pregnancy wording; Venus/Mars never present jealousy or control as
  romantic; Saturn houses point to growth; outer-planet 8th/12th houses avoid loss/crisis
  wording; Midheaven suggests rather than promises; North Node avoids destiny/fate/karma; every
  one of the 780 filled-in aspect sentences passes the style checks.
- `planetInSign.json` snippets are **1–2 sentences**. Uranus/Neptune/Pluto stay in a sign for
  years, so their snippets are framed around **your generation** plus one personal line.
- Guardrail tests (`src/lib/interpret/staticText.test.ts`) enforce: sentence counts, second
  person, 3–5 keywords, ≥2 strengths/challenges, no duplicate text, banned topics (death,
  illness, pregnancy, lotto/lucky numbers, gambling, investing, guarantees, diagnoses);
  Jupiter: no luck/money/fortune/win wording; Saturn: no fatalistic wording and must point to
  growth; outer planets: must mention "generation".

- **Forecast** (`forecast.json`, `src/lib/interpret/forecast.ts`, page `/forecast`): one
  meaning + "how to use this time" per transiting planet × tone (conjunction / flowing =
  trine·sextile / tense = square·opposition), filled with the natal point's theme from
  `aspects.json`; 12 house topics and ingress lines. Periods are grouped into six themes by
  `transitTheme` (natal point first, then transiting planet). Shown: transits that go exact or
  come within 1°. Tests block event words (accidents, disasters, death), fate/karma, month
  names and Jupiter luck/money wording.
- **Career** (`career.json`, `src/lib/interpret/career.ts`, page `/career`): work style per
  dominant element and 4 paths per element (3 from the strongest, 2 from the next); the rest
  reuses approved texts (Midheaven, 10th/6th/2nd-house planets, Mars/Saturn, strengths) plus
  career-themed forecast periods. Tests block promises, "should/must" and money words.
- **Compatibility** (`synastry.json`, `src/lib/interpret/synastry.ts`, page `/compatibility`):
  one template per aspect type filled with "your" theme + "their" theme, three band
  descriptions, an intro ("tendencies, not a verdict") and a closing respect note. Strength is a
  word (Strong/Some/Light), never a percentage. Tests block soulmate/destined/meant to be,
  perfect match/incompatible, jealousy, control, possessiveness, cheating, break-up, divorce,
  fate, guarantees, "never" and "%".

## 2. AI payload (buildPayload.ts)
Send only what the model needs — never names, emails or exact birth data. The schema
(`supabase/functions/_shared/reading.ts`) is strict: unknown keys are rejected and every string
is an enum value or an `HH:mm` time, so nothing a user types can reach the prompt. Uncertainty
flags are sent as **structured** objects built from `UncertaintyFlag.detail`, not as text, e.g.
`{"type":"sign-if-born","point":"Ascendant","altSign":"Libra","ifBorn":"before","localTime":"15:02"}`.
The example below is the original sketch; see the schema for the exact shape:
```json
{
  "kind": "natal",
  "houseSystem": "placidus",
  "timeAccuracy": "approximate",
  "points": [{"name":"Sun","sign":"Gemini","deg":9.6,"house":8,"retro":false}, ...],
  "aspects": [{"a":"Sun","b":"Moon","type":"square","orb":0.4}, ...],
  "flags": ["Rising may be Libra if born before ~3:02 PM"],
  "emphasis": {"elements":{"fire":1,"earth":4,"air":1,"water":4},
               "modes":{"cardinal":5,"fixed":3,"mutable":2},
               "stelliums":["Capricorn (3rd house)"]},
  "transits": [ ... only for kind = "forecast" ... ]
}
```

## 3. System prompt (store as `supabase/functions/generate-reading/prompt.ts`, versioned)
```
You are AstroVerse's astrologer: warm, insightful, and honest. You write Western tropical
astrology readings from the chart data provided. Use ONLY the placements in the data —
never invent planets, degrees, houses or aspects.

Style:
- Simple, friendly English. Short paragraphs. Speak to the reader as "you".
- Explain jargon the first time ("your Rising sign — the first impression you give").
- Weave placements together; point out tensions and how to work with them.
- Balance strengths and challenges. Be encouraging, never fatalistic.
- Frame everything as tendencies and themes ("you may", "astrologers associate this with"),
  never as certain facts or guaranteed events.
- If timeAccuracy is not "exact", mention which parts depend on birth time, using the flags.

Never:
- Predict death, illness, accidents, pregnancy, disasters, or exact dates of events.
- Give medical, legal, financial, investment or gambling advice (no lucky numbers).
- Diagnose mental health conditions or personality disorders.
- Tell the reader to pursue someone who is in a relationship, to test or monitor a partner,
  or present jealousy/control as romantic.
- Claim astrology is scientifically proven.

Output: JSON matching the schema given in the user message. No markdown outside fields.
```

## 4. Output schemas
- **natal:** `{ summary, sections: [{ id, body, keyPlacements: string[] }] }`
  with ids: personality, mind, love, work, emotions, growth, career, lessons — each exactly once.
  Titles are fixed in the UI (`SECTION_TITLES`), not written by the model. Bodies are plain
  text, paragraphs separated by a blank line. Implemented in `prompt.ts` / `claude.ts`
  (`PROMPT_VERSION = natal-v1`). Besides zod, output is checked against `GUARDRAIL_PATTERNS`
  (death, illness, pregnancy, lotto/lucky numbers, gambling, crypto, guarantees, diagnoses,
  "destined/doomed", "scientifically proven"); a hit counts as invalid output.
- **forecast:** `{ overview, periods: [{ title, start, end, transits: string[], theme,
  body, howToUseIt }] }` — themes: career, relationships, transformation, home, growth, rest.
- **career:** `{ summary, strengths[], workStyle, paths: [{ title, why }], timing }`
- **synastry:** `{ summary, harmony[], growthAreas[], challenges[], advice }`
- Validate with zod in the Edge Function; on failure retry once, then return a friendly error.

## 5. Caching & versioning
- `input_hash = sha256(JSON.stringify(payload) + PROMPT_VERSION)`.
- Bump `PROMPT_VERSION` whenever the prompt or schema changes; old readings stay valid
  for their version until regenerated by the user.

## 6. Disclaimers (UI)
- Under every reading: "For entertainment and self-reflection. Not professional advice."
- Forecast page: "Transits describe themes and timing, not fixed events. Your choices shape what happens."
