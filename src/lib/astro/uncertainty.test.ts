import { findSwitch, formatLocalClock, localHHmm, ordinal, signCuspFlags } from './uncertainty.ts';

describe('helpers', () => {
  it('ordinal', () => {
    expect([1, 2, 3, 4, 11, 12].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th']);
  });

  it('formatLocalClock applies the birthplace offset', () => {
    expect(formatLocalClock(Date.UTC(1990, 4, 31, 7, 2), 480)).toBe('3:02 PM');
    expect(formatLocalClock(Date.UTC(1990, 4, 31, 16, 0), 480)).toBe('12:00 AM');
    expect(formatLocalClock(Date.UTC(1990, 4, 31, 4, 5), 480)).toBe('12:05 PM');
  });

  it('localHHmm gives 24-hour birthplace time', () => {
    expect(localHHmm(Date.UTC(1990, 4, 31, 7, 2), 480)).toBe('15:02');
    expect(localHHmm(Date.UTC(1990, 4, 31, 16, 0), 480)).toBe('00:00');
    expect(localHHmm(Date.UTC(1990, 4, 31, 0, 5), -300)).toBe('19:05');
  });

  it('findSwitch bisects to the first minute with the new value', () => {
    const switchAt = Date.UTC(2000, 0, 1, 12, 17, 30);
    const f = (ms: number) => (ms >= switchAt ? 'B' : 'A');
    const lo = Date.UTC(2000, 0, 1, 12, 0);
    const hi = Date.UTC(2000, 0, 1, 12, 30);
    expect(new Date(findSwitch(f, lo, hi)).toISOString()).toBe('2000-01-01T12:18:00.000Z');
  });
});

describe('signCuspFlags', () => {
  it('flags points within 1° of a sign boundary (both sides)', () => {
    const flags = signCuspFlags(
      { Mars: 0.2, Venus: 59.5, Jupiter: 45 },
      { moonSpeed: 13, windowMinutes: 0 },
    );
    expect(flags.map((f) => f.point)).toEqual(['Mars', 'Venus']);
    expect(flags[0]?.message).toMatch(/Mars is at 0°12' Aries, just past the edge of Pisces/);
    expect(flags[1]?.message).toMatch(/very close to Gemini/);
  });

  it('widens the Moon threshold by its movement over the window', () => {
    // 13°/day over 3 h = 1.625° > 1°.
    const opts = { moonSpeed: 13, windowMinutes: 180 };
    expect(signCuspFlags({ Moon: 31.5 }, opts)).toHaveLength(1);
    expect(signCuspFlags({ Moon: 31.5 }, { moonSpeed: 13, windowMinutes: 0 })).toHaveLength(0);
  });

  it('skips points already flagged', () => {
    expect(
      signCuspFlags({ Mars: 0.2 }, { moonSpeed: 13, windowMinutes: 0, skip: new Set(['Mars']) }),
    ).toEqual([]);
  });
});
