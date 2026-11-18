import { formatLongitude } from './format.ts';
import { angleDiff, degreeInSign, normalizeDeg, signName, signOf } from './zodiac.ts';

describe('zodiac helpers', () => {
  it('normalizes to [0, 360)', () => {
    expect(normalizeDeg(360)).toBe(0);
    expect(normalizeDeg(-30)).toBe(330);
    expect(normalizeDeg(725)).toBe(5);
    expect(Object.is(normalizeDeg(-0), 0)).toBe(true);
    expect(normalizeDeg(-1e-14)).toBeLessThan(360);
  });

  it('computes shortest signed difference across 0°', () => {
    expect(angleDiff(359, 1)).toBeCloseTo(2);
    expect(angleDiff(1, 359)).toBeCloseTo(-2);
    expect(angleDiff(0, 180)).toBe(180);
  });

  it('maps longitudes to signs (0 = Aries)', () => {
    expect(signOf(0)).toBe(0);
    expect(signOf(29.9999)).toBe(0);
    expect(signOf(30)).toBe(1);
    expect(signOf(359.99)).toBe(11);
    expect(signName(signOf(69.6))).toBe('Gemini');
    expect(degreeInSign(69.6)).toBeCloseTo(9.6);
  });
});

describe('formatLongitude', () => {
  it('formats degree, minute and sign', () => {
    expect(formatLongitude(45.2)).toBe("15°12' Taurus");
    expect(formatLongitude(0)).toBe("0°00' Aries");
  });

  it('carries rounding into the next sign and wraps at 360°', () => {
    expect(formatLongitude(29.9995)).toBe("0°00' Taurus");
    expect(formatLongitude(359.9999)).toBe("0°00' Aries");
  });
});
