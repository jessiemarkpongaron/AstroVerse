import { buildChart } from '../astro/chart.ts';
import type { BirthInput } from '../astro/types.ts';
import {
  NatalPayloadSchema,
  canonicalJson,
  readingInputHash,
} from '../../../supabase/functions/_shared/reading.ts';
import { buildNatalPayload } from './buildPayload.ts';

const carrascal: BirthInput = {
  date: '1990-05-31',
  time: '15:30',
  timeAccuracy: 'exact',
  place: {
    name: 'Carrascal, Surigao del Sur, Philippines',
    lat: 9.37028,
    lon: 125.94917,
    tz: 'Asia/Manila',
  },
};

describe('buildNatalPayload', () => {
  const payload = buildNatalPayload(buildChart(carrascal));

  it('matches the shared schema', () => {
    expect(NatalPayloadSchema.safeParse(payload).success).toBe(true);
  });

  it('carries the PRD F1 placements', () => {
    const p = (n: string) => payload.points.find((x) => x.name === n);
    expect(p('Sun')).toMatchObject({ sign: 'Gemini', house: 8, retro: false });
    expect(p('Moon')?.sign).toBe('Virgo');
    expect(p('Ascendant')).toMatchObject({ sign: 'Scorpio', house: 1 });
    expect(p('Saturn')?.retro).toBe(true);
    expect(payload.points).toHaveLength(13);
    expect(payload.houseSystem).toBe('placidus');
  });

  it('contains no birth data, names or free text', () => {
    const json = JSON.stringify(payload);
    for (const secret of ['1990', '15:30', 'Carrascal', 'Manila', 'Surigao', '9.37', '125.9']) {
      expect(json).not.toContain(secret);
    }
    // Every string value is an enum value or an HH:mm time.
    const strings: string[] = [];
    JSON.stringify(payload, (_k, v: unknown) => {
      if (typeof v === 'string') strings.push(v);
      return v;
    });
    for (const s of strings) expect(s).toMatch(/^([A-Za-z-]+|\d\d:\d\d)$/);
  });

  it('turns the Mars sign-edge flag into a structured flag', () => {
    expect(payload.flags).toContainEqual({
      type: 'near-sign-edge',
      point: 'Mars',
      nearSign: 'Pisces',
    });
  });

  it('counts elements and modes over the 10 planets, and finds stelliums', () => {
    const { elements, modes, stelliums } = payload.emphasis;
    expect(elements.fire + elements.earth + elements.air + elements.water).toBe(10);
    expect(modes.cardinal + modes.fixed + modes.mutable).toBe(10);
    // Saturn, Uranus and Neptune are all in Capricorn in 1990.
    expect(stelliums).toContainEqual(
      expect.objectContaining({
        by: 'sign',
        sign: 'Capricorn',
        points: ['Saturn', 'Uranus', 'Neptune'],
      }),
    );
  });

  it('sorts aspects by orb and rounds to 0.1°', () => {
    const orbs = payload.aspects.map((a) => a.orb);
    expect([...orbs].sort((a, b) => a - b)).toEqual(orbs);
    for (const o of orbs) expect(Math.round(o * 10) / 10).toBe(o);
  });

  it('approximate time adds the "Libra before 15:02" flag', () => {
    const approx = buildNatalPayload(buildChart({ ...carrascal, timeAccuracy: 'approximate' }));
    expect(approx.timeAccuracy).toBe('approximate');
    expect(approx.flags).toContainEqual({
      type: 'sign-if-born',
      point: 'Ascendant',
      altSign: 'Libra',
      ifBorn: 'before',
      localTime: '15:02',
    });
    expect(approx.flags.some((f) => f.type === 'house-if-born')).toBe(true);
  });

  it('unknown time: no angles, no houses, a time-unknown flag', () => {
    const unknown = buildNatalPayload(
      buildChart({ ...carrascal, time: null, timeAccuracy: 'unknown' }),
    );
    expect(unknown.houseSystem).toBeNull();
    expect(unknown.points.map((p) => p.name)).not.toContain('Ascendant');
    expect(unknown.points.every((p) => p.house === null)).toBe(true);
    expect(unknown.flags).toContainEqual({ type: 'time-unknown' });
    expect(unknown.emphasis.stelliums.every((s) => s.by === 'sign')).toBe(true);
  });

  it('Whole Sign charts say so', () => {
    const ws = buildNatalPayload(buildChart(carrascal, { houseSystem: 'whole-sign' }));
    expect(ws.houseSystem).toBe('whole-sign');
  });
});

describe('readingInputHash', () => {
  const payload = buildNatalPayload(buildChart(carrascal));

  it('is a stable 64-char hex digest, independent of key order', async () => {
    const h = await readingInputHash(payload);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    const reordered = JSON.parse(canonicalJson(payload)) as typeof payload;
    expect(await readingInputHash(reordered)).toBe(h);
    expect(await readingInputHash(buildNatalPayload(buildChart(carrascal)))).toBe(h);
  });

  it('changes when the chart changes', async () => {
    const other = buildNatalPayload(buildChart({ ...carrascal, time: '09:00' }));
    expect(await readingInputHash(other)).not.toBe(await readingInputHash(payload));
  });
});
