import { buildChart } from './chart.ts';
import {
  SYNASTRY_ORBS,
  bandStrength,
  compareCharts,
  crossAspects,
  isKeyContact,
  synastryBand,
  type SynastryAspect,
} from './synastry.ts';
import type { BirthInput, PointName } from './types.ts';

const pt = (name: PointName, longitude: number) => ({ name, longitude });

describe('crossAspects', () => {
  it('finds an aspect between the two charts, with the orb', () => {
    const [x] = crossAspects([pt('Venus', 10)], [pt('Mars', 132)]);
    expect(x).toMatchObject({ a: 'Venus', b: 'Mars', type: 'trine', band: 'harmony', key: true });
    expect(x?.orb).toBeCloseTo(2, 6);
  });

  it('uses synastry orbs: luminaries get more room than other points', () => {
    // Square, 5.5° off: in orb for Sun (6°) but not for Mercury–Mars (5°).
    expect(crossAspects([pt('Sun', 0)], [pt('Mars', 95.5)])).toHaveLength(1);
    expect(crossAspects([pt('Mercury', 0)], [pt('Mars', 95.5)])).toHaveLength(0);
    expect(SYNASTRY_ORBS.sextile).toEqual([4, 3]);
  });

  it('is symmetric: swapping the people swaps a and b', () => {
    const A = [pt('Sun', 70), pt('Moon', 160), pt('Venus', 40), pt('Ascendant', 220)];
    const B = [pt('Sun', 250), pt('Moon', 75), pt('Mars', 38), pt('Saturn', 160)];
    const ab = crossAspects(A, B).map((x) => `${x.a}|${x.b}|${x.type}|${x.orb.toFixed(6)}`);
    const ba = crossAspects(B, A).map((x) => `${x.b}|${x.a}|${x.type}|${x.orb.toFixed(6)}`);
    expect(new Set(ab)).toEqual(new Set(ba));
  });

  it('ignores outer planets and the node (generational)', () => {
    expect(crossAspects([pt('Pluto', 0), pt('NorthNode', 0)], [pt('Sun', 0)])).toEqual([]);
  });

  it('puts key contacts first, then sorts by orb', () => {
    const list = crossAspects(
      [pt('Mercury', 0), pt('Venus', 0)],
      [pt('Mercury', 0.5), pt('Mars', 3)],
    );
    expect(list[0]).toMatchObject({ a: 'Venus', b: 'Mars', key: true });
    expect(list.filter((x) => !x.key).map((x) => x.orb)).toEqual(
      [...list.filter((x) => !x.key).map((x) => x.orb)].sort((p, q) => p - q),
    );
  });
});

describe('bands', () => {
  it.each([
    ['Sun', 'Moon', 'trine', 'harmony'],
    ['Venus', 'Mars', 'conjunction', 'harmony'],
    ['Sun', 'Venus', 'conjunction', 'harmony'],
    ['Mars', 'Sun', 'conjunction', 'growth'],
    ['Saturn', 'Moon', 'trine', 'growth'],
    ['Venus', 'Saturn', 'square', 'growth'],
    ['Moon', 'Moon', 'square', 'challenges'],
    ['Mars', 'Mars', 'opposition', 'challenges'],
  ] as const)('%s–%s %s → %s', (a, b, type, band) => {
    expect(synastryBand(a, b, type)).toBe(band);
  });

  it('key contacts: Venus–Mars, Sun–Moon, Moon–Moon, Rising links', () => {
    expect(isKeyContact('Mars', 'Venus')).toBe(true);
    expect(isKeyContact('Moon', 'Sun')).toBe(true);
    expect(isKeyContact('Moon', 'Moon')).toBe(true);
    expect(isKeyContact('Ascendant', 'Venus')).toBe(true);
    expect(isKeyContact('Mercury', 'Mars')).toBe(false);
  });

  it('strength is a word from a weighted count, never a percentage', () => {
    const mk = (key: boolean): SynastryAspect => ({
      a: 'Sun',
      b: 'Moon',
      type: 'trine',
      orb: 1,
      band: 'harmony',
      key,
    });
    expect(bandStrength([], 'harmony')).toBe('light');
    expect(bandStrength([mk(true), mk(false)], 'harmony')).toBe('some');
    expect(bandStrength([mk(true), mk(true), mk(true)], 'harmony')).toBe('strong');
    expect(bandStrength([mk(true), mk(true), mk(true)], 'challenges')).toBe('light');
  });
});

describe('compareCharts', () => {
  const carrascal: BirthInput = {
    date: '1990-05-31',
    time: '15:30',
    timeAccuracy: 'exact',
    place: { name: 'Carrascal', lat: 9.37028, lon: 125.94917, tz: 'Asia/Manila' },
  };
  const partner: BirthInput = {
    date: '1992-11-08',
    time: '08:15',
    timeAccuracy: 'exact',
    place: { name: 'Manila', lat: 14.5995, lon: 120.9842, tz: 'Asia/Manila' },
  };

  it('splits aspects into the three bands and rates each', () => {
    const s = compareCharts(buildChart(carrascal), buildChart(partner));
    expect(s.aspects.length).toBeGreaterThan(0);
    const total =
      s.bands.harmony.aspects.length +
      s.bands.growth.aspects.length +
      s.bands.challenges.aspects.length;
    expect(total).toBe(s.aspects.length);
    for (const b of Object.values(s.bands))
      expect(['strong', 'some', 'light']).toContain(b.strength);
    expect(s.leftOut).toEqual({ first: [], second: [] });
  });

  it('leaves out the Moon and Rising of a person with an unknown birth time', () => {
    const s = compareCharts(
      buildChart(carrascal),
      buildChart({ ...partner, time: null, timeAccuracy: 'unknown' }),
    );
    expect(s.aspects.some((x) => x.b === 'Moon' || x.b === 'Ascendant')).toBe(false);
    expect(s.aspects.some((x) => x.a === 'Moon')).toBe(true);
    expect(s.leftOut.second).toEqual(['Moon', 'Ascendant']);
  });

  it('comparing a chart with itself gives conjunctions on every point', () => {
    const c = buildChart(carrascal);
    const s = compareCharts(c, c);
    for (const name of ['Sun', 'Moon', 'Venus', 'Ascendant'] as const) {
      expect(s.aspects).toContainEqual(
        expect.objectContaining({ a: name, b: name, type: 'conjunction', orb: 0 }),
      );
    }
  });
});
