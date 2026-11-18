import { seededRandom } from '../../lib/astro/__tests__/fixtures.ts';
import { angleDiff, normalizeDeg } from '../../lib/astro/zodiac.ts';
import { WHEEL, forwardMidpoint, polar, spreadLabels } from './wheelGeometry.ts';

describe('polar', () => {
  it('puts the reference longitude (Ascendant) at 9 o’clock', () => {
    expect(polar(217, 100, 217)).toEqual({ x: WHEEL.c - 100, y: WHEEL.c });
  });
  it('runs the zodiac counter-clockwise: +90° from the ASC is at 6 o’clock', () => {
    const p = polar(217 + 90, 100, 217);
    expect(p.x).toBeCloseTo(WHEEL.c);
    expect(p.y).toBeCloseTo(WHEEL.c + 100);
  });
});

describe('spreadLabels', () => {
  it('leaves well-separated labels alone', () => {
    expect(spreadLabels([10, 100, 200], 9)).toEqual([10, 100, 200]);
  });

  it('separates a tight cluster to at least minSep, keeping order and centre', () => {
    const input = [100, 101, 102, 103];
    const out = spreadLabels(input, 9);
    for (let i = 0; i < 3; i++) {
      expect(angleDiff(out[i] as number, out[i + 1] as number)).toBeGreaterThanOrEqual(9 - 1e-6);
    }
    const centre = out.reduce((s, x) => s + x, 0) / 4;
    expect(centre).toBeCloseTo(101.5, 6);
  });

  it('works across 0° Aries', () => {
    const out = spreadLabels([359, 1], 9);
    expect(Math.abs(angleDiff(out[0] as number, out[1] as number))).toBeGreaterThanOrEqual(
      9 - 1e-6,
    );
    expect(Math.abs(angleDiff(out[0] as number, 359))).toBeLessThan(5);
  });

  it('random charts: every neighbour ≥ minSep apart, circular order preserved', () => {
    const rand = seededRandom(7);
    for (let t = 0; t < 300; t++) {
      const centre = rand() * 360;
      const lons = Array.from({ length: 11 }, () => normalizeDeg(centre + (rand() - 0.5) * 120));
      const out = spreadLabels(lons, 9);
      const byIn = lons.map((l, i) => ({ l, o: out[i] as number })).sort((a, b) => a.l - b.l);
      const at = (k: number) => byIn[((k % 11) + 11) % 11] as { l: number; o: number };
      const startIdx = byIn.findIndex((_, k) => normalizeDeg(at(k + 1).l - at(k).l) > 120);
      const seq = [...byIn.slice(startIdx + 1), ...byIn.slice(0, startIdx + 1)];
      for (let k = 0; k < 10; k++) {
        expect(
          normalizeDeg((seq[k + 1] as { o: number }).o - (seq[k] as { o: number }).o),
        ).toBeGreaterThanOrEqual(9 - 1e-6);
      }
    }
  });

  it('keeps input order in the output', () => {
    const out = spreadLabels([200, 10, 11], 9);
    expect(out[0]).toBe(200);
    expect(out[1] as number).toBeLessThan(out[2] as number);
  });
});

describe('forwardMidpoint', () => {
  it('handles wrap-around', () => {
    expect(forwardMidpoint(350, 20)).toBe(5);
    expect(forwardMidpoint(10, 40)).toBe(25);
  });
});
