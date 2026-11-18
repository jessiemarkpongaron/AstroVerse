import { REFERENCE_CHARTS } from './__tests__/fixtures.ts';
import { BODIES, computePositions } from './positions.ts';
import type { Body } from './types.ts';
import { angleDiff } from './zodiac.ts';

/** Tolerances from docs/ASTRO_ENGINE.md §9 (degrees). */
const HARD_FAIL: Record<Body, number> = {
  Sun: 0.25,
  Mercury: 0.25,
  Venus: 0.25,
  Mars: 0.25,
  Jupiter: 0.25,
  Saturn: 0.25,
  Uranus: 0.25,
  Neptune: 0.25,
  Pluto: 0.25,
  Moon: 0.1,
  NorthNode: 0.1,
};
const TARGET = 0.1;

describe.each(REFERENCE_CHARTS.map((c) => [c.id, c] as const))(
  'positions vs Swiss Ephemeris: %s',
  (_id, ref) => {
    const positions = computePositions(new Date(ref.utc));

    it.each(BODIES.map((b) => [b] as const))('%s longitude within tolerance', (body) => {
      const p = positions.find((x) => x.name === body);
      const err = Math.abs(angleDiff(ref.bodies[body].lon, p?.longitude ?? NaN));
      expect(err).toBeLessThanOrEqual(HARD_FAIL[body]);
      expect(err).toBeLessThanOrEqual(TARGET);
    });

    it.each(BODIES.map((b) => [b] as const))('%s speed and retrograde flag', (body) => {
      const p = positions.find((x) => x.name === body);
      const refSpeed = ref.bodies[body].speed;
      // Our speed is a ±0.5-day central difference; sweph's is instantaneous.
      const tol = body === 'Moon' ? 0.05 : 0.01;
      expect(Math.abs((p?.speed ?? NaN) - refSpeed)).toBeLessThanOrEqual(tol);
      if (body === 'Sun' || body === 'Moon') expect(p?.retrograde).toBe(false);
      else if (Math.abs(refSpeed) > 0.001) expect(p?.retrograde).toBe(refSpeed < 0);
    });

    it('all longitudes are in [0, 360)', () => {
      for (const p of positions) {
        expect(p.longitude).toBeGreaterThanOrEqual(0);
        expect(p.longitude).toBeLessThan(360);
      }
    });
  },
);

describe('positions: retrograde fixtures', () => {
  it('flags Mercury retrograde on 2000-03-01 (New York)', () => {
    const ref = REFERENCE_CHARTS.find((c) => c.id === 'newyork-2000-mercury-rx');
    const merc = computePositions(new Date(ref?.utc ?? NaN)).find((p) => p.name === 'Mercury');
    expect(merc?.retrograde).toBe(true);
  });

  it('mean North Node is always retrograde', () => {
    for (const ref of REFERENCE_CHARTS) {
      const node = computePositions(new Date(ref.utc)).find((p) => p.name === 'NorthNode');
      expect(node?.retrograde).toBe(true);
    }
  });
});

/**
 * Sanity fixture from docs/ASTRO_ENGINE.md §9 (hand-entered, ±1°), May 31 1990 15:30 at
 * Carrascal assuming UTC+8 → 07:30Z. (tzdb says UTC+9 on that date; see time.test.ts.)
 */
describe('sanity fixture: Carrascal 1990-05-31 07:30Z (docs, ±1°)', () => {
  const positions = computePositions(new Date('1990-05-31T07:30:00Z'));
  const get = (b: Body) => positions.find((p) => p.name === b);
  it.each([
    ['Sun', 60 + 9.6, false],
    ['Moon', 150 + 9.2, false],
    ['Mercury', 30 + 15, false],
    ['Venus', 30 + 1, false],
    ['Jupiter', 90 + 13, false],
    ['Saturn', 270 + 25, true],
    ['Pluto', 210 + 16, true],
    ['Mars', 0, false],
  ] as const)('%s ≈ %f°', (body, lon, retro) => {
    const p = get(body);
    expect(Math.abs(angleDiff(lon, p?.longitude ?? NaN))).toBeLessThanOrEqual(1);
    expect(p?.retrograde).toBe(retro);
  });
});
