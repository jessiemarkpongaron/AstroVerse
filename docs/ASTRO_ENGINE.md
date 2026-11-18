# Astro Engine Spec — AstroVerse

Everything here lives in `src/lib/astro/`. Pure TypeScript, deterministic, fully tested.

## 1. Conventions
- **Zodiac:** tropical. **Frame:** geocentric, apparent ecliptic longitude **of date**
  (true equinox), which is what Western astrology software (Astro.com etc.) reports.
- Longitudes normalized to [0, 360). Sign = `floor(lon / 30)`; 0 = Aries.
- Display: `15°12' Taurus`. Round only at display time.

## 2. Time (time.ts)
- Input: local date + local time + IANA zone of the birthplace.
- Use `luxon`: `DateTime.fromISO(\`${date}T${time}\`, { zone: tz }).toUTC()`.
  Luxon applies historical offsets/DST from the IANA database. (Philippines: Asia/Manila,
  UTC+8; note the PH observed DST briefly in 1978 and in some earlier years — luxon handles it.)
- Unknown time → compute at **12:00 local**, set `house = null` for all points, omit
  Ascendant/Midheaven, and add a `time-unknown` flag. The Moon still gets a sign but
  flag it if it changes sign during that local day.
- Ambiguous/nonexistent local times (DST transitions): pick the earlier valid instant and add a flag.

## 3. Positions (positions.ts) — use `astronomy-engine`
- Sun, Mercury … Pluto, Moon: geocentric apparent position → convert to the
  **true ecliptic of date**. In astronomy-engine:
  `GeoVector(body, time, true)` (aberration on) → rotate with `Rotation_EQJ_ECT(time)` →
  `SphereFromVector` → `lon`. (Confirm function names in `astronomy.d.ts`;
  `EclipticGeoMoon(time)` can be used for the Moon.)
- **Speed / retrograde:** longitude at t+0.5 day minus t−0.5 day (handle 360° wrap).
  Retrograde if speed < 0. Sun and Moon are never retrograde.
- **North Node:** use the **mean node** (Meeus):
  `Ω = 125.04452 − 1934.136261·T + 0.0020708·T² + T³/450000` (T = Julian centuries from J2000 TT).
  Offer True Node later as a setting.
- Delta-T is handled by astronomy-engine (`MakeTime` uses UT and converts internally).

## 4. Angles (angles.ts)
- `RAMC = (GAST_hours × 15 + longitudeEast) mod 360` — get GAST from `SiderealTime(time)`.
- `ε` = true obliquity of date (astronomy-engine `e_tilt(time).tobl`, or mean obliquity
  formula if not exported).
- **Midheaven:** `MC = atan2(sin RAMC, cos RAMC · cos ε)` → normalize.
- **Ascendant:** `ASC = atan2(cos RAMC, −(sin RAMC · cos ε + tan φ · sin ε))` → normalize.
  (φ = geographic latitude.) Sanity check: ASC must be within 180° *ahead* of MC
  going counter-clockwise; if not, add 180°.

## 5. Houses (houses.ts)
- **Whole Sign:** cusp n = (sign of ASC + n − 1) × 30.
- **Placidus (default):** standard semi-arc trisection, solved iteratively for cusps
  11, 12, 2, 3 (converge to < 1e-7°); 10 = MC, 1 = ASC, 4/5/6/7/8/9 = opposites.
  Write it from a referenced algorithm (e.g., Meeus-style / Swiss Ephemeris documentation
  description), cite the source in a code comment, and test it against fixtures.
- **Fallback:** if |latitude| > 66° Placidus is undefined for some times → use Porphyry
  and add a flag.
- House of a point: the cusp it falls after (handle 0°/360° wrap).

## 6. Aspects (aspects.ts)
| Aspect | Angle | Orb (luminaries involved) | Orb (others) |
|---|---|---|---|
| Conjunction | 0° | 10° | 8° |
| Opposition | 180° | 10° | 8° |
| Trine | 120° | 8° | 6° |
| Square | 90° | 8° | 6° |
| Sextile | 60° | 6° | 4° |
- Angles (ASC/MC) use the "others" orbs. Skip Node–Node, ASC–MC.
- `applying` = orb is shrinking (use speeds).

## 7. Transits (transits.ts)
- Transiting bodies: Jupiter, Saturn, Uranus, Neptune, Pluto.
- Natal targets: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, ASC, MC (+ outer planets optional).
- Aspects: conjunction, sextile, square, trine, opposition. Orb: 2° Jupiter/Saturn, 1.5° outers.
- Algorithm: step daily across 24 months; record windows where orb ≤ limit; merge windows
  separated by < 30 days (retrograde passes); store exact-hit dates (orb minimum) per pass.
- Output: `{ transiting, natal, type, start, end, exactDates[], natalHouse, transitHouse }`.
- Also output **ingresses**: when each slow planet enters a new natal house (Whole Sign or Placidus).

## 8. Uncertainty (uncertainty.ts)
- `sign-cusp`: any point within 1° of a sign boundary (Moon: within the Moon's
  movement over the time-uncertainty window).
- For `approximate` time: recompute the chart at −30 and +30 minutes; if ASC sign, MC sign
  or any point's house changes, add a flag naming both possibilities and the switch time
  (find it by bisection to the nearest minute).
  Example message: "Your Rising is Scorpio, but would be Libra if you were born before about 3:02 PM."

## 9. Validation
- Fixtures in `__tests__/fixtures.json`: **at least 6 charts** with reference positions
  copied from a professional source (Astro.com "Chart Drawing" → "Additional tables",
  Placidus). Include: one Southern-hemisphere chart, one high-latitude (~60°N) chart,
  one with a retrograde Mercury, one born near midnight, one Philippine chart, and one
  with DST in effect.
- Tolerances: Sun–Pluto ≤ 0.1° (target) / 0.25° (hard fail), Moon ≤ 0.1°,
  ASC/MC ≤ 0.2°, Placidus cusps ≤ 0.3°, mean node ≤ 0.1°.
- Sanity fixture (approximate, ±1°) — May 31 1990, 15:30, Carrascal, Surigao del Sur
  (9.37°N, 125.95°E, Asia/Manila):
  Sun ~Gemini 9.6°, Moon ~Virgo 9.2°, ASC ~Scorpio 7°, MC ~Leo 4.6°,
  Mercury ~Taurus 15°, Venus ~Taurus 1°, Jupiter ~Cancer 13°, Saturn ~Capricorn 25° ℞,
  Pluto ~Scorpio 16° ℞. (Mars sits at ~0° Aries — a good cusp-flag test case.)
- Property tests: ASC/MC always in [0,360); houses strictly increasing (mod 360);
  12 cusps; opposite cusps 180° apart.
