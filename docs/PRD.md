# PRD — AstroVerse

## 1. Summary
AstroVerse lets anyone enter their birth date, time and place and instantly get:
their **Big Three** (Sun, Moon, Rising), a **full natal chart** with a chart wheel,
a plain-language **reading**, a **future reading** (transits over the next 1–2 years),
**career themes**, and **compatibility** with another person.

Target users: Filipinos aged 18–45 who are curious about astrology, mostly on mobile.
Business model: free core chart → paid premium reports (PayMongo: GCash/Maya/cards).

## 2. Goals
- Accurate calculations (within 0.5° of professional software for planets; see ASTRO_ENGINE)
- A reading that feels personal, clear and warm, in simple English (English only: owner decision 2026-11-19)
- Under 3 seconds from "Submit" to seeing the Big Three on a mid-range phone
- Honest about uncertainty (approximate birth times, cusp placements)

## 3. Non-goals (for now)
- Sidereal/Vedic astrology, asteroids, Arabic parts, progressions, solar returns
- Live chat with human astrologers
- Native mobile apps (PWA is enough)

## 4. Features

### F1. Birth data form (Phase 1)
- Fields: name (optional), birth date, birth time, birth place (autocomplete)
- Birth time accuracy selector: **Exact / Approximate (±30 min) / Unknown**
- Place autocomplete returns lat, lon, IANA timezone (e.g. Carrascal, Surigao del Sur → Asia/Manila)
- Validation: date 1900–2100, time 00:00–23:59, place required
- **Acceptance:** entering "May 31 1990, 3:30 PM, Carrascal, Surigao del Sur" produces a chart
  with Sun Gemini, Moon Virgo, Rising Scorpio.
- **Decision (2026-11-18): Philippine birth times are UTC+8.** tzdb lists short PH DST periods
  (e.g. 1990-05-21..07-28 at UTC+9); we ignore them by default so this example resolves to
  07:30 UTC → Rising Scorpio. The engine supports an opt-in "clocks were on DST" override.

### F2. Big Three card (Phase 1)
- Sun, Moon, Rising with sign glyph, degree, and a 2–3 sentence meaning each
- "What's the difference?" explainer (Sun = core self, Moon = emotions, Rising = first impression)
- If time is Unknown: hide Rising, show "Add your birth time to see your Rising sign"
- If Approximate and Rising/Moon is within 2° of a sign boundary: show a cusp warning
  ("Your Rising may be Libra if you were born before about 3:00 PM")

### F3. Full natal chart (Phase 1)
- Table: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto,
  North Node, Ascendant, Midheaven — sign, degree°minute', house, retrograde (℞)
- Major aspects: conjunction, sextile, square, trine, opposition (with orbs from ASTRO_ENGINE)
- House system toggle: **Placidus** (default) / **Whole Sign**
- SVG chart wheel (responsive, dark/light theme)

### F4. Natal reading (Phase 2)
- Sections: Personality, Mind & Communication, Love & Relationships, Work & Drive,
  Emotions, Growth & Luck, Career Direction, Life Lessons, Summary
- Built from static interpretation text + AI synthesis (see INTERPRETATION.md)
- Readings are cached per chart (same input → same reading, no repeat API cost)

### F5. Future reading / transits (Phase 2)
- Scan the next 24 months for transits of Jupiter, Saturn, Uranus, Neptune, Pluto to natal points
- Timeline UI: periods grouped by theme (career, relationships, transformation, home)
- Each period: date range, planets involved, plain-language meaning, "how to use this time"

### F6. Career reading (Phase 2)
- Based on Midheaven, 10th/6th/2nd houses and their rulers, Sun/Mars/Saturn, element balance
- Output: strengths, 4–6 best-fit career paths, work style, timing tips from F5

### F7. Compatibility / synastry (Phase 3)
- Two charts side by side; key cross-aspects (Venus–Mars, Sun–Moon, Moon–Moon, Asc links)
- Score bands (not a single "%" that sounds scientific): Harmony / Growth areas / Challenges
- **Consent checkbox** required before saving another person's birth data

### F8. Accounts & saved charts (Phase 2)
- Supabase Auth (email magic link + Google)
- Save multiple charts ("Me", "Family", etc.); delete chart deletes all derived readings

### F9. Premium & payments (Phase 3)
- Free: Big Three, full chart table + wheel, short reading, **full reading from static text**
  (owner decision 2026-11-18: no API cost; themed sections assembled from approved texts)
- Premium (one-time per chart, e.g. ₱149–₱299): AI-written natal reading, 2-year forecast,
  career, compatibility
- PayMongo checkout via Edge Function; webhook marks the purchase; receipts by email

### F10. Shareable card (Phase 3)
- Generate a 1080×1350 image of the user's Big Three for social media (no birth data on it)

## 5. Content & safety requirements
- Footer + reading pages: "For entertainment and self-reflection. Not a substitute for
  professional medical, legal, financial or psychological advice."
- No predictions of death, illness, accidents, pregnancy, or exact dates of events
- No financial/investment/gambling advice (no "lucky lotto numbers" in readings)
- Relationship readings must not encourage pursuing people who are in a relationship,
  jealousy, or controlling behavior
- See INTERPRETATION.md for the full list

## 6. Success metrics
- ≥ 60% of visitors who start the form see their Big Three
- ≥ 25% of chart viewers open the full reading
- ≥ 3% free → premium conversion by end of Phase 3
