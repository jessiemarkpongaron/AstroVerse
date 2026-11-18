import { MakeTime } from 'astronomy-engine';
import { REFERENCE_CHARTS, seededRandom } from './__tests__/fixtures.ts';
import { ascendantFromRamc, midheavenFromRamc, obliquityAt, ramcAt } from './angles.ts';
import { computeHouses, houseOf, placidusCusps, porphyryCusps, wholeSignCusps } from './houses.ts';
import { angleDiff, normalizeDeg } from './zodiac.ts';

const CUSP_TOL = 0.3; // ASTRO_ENGINE §9

function maxErr(a: readonly number[], b: readonly number[]) {
  return Math.max(...a.map((x, i) => Math.abs(angleDiff(x, b[i] as number))));
}

describe.each(REFERENCE_CHARTS.map((c) => [c.id, c] as const))(
  'house cusps vs Swiss Ephemeris: %s',
  (_id, ref) => {
    const time = MakeTime(new Date(ref.utc));
    const input = {
      ramc: ramcAt(time, ref.input.place.lon),
      obliquity: obliquityAt(time),
      latitude: ref.input.place.lat,
    };
    const asc = ascendantFromRamc(input.ramc, input.obliquity, input.latitude);
    const mc = midheavenFromRamc(input.ramc, input.obliquity);

    it('Placidus within 0.3°', () => {
      expect(maxErr(placidusCusps(input) ?? [], ref.cusps.placidus)).toBeLessThanOrEqual(CUSP_TOL);
    });
    it('Porphyry within 0.3°', () => {
      expect(maxErr(porphyryCusps(asc, mc), ref.cusps.porphyry)).toBeLessThanOrEqual(CUSP_TOL);
    });
    it('Whole Sign exact', () => {
      expect(wholeSignCusps(asc)).toEqual(ref.cusps.wholeSign);
    });
  },
);

describe('house properties', () => {
  const rand = seededRandom(42);
  const cases = Array.from({ length: 500 }, () => ({
    ramc: rand() * 360,
    obliquity: 23.43 + rand() * 0.03,
    latitude: (rand() * 2 - 1) * 66,
  }));

  function checkCusps(cusps: readonly number[]) {
    expect(cusps).toHaveLength(12);
    let total = 0;
    for (let i = 0; i < 12; i++) {
      const c = cusps[i] as number;
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(360);
      const gap = normalizeDeg((cusps[(i + 1) % 12] as number) - c);
      expect(gap).toBeGreaterThan(0); // strictly increasing (mod 360)
      total += gap;
      if (i < 6) {
        expect(Math.abs(angleDiff(c, cusps[i + 6] as number))).toBeCloseTo(180, 9); // opposite cusps
      }
    }
    expect(total).toBeCloseTo(360, 6);
  }

  it('Placidus: 12 increasing cusps, opposites 180° apart, ASC/MC on cusps 1/10', () => {
    for (const c of cases) {
      const cusps = placidusCusps(c);
      expect(cusps).not.toBeNull();
      checkCusps(cusps ?? []);
      expect(cusps?.[0]).toBeCloseTo(ascendantFromRamc(c.ramc, c.obliquity, c.latitude), 9);
      expect(cusps?.[9]).toBeCloseTo(midheavenFromRamc(c.ramc, c.obliquity), 9);
    }
  });

  it('Porphyry and Whole Sign: valid cusp sets', () => {
    for (const c of cases) {
      const asc = ascendantFromRamc(c.ramc, c.obliquity, c.latitude);
      checkCusps(porphyryCusps(asc, midheavenFromRamc(c.ramc, c.obliquity)));
      checkCusps(wholeSignCusps(asc));
    }
  });

  it('at the equator, Placidus cusps 11/12 sit at RA = RAMC + 30°/60°', () => {
    // Sanity: Placidus at latitude 0 has DSA = 90° for all points, so cusp RA = RAMC + 30k.
    const cusps = placidusCusps({ ramc: 0, obliquity: 23.44, latitude: 0 }) ?? [];
    const raOf = (lon: number) =>
      normalizeDeg(
        (Math.atan2(
          Math.sin((lon * Math.PI) / 180) * Math.cos((23.44 * Math.PI) / 180),
          Math.cos((lon * Math.PI) / 180),
        ) *
          180) /
          Math.PI,
      );
    expect(raOf(cusps[10] as number)).toBeCloseTo(30, 6); // cusp 11
    expect(raOf(cusps[11] as number)).toBeCloseTo(60, 6); // cusp 12
  });
});

describe('Porphyry fallback', () => {
  it('uses Porphyry above 66° latitude (Tromsø 69.65°N)', () => {
    const r = computeHouses({ ramc: 123, obliquity: 23.44, latitude: 69.65 }, 'placidus');
    expect(r.system).toBe('porphyry');
    expect(r.fellBack).toBe(true);
  });

  it('keeps Placidus at 60°N', () => {
    const r = computeHouses({ ramc: 123, obliquity: 23.44, latitude: 60 }, 'placidus');
    expect(r.system).toBe('placidus');
    expect(r.fellBack).toBe(false);
  });

  it('Whole Sign is used at any latitude when chosen', () => {
    const r = computeHouses({ ramc: 123, obliquity: 23.44, latitude: 78 }, 'whole-sign');
    expect(r.system).toBe('whole-sign');
  });
});

describe('houseOf', () => {
  const cusps = [350, 20, 50, 80, 110, 140, 170, 200, 230, 260, 290, 320];
  it.each([
    [355, 1],
    [5, 1], // wraps across 0°
    [350, 1], // exactly on a cusp → that house
    [19.999, 1],
    [20, 2],
    [345, 12],
    [175, 7],
  ])('%f° → house %i', (lon, house) => {
    expect(houseOf(lon, cusps)).toBe(house);
  });
});
