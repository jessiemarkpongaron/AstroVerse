import { MakeTime } from 'astronomy-engine';
import { buildChart } from './chart.ts';
import { bodyLongitude } from './positions.ts';
import {
  MERGE_GAP_DAYS,
  TRANSIT_ORBS,
  chartTransits,
  scanTransits,
  type NatalTarget,
  type TransitWindow,
} from './transits.ts';
import { angleDiff } from './zodiac.ts';

/**
 * Reference dates from the Swiss Ephemeris (sweph, Moshier), computed with the dev-only tool
 * used for the M2 fixtures: sign ingresses to the hour, and the 2020 Jupiter–Saturn
 * conjunction (2020-12-21 18h UTC at 300.4846°).
 */
const SWEPH = {
  plutoCrosses300: ['2023-03-23', '2023-06-11', '2024-01-21', '2024-09-01', '2024-11-19'],
  saturnIngress: [
    { date: '2023-03-07', sign: 11 },
    { date: '2025-05-25', sign: 0 },
    { date: '2025-09-01', sign: 11 },
    { date: '2026-02-14', sign: 0 },
  ],
  jupiterIngress: [
    { date: '2023-05-16', sign: 1 },
    { date: '2024-05-25', sign: 2 },
    { date: '2025-06-09', sign: 3 },
  ],
  greatConjunction: { date: '2020-12-21', longitude: 300.4846 },
};

const dayDiff = (a: string, b: string) =>
  Math.abs(Date.parse(`${a}T00:00Z`) - Date.parse(`${b}T00:00Z`)) / 86_400_000;

function expectDatesNear(actual: string[], expected: string[], tolDays = 1) {
  for (const e of expected) {
    expect(
      actual.some((a) => dayDiff(a, e) <= tolDays),
      `${e} in ${actual.join(', ')}`,
    ).toBe(true);
  }
}

const point = (name: NatalTarget['name'], longitude: number): NatalTarget => ({
  name,
  longitude,
  house: null,
});

/** Whole Sign houses from 0° Aries: house n starts at (n−1)·30°, so houses = signs + 1. */
const ARIES_CUSPS = Array.from({ length: 12 }, (_, i) => i * 30);

const find = (ws: TransitWindow[], body: string, natal: string, type: string) =>
  ws.filter((w) => w.transiting === body && w.natal === natal && w.type === type);

describe('scanTransits — reference dates (Swiss Ephemeris)', () => {
  it('Pluto conjunct a natal point at 0° Aquarius: all five exact passes', () => {
    const scan = scanTransits({
      natal: [point('Sun', 300)],
      cusps: null,
      start: new Date('2022-06-01T00:00Z'),
      days: 1000,
    });
    const ws = find(scan.windows, 'Pluto', 'Sun', 'conjunction');
    // Pluto drifts beyond its 1.5° orb for months between passes, so the five hits fall in
    // three windows: 2023 (direct + retrograde), early 2024, late 2024 (retrograde + direct).
    expect(ws.map((w) => w.exactDates.length)).toEqual([2, 1, 2]);
    expectDatesNear(
      ws.flatMap((w) => w.exactDates),
      SWEPH.plutoCrosses300,
    );
  });

  it('Saturn and Jupiter house ingresses (Whole Sign from 0° Aries), incl. retrograde re-entry', () => {
    const scan = scanTransits({
      natal: [],
      cusps: ARIES_CUSPS,
      start: new Date('2022-12-25T00:00Z'),
      days: 1200,
    });
    const saturn = scan.ingresses.filter((i) => i.body === 'Saturn');
    expect(saturn.map((i) => i.house)).toEqual(SWEPH.saturnIngress.map((x) => x.sign + 1));
    expectDatesNear(
      saturn.map((i) => i.date),
      SWEPH.saturnIngress.map((x) => x.date),
    );
    expect(saturn.map((i) => i.retrograde)).toEqual([false, false, true, false]);

    const jupiter = scan.ingresses.filter((i) => i.body === 'Jupiter');
    expectDatesNear(
      jupiter.map((i) => i.date),
      SWEPH.jupiterIngress.map((x) => x.date),
    );
    expect(jupiter.map((i) => i.house)).toEqual(SWEPH.jupiterIngress.map((x) => x.sign + 1));
  });

  it('2020 great conjunction: Jupiter and Saturn both conjunct a natal point at 300.48°', () => {
    const scan = scanTransits({
      natal: [point('Venus', SWEPH.greatConjunction.longitude)],
      cusps: null,
      start: new Date('2020-10-01T00:00Z'),
      days: 120,
    });
    for (const body of ['Jupiter', 'Saturn']) {
      const ws = find(scan.windows, body, 'Venus', 'conjunction');
      expect(ws).toHaveLength(1);
      expectDatesNear(ws[0]?.exactDates ?? [], [SWEPH.greatConjunction.date]);
    }
  });

  it('finds squares on the "minus" side too (Saturn at 330° squares a natal point at 60°)', () => {
    const scan = scanTransits({
      natal: [point('Mars', 60)],
      cusps: null,
      start: new Date('2023-01-01T00:00Z'),
      days: 120,
    });
    const ws = find(scan.windows, 'Saturn', 'Mars', 'square');
    expect(ws).toHaveLength(1);
    expectDatesNear(ws[0]?.exactDates ?? [], ['2023-03-07']);
  });
});

describe('scanTransits — invariants', () => {
  const carrascal = buildChart({
    date: '1990-05-31',
    time: '15:30',
    timeAccuracy: 'exact',
    place: { name: 'Carrascal', lat: 9.37028, lon: 125.94917, tz: 'Asia/Manila' },
  });
  const start = new Date('2026-11-18T05:00Z');
  const scan = chartTransits(carrascal, start);

  it('covers 24 months from the start day', () => {
    expect(scan.start).toBe('2026-11-18');
    expect(scan.end).toBe('2028-11-18');
    expect(scan.windows.length).toBeGreaterThan(0);
  });

  it('every window is inside the scan, ordered, and its exact hits are inside the window', () => {
    for (const w of scan.windows) {
      expect(w.start <= w.end).toBe(true);
      expect(w.start >= scan.start && w.end <= scan.end).toBe(true);
      for (const d of w.exactDates) expect(d >= w.start && d <= w.end).toBe(true);
      expect(w.startsBeforeScan).toBe(w.start === scan.start);
    }
    const starts = scan.windows.map((w) => w.start);
    expect([...starts].sort()).toEqual(starts);
  });

  it('at each exact date the transit really is exact (within a day’s motion)', () => {
    const natal = new Map(carrascal.points.map((p) => [p.name, p.longitude]));
    const angle = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 };
    for (const w of scan.windows) {
      for (const d of w.exactDates) {
        const lon = bodyLongitude(w.transiting, MakeTime(new Date(`${d}T12:00Z`)));
        const sep = Math.abs(angleDiff(natal.get(w.natal) as number, lon));
        expect(Math.abs(sep - angle[w.type])).toBeLessThan(0.3);
      }
    }
  });

  it('windows respect the orb limits and are never split by less than the merge gap', () => {
    for (const w of scan.windows) expect(w.minOrb).toBeLessThanOrEqual(TRANSIT_ORBS[w.transiting]);
    const byKey = new Map<string, TransitWindow[]>();
    for (const w of scan.windows) {
      const k = `${w.transiting}|${w.natal}|${w.type}`;
      byKey.set(k, [...(byKey.get(k) ?? []), w]);
    }
    for (const list of byKey.values()) {
      for (let i = 1; i < list.length; i++) {
        expect(
          dayDiff((list[i - 1] as TransitWindow).end, (list[i] as TransitWindow).start),
        ).toBeGreaterThan(MERGE_GAP_DAYS);
      }
    }
  });

  it('records natal and transit houses when the time is known', () => {
    for (const w of scan.windows) {
      expect(w.natalHouse).toBeGreaterThanOrEqual(1);
      expect(w.transitHouse).toBeGreaterThanOrEqual(1);
    }
    expect(scan.ingresses.length).toBeGreaterThan(0);
  });

  it('unknown birth time: no Moon, angles, houses or ingresses', () => {
    const unknown = chartTransits(
      buildChart({ ...carrascal.input, time: null, timeAccuracy: 'unknown' }),
      start,
    );
    for (const w of unknown.windows) {
      expect(['Moon', 'Ascendant', 'Midheaven']).not.toContain(w.natal);
      expect(w.natalHouse).toBeNull();
      expect(w.transitHouse).toBeNull();
    }
    expect(unknown.ingresses).toEqual([]);
  });

  it('is deterministic and fast enough for the browser', () => {
    const t0 = performance.now();
    const again = chartTransits(carrascal, start);
    const ms = performance.now() - t0;
    expect(again).toEqual(scan);
    expect(ms).toBeLessThan(1500);
  });
});
