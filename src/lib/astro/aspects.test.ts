import { aspectBetween, findAspects, type AspectPoint } from './aspects.ts';

const pt = (name: AspectPoint['name'], longitude: number, speed = 0): AspectPoint => ({
  name,
  longitude,
  speed,
});

describe('aspectBetween', () => {
  it.each([
    ['conjunction', 0],
    ['sextile', 60],
    ['square', 90],
    ['trine', 120],
    ['opposition', 180],
  ] as const)('finds an exact %s', (type, angle) => {
    expect(aspectBetween(pt('Mars', 10), pt('Venus', 10 + angle))).toMatchObject({ type, orb: 0 });
  });

  it('measures across 0° Aries', () => {
    expect(aspectBetween(pt('Mars', 355), pt('Venus', 3))).toMatchObject({
      type: 'conjunction',
      orb: 8,
    });
  });

  it('uses wider orbs when the Sun or Moon is involved', () => {
    // Conjunction orb: 10° luminaries, 8° others.
    expect(aspectBetween(pt('Sun', 0), pt('Mars', 9.5))?.type).toBe('conjunction');
    expect(aspectBetween(pt('Venus', 0), pt('Mars', 9.5))).toBeNull();
    // Sextile orb: 6° luminaries, 4° others.
    expect(aspectBetween(pt('Moon', 0), pt('Mars', 65.5))?.type).toBe('sextile');
    expect(aspectBetween(pt('Venus', 0), pt('Mars', 64.5))).toBeNull();
    expect(aspectBetween(pt('Venus', 0), pt('Mars', 64))?.type).toBe('sextile');
  });

  it('uses "others" orbs for angles and skips ASC–MC', () => {
    expect(aspectBetween(pt('Ascendant', 0), pt('Mars', 8))?.type).toBe('conjunction');
    expect(aspectBetween(pt('Ascendant', 0), pt('Mars', 8.5))).toBeNull();
    expect(aspectBetween(pt('Ascendant', 0), pt('Midheaven', 90))).toBeNull();
  });

  it('applying when the faster body closes the gap; separating otherwise', () => {
    // Moon (fast) behind Mars and moving toward it → applying conjunction.
    expect(aspectBetween(pt('Moon', 5, 13), pt('Mars', 10, 0.5))?.applying).toBe(true);
    // Moon past Mars → separating.
    expect(aspectBetween(pt('Moon', 15, 13), pt('Mars', 10, 0.5))?.applying).toBe(false);
    // Retrograde Mercury moving back toward Venus → applying.
    expect(aspectBetween(pt('Mercury', 20, -1), pt('Venus', 15, 1.2))?.applying).toBe(true);
  });

  it('treats angles as fixed for applying/separating', () => {
    expect(aspectBetween(pt('Ascendant', 10, 360), pt('Mars', 5, 0.5))?.applying).toBe(true);
    expect(aspectBetween(pt('Ascendant', 10, 360), pt('Mars', 15, 0.5))?.applying).toBe(false);
  });
});

describe('findAspects', () => {
  it('returns each pair once, a before b', () => {
    const asp = findAspects([pt('Sun', 0), pt('Moon', 120), pt('Mars', 240)]);
    expect(asp.map((a) => `${a.a}-${a.b}-${a.type}`)).toEqual([
      'Sun-Moon-trine',
      'Sun-Mars-trine',
      'Moon-Mars-trine',
    ]);
  });
});
