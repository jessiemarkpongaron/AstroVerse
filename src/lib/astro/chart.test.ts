import { MakeTime } from 'astronomy-engine';
import { REFERENCE_CHARTS } from './__tests__/fixtures.ts';
import { buildChart } from './chart.ts';
import { bodyLongitude } from './positions.ts';
import { BirthInputError, birthToUtc } from './time.ts';
import type { BirthInput, PointName } from './types.ts';
import { angleDiff, signName, signOf } from './zodiac.ts';

const carrascal = { name: 'Carrascal, Surigao del Sur', lat: 9.37, lon: 125.95, tz: 'Asia/Manila' };
const prd: BirthInput = {
  date: '1990-05-31',
  time: '15:30',
  timeAccuracy: 'exact',
  place: carrascal,
};

const point = (c: ReturnType<typeof buildChart>, n: PointName) =>
  c.points.find((p) => p.name === n);

describe('buildChart — PRD F1 acceptance (Carrascal, May 31 1990, 3:30 PM)', () => {
  const chart = buildChart(prd);

  it('Sun Gemini, Moon Virgo, Rising Scorpio', () => {
    expect(signName(point(chart, 'Sun')?.sign ?? 0)).toBe('Gemini');
    expect(signName(point(chart, 'Moon')?.sign ?? 0)).toBe('Virgo');
    expect(signName(point(chart, 'Ascendant')?.sign ?? 0)).toBe('Scorpio');
  });

  it('has 13 points, Placidus houses, ASC in house 1 and MC in house 10', () => {
    expect(chart.points).toHaveLength(13);
    expect(chart.houses?.system).toBe('placidus');
    expect(chart.houses?.cusps).toHaveLength(12);
    expect(point(chart, 'Ascendant')?.house).toBe(1);
    expect(point(chart, 'Midheaven')?.house).toBe(10);
    for (const p of chart.points) expect(p.house).toBeGreaterThanOrEqual(1);
  });

  it('flags Mars at ~0° Aries as a sign-cusp', () => {
    expect(chart.flags).toContainEqual(
      expect.objectContaining({ point: 'Mars', kind: 'sign-cusp' }),
    );
  });

  it('gives the Mars flag a structured detail (near Pisces, the sign it just left)', () => {
    const f = chart.flags.find((x) => x.point === 'Mars');
    expect(f?.detail).toEqual({ type: 'near-sign-edge', sign: 11 });
  });

  it('computes aspects with valid orbs', () => {
    expect(chart.aspects.length).toBeGreaterThan(0);
    for (const a of chart.aspects) expect(a.orb).toBeLessThanOrEqual(10);
  });

  it('is deterministic', () => {
    expect(buildChart(prd)).toEqual(chart);
  });
});

describe('buildChart — approximate time', () => {
  const chart = buildChart({ ...prd, timeAccuracy: 'approximate' });

  it('warns that Rising would be Libra if born before about 3:02 PM', () => {
    const f = chart.flags.find((x) => x.point === 'Ascendant' && x.kind === 'sign-cusp');
    expect(f?.message).toBe(
      'Your Rising is Scorpio, but would be Libra if you were born before about 3:02 PM.',
    );
  });

  it('the reported switch minute is correct (Libra at 3:01, Scorpio at 3:02)', () => {
    const at = (time: string) =>
      signName(point(buildChart({ ...prd, time }), 'Ascendant')?.sign ?? 0);
    expect(at('15:01')).toBe('Libra');
    expect(at('15:02')).toBe('Scorpio');
  });

  it('gives the Rising flag a structured detail (Libra before 15:02)', () => {
    const f = chart.flags.find((x) => x.point === 'Ascendant' && x.kind === 'sign-cusp');
    expect(f?.detail).toEqual({ type: 'sign-if-born', alt: 6, side: 'before', localTime: '15:02' });
  });

  it('flags house changes within ±30 minutes', () => {
    expect(chart.flags.some((f) => f.kind === 'house-cusp')).toBe(true);
  });

  it('every point-specific flag has a structured detail; chart-wide ones do not', () => {
    for (const f of chart.flags) {
      if (f.point === null) expect(f.detail).toBeUndefined();
      else expect(f.detail).toBeDefined();
    }
    const house = chart.flags.find((f) => f.kind === 'house-cusp');
    expect(house?.detail).toMatchObject({ type: 'house-if-born' });
    expect(house?.message).toContain(
      house?.detail?.type === 'house-if-born' ? house.detail.side : '?',
    );
  });

  it('exact time does not produce ±30-min house flags', () => {
    expect(buildChart(prd).flags.some((f) => f.kind === 'house-cusp')).toBe(false);
  });
});

describe('buildChart — unknown time', () => {
  const chart = buildChart({ ...prd, time: null, timeAccuracy: 'unknown' });

  it('uses 12:00 local, omits ASC/MC and houses', () => {
    expect(chart.utc).toBe('1990-05-31T04:00:00.000Z');
    expect(chart.points.map((p) => p.name)).not.toContain('Ascendant');
    expect(chart.points.map((p) => p.name)).not.toContain('Midheaven');
    expect(chart.houses).toBeNull();
    for (const p of chart.points) expect(p.house).toBeNull();
    expect(chart.aspects.every((a) => a.a !== 'Ascendant' && a.b !== 'Ascendant')).toBe(true);
  });

  it('adds a time-unknown flag', () => {
    expect(chart.flags).toContainEqual(
      expect.objectContaining({ kind: 'time-unknown', point: null }),
    );
  });

  it('treats a time given with accuracy "unknown" as unknown', () => {
    const c = buildChart({ ...prd, timeAccuracy: 'unknown' });
    expect(c.houses).toBeNull();
    expect(c.input.time).toBeNull();
  });

  it('flags a Moon sign change during the birth day, with the switch time', () => {
    // Find a Manila day in Jan 2001 when the Moon changes sign (it does every ~2.5 days).
    const place = { name: 'Manila', lat: 14.6, lon: 121, tz: 'Asia/Manila' };
    const moonSign = (date: string, time: string) =>
      signOf(bodyLongitude('Moon', MakeTime(birthToUtc({ date, time, place }).utc)));
    const days = Array.from({ length: 10 }, (_, i) => `2001-01-${String(i + 1).padStart(2, '0')}`);
    const changing = days.find((d) => moonSign(d, '00:00') !== moonSign(d, '23:59'));
    const steady = days.find((d) => moonSign(d, '00:00') === moonSign(d, '23:59'));
    expect(changing).toBeDefined();
    expect(steady).toBeDefined();

    const c = buildChart({ date: changing as string, time: null, timeAccuracy: 'unknown', place });
    const flag = c.flags.find((f) => f.kind === 'moon-sign-change');
    expect(flag?.point).toBe('Moon');
    const m = /about (\d+):(\d+) (AM|PM)/.exec(flag?.message ?? '');
    expect(m).not.toBeNull();
    let h = Number(m?.[1]) % 12;
    if (m?.[3] === 'PM') h += 12;
    const hhmm = `${String(h).padStart(2, '0')}:${m?.[2]}`;
    // The Moon has the "after" sign at the reported minute.
    expect(moonSign(changing as string, hhmm)).toBe(moonSign(changing as string, '23:59'));
    expect(flag?.detail).toEqual({
      type: 'moon-sign-change',
      from: moonSign(changing as string, '00:00'),
      to: moonSign(changing as string, '23:59'),
      localTime: hhmm,
    });

    const s = buildChart({ date: steady as string, time: null, timeAccuracy: 'unknown', place });
    expect(s.flags.some((f) => f.kind === 'moon-sign-change')).toBe(false);
  });
});

describe('buildChart — house systems and fallback', () => {
  it('Whole Sign houses on request', () => {
    const c = buildChart(prd, { houseSystem: 'whole-sign' });
    expect(c.houses?.system).toBe('whole-sign');
    expect(c.houses?.cusps[0]).toBe(210); // 0° Scorpio
  });

  it('falls back to Porphyry with a flag above 66° (Tromsø)', () => {
    const c = buildChart({
      date: '1990-12-21',
      time: '12:00',
      timeAccuracy: 'exact',
      place: { name: 'Tromsø', lat: 69.65, lon: 18.96, tz: 'Europe/Oslo' },
    });
    expect(c.houses?.system).toBe('porphyry');
    expect(c.flags).toContainEqual(expect.objectContaining({ kind: 'house-system-fallback' }));
  });
});

describe('buildChart — reference charts', () => {
  it.each(REFERENCE_CHARTS.map((c) => [c.id, c] as const))(
    '%s matches Swiss Ephemeris',
    (_id, ref) => {
      const c = buildChart(ref.input);
      expect(c.utc).toBe(ref.utc);
      expect(
        Math.abs(angleDiff(ref.ascendant, point(c, 'Ascendant')?.longitude ?? NaN)),
      ).toBeLessThan(0.2);
      c.houses?.cusps.forEach((cusp, i) => {
        expect(Math.abs(angleDiff(ref.cusps.placidus[i] as number, cusp))).toBeLessThan(0.3);
      });
    },
  );
});

describe('buildChart — validation', () => {
  it.each([
    ['latitude 90', { lat: 90 }],
    ['latitude NaN', { lat: Number.NaN }],
    ['longitude 200', { lon: 200 }],
  ])('rejects %s', (_l, patch) => {
    expect(() => buildChart({ ...prd, place: { ...carrascal, ...patch } })).toThrow(
      BirthInputError,
    );
  });
});
