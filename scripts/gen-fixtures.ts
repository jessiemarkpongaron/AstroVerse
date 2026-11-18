/**
 * Dev-only: generate reference chart fixtures with the Swiss Ephemeris (`sweph`, AGPL).
 * This script is NEVER imported by app code and sweph is never bundled.
 *
 *   npm run gen:fixtures   →  src/lib/astro/__tests__/fixtures.json
 *
 * Settings mirror Astro.com: tropical zodiac, geocentric apparent positions referred to the
 * true equinox/ecliptic of date (sweph defaults), Moshier ephemeris (no data files needed;
 * precision well below our 0.1° tolerances), mean lunar node.
 *
 * UTC offsets are entered by hand from the IANA tz database (`zdump -v <zone>`), and the
 * script aborts if luxon disagrees — so fixture UTC instants are not derived from our own
 * time.ts code.
 */
import { writeFileSync } from 'node:fs';
import { DateTime } from 'luxon';
import sweph from 'sweph';

const { constants: C } = sweph;
const FLAGS = C.SEFLG_MOSEPH | C.SEFLG_SPEED;

interface FixtureSpec {
  id: string;
  description: string;
  place: { name: string; lat: number; lon: number; tz: string };
  date: string;
  time: string;
  /** Hand-entered UTC offset in minutes that the app must use (tzdb unless overridden). */
  expectedOffsetMinutes: number;
  /** Set when the app deliberately differs from tzdb (PH standard-time policy, time.ts). */
  tzdbOffsetMinutes?: number;
  /** Optional assertion so a fixture keeps its purpose. */
  check?: (bodies: Record<string, { lon: number; speed: number }>) => string | null;
}

const SPECS: FixtureSpec[] = [
  {
    id: 'ph-manila-2001',
    description: 'Philippine chart, standard time (UTC+8)',
    place: { name: 'Manila, Philippines', lat: 14.5995, lon: 120.9842, tz: 'Asia/Manila' },
    date: '2001-11-12',
    time: '05:20',
    expectedOffsetMinutes: 480,
  },
  {
    id: 'ph-carrascal-1990-dst',
    description:
      'PRD F1 acceptance chart. tzdb lists PH DST (UTC+9) that day, but PH births use UTC+8 by policy',
    place: { name: 'Carrascal, Surigao del Sur', lat: 9.37, lon: 125.95, tz: 'Asia/Manila' },
    date: '1990-05-31',
    time: '15:30',
    expectedOffsetMinutes: 480,
    tzdbOffsetMinutes: 540,
  },
  {
    id: 'sydney-1985',
    description: 'Southern hemisphere, Australian DST in effect (UTC+11)',
    place: { name: 'Sydney, Australia', lat: -33.8688, lon: 151.2093, tz: 'Australia/Sydney' },
    date: '1985-01-10',
    time: '06:45',
    expectedOffsetMinutes: 660,
  },
  {
    id: 'helsinki-1975',
    description: 'High latitude (~60°N)',
    place: { name: 'Helsinki, Finland', lat: 60.1699, lon: 24.9384, tz: 'Europe/Helsinki' },
    date: '1975-12-03',
    time: '20:10',
    expectedOffsetMinutes: 120,
  },
  {
    id: 'newyork-2000-mercury-rx',
    description: 'Mercury retrograde',
    place: { name: 'New York, USA', lat: 40.7128, lon: -74.006, tz: 'America/New_York' },
    date: '2000-03-01',
    time: '08:15',
    expectedOffsetMinutes: -300,
    check: (b) => ((b['Mercury']?.speed ?? 0) < 0 ? null : 'Mercury is not retrograde'),
  },
  {
    id: 'buenosaires-1995-midnight',
    description: 'Born near midnight (23:55 local → next UTC day), southern hemisphere',
    place: {
      name: 'Buenos Aires, Argentina',
      lat: -34.6037,
      lon: -58.3816,
      tz: 'America/Argentina/Buenos_Aires',
    },
    date: '1995-08-14',
    time: '23:55',
    expectedOffsetMinutes: -180,
  },
  {
    id: 'london-1966-bst',
    description: 'British Summer Time in effect (UTC+1)',
    place: { name: 'London, UK', lat: 51.5074, lon: -0.1278, tz: 'Europe/London' },
    date: '1966-07-30',
    time: '15:00',
    expectedOffsetMinutes: 60,
  },
];

const BODY_IDS: Record<string, number> = {
  Sun: C.SE_SUN,
  Moon: C.SE_MOON,
  Mercury: C.SE_MERCURY,
  Venus: C.SE_VENUS,
  Mars: C.SE_MARS,
  Jupiter: C.SE_JUPITER,
  Saturn: C.SE_SATURN,
  Uranus: C.SE_URANUS,
  Neptune: C.SE_NEPTUNE,
  Pluto: C.SE_PLUTO,
  NorthNode: C.SE_MEAN_NODE,
};

const round = (x: number, d = 6) => Number(x.toFixed(d));

function cusps(jd: number, lat: number, lon: number, hsys: string): number[] {
  const res = sweph.houses_ex2(jd, C.SEFLG_MOSEPH, lat, lon, hsys);
  if (res.flag !== C.OK) throw new Error(`houses_ex2(${hsys}) failed: ${res.error}`);
  return res.data.houses.slice(0, 12).map((x: number) => round(x));
}

const charts = SPECS.map((s) => {
  const [y, mo, d] = s.date.split('-').map(Number) as [number, number, number];
  const [h, mi] = s.time.split(':').map(Number) as [number, number];
  const wallMs = Date.UTC(y, mo - 1, d, h, mi);
  const utcMs = wallMs - s.expectedOffsetMinutes * 60_000;

  const lux = DateTime.fromISO(`${s.date}T${s.time}`, { zone: s.place.tz });
  const tzdbOffset = s.tzdbOffsetMinutes ?? s.expectedOffsetMinutes;
  if (lux.offset !== tzdbOffset) {
    throw new Error(`${s.id}: luxon offset ${lux.offset} ≠ hand-entered tzdb ${tzdbOffset}`);
  }

  const u = new Date(utcMs);
  const hour = u.getUTCHours() + u.getUTCMinutes() / 60 + u.getUTCSeconds() / 3600;
  const jd = sweph.julday(
    u.getUTCFullYear(),
    u.getUTCMonth() + 1,
    u.getUTCDate(),
    hour,
    C.SE_GREG_CAL,
  );

  const bodies: Record<string, { lon: number; speed: number }> = {};
  for (const [name, id] of Object.entries(BODY_IDS)) {
    const r = sweph.calc_ut(jd, id, FLAGS);
    if (r.error) throw new Error(`${s.id} ${name}: ${r.error}`);
    bodies[name] = { lon: round(r.data[0]), speed: round(r.data[3]) };
  }
  const problem = s.check?.(bodies);
  if (problem) throw new Error(`${s.id}: ${problem}`);

  const hp = sweph.houses_ex2(jd, C.SEFLG_MOSEPH, s.place.lat, s.place.lon, 'P');
  if (hp.flag !== C.OK) throw new Error(`${s.id}: houses failed: ${hp.error}`);
  const [asc, mc, armc] = hp.data.points as number[];

  return {
    id: s.id,
    description: s.description,
    input: { date: s.date, time: s.time, timeAccuracy: 'exact', place: s.place },
    expectedOffsetMinutes: s.expectedOffsetMinutes,
    utc: u.toISOString(),
    julianDayUt: round(jd, 8),
    bodies,
    ascendant: round(asc as number),
    midheaven: round(mc as number),
    armc: round(armc as number),
    cusps: {
      placidus: cusps(jd, s.place.lat, s.place.lon, 'P'),
      porphyry: cusps(jd, s.place.lat, s.place.lon, 'O'),
      wholeSign: cusps(jd, s.place.lat, s.place.lon, 'W'),
    },
  };
});

const out = {
  _comment:
    'GENERATED by scripts/gen-fixtures.ts — do not edit by hand. Reference values from the Swiss Ephemeris (Moshier), tropical, apparent, true equinox of date, mean node.',
  generator: { sweph: sweph.version(), generatedAt: new Date().toISOString().slice(0, 10) },
  charts,
};

const path = new URL('../src/lib/astro/__tests__/fixtures.json', import.meta.url);
writeFileSync(path, JSON.stringify(out, null, 2) + '\n');
console.log(`Wrote ${charts.length} charts → ${path.pathname}`);
