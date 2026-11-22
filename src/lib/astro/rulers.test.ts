import { REFERENCE_CHARTS } from './__tests__/fixtures.ts';
import { buildChart } from './chart.ts';
import { TRADITIONAL_RULERS, houseRuler, rulerOf } from './rulers.ts';
import type { SignIndex } from './types.ts';

describe('TRADITIONAL_RULERS', () => {
  it('pairs the signs as in the classical scheme', () => {
    expect(TRADITIONAL_RULERS).toHaveLength(12);
    // Each of Mercury, Venus, Mars, Jupiter, Saturn rules two signs; Sun and Moon one each.
    const counts = TRADITIONAL_RULERS.reduce<Record<string, number>>(
      (a, b) => ({ ...a, [b]: (a[b] ?? 0) + 1 }),
      {},
    );
    expect(counts).toEqual({
      Mars: 2,
      Venus: 2,
      Mercury: 2,
      Moon: 1,
      Sun: 1,
      Jupiter: 2,
      Saturn: 2,
    });
    expect(rulerOf(9 as SignIndex)).toBe('Saturn'); // Capricorn
    expect(rulerOf(3 as SignIndex)).toBe('Moon'); // Cancer
  });
});

/** House of a longitude given 12 cusps (independent of the engine's houseOf). */
function refHouse(lon: number, cusps: number[]): number {
  for (let i = 0; i < 12; i++) {
    const a = cusps[i] as number;
    const span = ((cusps[(i + 1) % 12] as number) - a + 360) % 360;
    if ((lon - a + 360) % 360 < span) return i + 1;
  }
  throw new Error('no house');
}

describe('houseRuler vs Swiss Ephemeris reference charts', () => {
  const charts = REFERENCE_CHARTS.filter((r) => r.input.timeAccuracy !== 'unknown');

  it.each(charts.map((r) => [r.id, r] as const))('%s', (_id, ref) => {
    const chart = buildChart(ref.input);
    if (chart.houses?.system !== 'placidus') return; // polar fallback: covered elsewhere
    for (const house of [10, 6, 2]) {
      const cusp = ref.cusps.placidus[house - 1] as number;
      const cuspSign = Math.floor(cusp / 30) as SignIndex;
      if (Math.abs(cusp - Math.round(cusp / 30) * 30) < 0.01) continue; // on a sign edge
      const ruler = TRADITIONAL_RULERS[cuspSign] as keyof typeof ref.bodies;
      const lon = ref.bodies[ruler].lon;
      const got = houseRuler(chart, house);
      expect(got).toMatchObject({
        house,
        cuspSign,
        ruler,
        rulerSign: Math.floor(lon / 30),
        rulerHouse: refHouse(lon, ref.cusps.placidus),
      });
    }
  });

  it('is null without a birth time', () => {
    const ref = charts[0] as (typeof charts)[number];
    const chart = buildChart({ ...ref.input, time: null, timeAccuracy: 'unknown' });
    expect(houseRuler(chart, 10)).toBeNull();
  });
});
