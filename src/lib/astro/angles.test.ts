import { REFERENCE_CHARTS, seededRandom } from './__tests__/fixtures.ts';
import { ascendantFromRamc, computeAngles, midheavenFromRamc } from './angles.ts';
import { angleDiff, normalizeDeg } from './zodiac.ts';

const ANGLE_TOL = 0.2; // ASTRO_ENGINE §9

describe.each(REFERENCE_CHARTS.map((c) => [c.id, c] as const))(
  'angles vs Swiss Ephemeris: %s',
  (_id, ref) => {
    const a = computeAngles(new Date(ref.utc), ref.input.place.lat, ref.input.place.lon);

    it('RAMC matches', () => {
      expect(Math.abs(angleDiff(ref.armc, a.ramc))).toBeLessThanOrEqual(0.01);
    });
    it('Ascendant within 0.2°', () => {
      expect(Math.abs(angleDiff(ref.ascendant, a.ascendant))).toBeLessThanOrEqual(ANGLE_TOL);
    });
    it('Midheaven within 0.2°', () => {
      expect(Math.abs(angleDiff(ref.midheaven, a.midheaven))).toBeLessThanOrEqual(ANGLE_TOL);
    });
  },
);

describe('sanity fixture: Carrascal 1990-05-31 07:30Z (docs, ±1°)', () => {
  const a = computeAngles(new Date('1990-05-31T07:30:00Z'), 9.37, 125.95);
  it('ASC ≈ Scorpio 7°', () =>
    expect(Math.abs(angleDiff(217, a.ascendant))).toBeLessThanOrEqual(1));
  it('MC ≈ Leo 4.6°', () => expect(Math.abs(angleDiff(124.6, a.midheaven))).toBeLessThanOrEqual(1));
});

describe('angle properties', () => {
  const rand = seededRandom(20261118);
  const cases = Array.from({ length: 2000 }, () => ({
    ramc: rand() * 360,
    obliquity: 23.4 + rand() * 0.1,
    lat: (rand() * 2 - 1) * 66,
  }));

  it('ASC and MC are always in [0, 360)', () => {
    for (const c of cases) {
      for (const v of [
        ascendantFromRamc(c.ramc, c.obliquity, c.lat),
        midheavenFromRamc(c.ramc, c.obliquity),
      ]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(360);
      }
    }
  });

  it('ASC lies within 180° ahead of the MC', () => {
    for (const c of cases) {
      const d = normalizeDeg(
        ascendantFromRamc(c.ramc, c.obliquity, c.lat) - midheavenFromRamc(c.ramc, c.obliquity),
      );
      expect(d).toBeGreaterThan(0);
      expect(d).toBeLessThan(180);
    }
  });

  it('MC is in the same half of the zodiac as RAMC (MC ≈ RAMC at equinox points)', () => {
    expect(midheavenFromRamc(0, 23.44)).toBeCloseTo(0);
    expect(midheavenFromRamc(90, 23.44)).toBeCloseTo(90);
    expect(midheavenFromRamc(180, 23.44)).toBeCloseTo(180);
    expect(midheavenFromRamc(270, 23.44)).toBeCloseTo(270);
  });

  it('at the equator with RAMC 0°, the ASC is 90° (0° Cancer)', () => {
    expect(ascendantFromRamc(0, 23.44, 0)).toBeCloseTo(90);
  });

  it('rejects latitudes at the poles', () => {
    expect(() => ascendantFromRamc(0, 23.44, 90)).toThrow(RangeError);
  });

  it('Ascendant moves forward roughly 1° every 4 minutes or faster', () => {
    const a = computeAngles(new Date('1990-05-31T07:30:00Z'), 9.37, 125.95);
    expect(a.ascendantSpeed).toBeGreaterThan(200);
    expect(a.midheavenSpeed).toBeGreaterThan(300);
  });
});
