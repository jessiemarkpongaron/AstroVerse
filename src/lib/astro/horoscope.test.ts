import type { SignIndex } from './types.ts';
import { dailySky, moonPhaseName, solarHouse, todayIn, weekStart, weeklySky } from './horoscope.ts';

/**
 * Reference values from the Swiss Ephemeris (sweph, Moshier; dev-only, 10-minute steps):
 * Moon enters Pisces 2026-11-17 21:20 UTC and Aries 2026-11-20 06:00 UTC; New Moon
 * 2026-11-09 07:10 UTC in Scorpio; Full Moon 2026-11-24 15:00 UTC in Gemini. On 2026-11-19
 * 04:00 UTC: Sun and Mercury in Scorpio (direct), Venus in Libra, Mars in Leo.
 */
describe('horoscope sky', () => {
  it('names Moon phases in 45° buckets', () => {
    expect(moonPhaseName(0)).toBe('new');
    expect(moonPhaseName(350)).toBe('new');
    expect(moonPhaseName(45)).toBe('waxing-crescent');
    expect(moonPhaseName(90)).toBe('first-quarter');
    expect(moonPhaseName(180)).toBe('full');
    expect(moonPhaseName(270)).toBe('last-quarter');
    expect(moonPhaseName(315)).toBe('waning-crescent');
  });

  it('counts whole-sign houses from the reader’s sign', () => {
    expect(solarHouse(2 as SignIndex, 2 as SignIndex)).toBe(1);
    expect(solarHouse(2 as SignIndex, 11 as SignIndex)).toBe(10);
    expect(solarHouse(11 as SignIndex, 0 as SignIndex)).toBe(2);
  });

  it('uses the Philippine calendar day', () => {
    expect(todayIn('Asia/Manila', new Date('2026-11-18T16:30:00Z'))).toBe('2026-11-19');
    expect(weekStart('2026-11-19')).toBe('2026-11-16');
    expect(weekStart('2026-11-22')).toBe('2026-11-16');
  });

  it('2026-11-19: Moon in Pisces all day', () => {
    expect(dailySky('2026-11-19')).toMatchObject({ moonSign: 11, moonChange: null });
  });

  it('2026-11-20: Moon in Pisces at noon, enters Aries around 14:00 Manila time', () => {
    const d = dailySky('2026-11-20');
    expect(d.moonSign).toBe(11);
    expect(d.moonChange?.sign).toBe(0);
    const [h, m] = (d.moonChange?.at ?? '').split(':').map(Number) as [number, number];
    expect(Math.abs(h * 60 + m - 14 * 60)).toBeLessThanOrEqual(15);
  });

  it('phases on New and Full Moon days', () => {
    expect(dailySky('2026-11-09').phase).toBe('new');
    expect(dailySky('2026-11-24').phase).toBe('full');
  });

  it('week of 2026-11-16: mid-week planets, no lunation', () => {
    const w = weeklySky('2026-11-19');
    expect(w).toMatchObject({ start: '2026-11-16', end: '2026-11-22', lunations: [] });
    expect(w.planets.map((p) => [p.body, p.sign])).toEqual([
      ['Sun', 7],
      ['Mercury', 7],
      ['Venus', 6],
      ['Mars', 4],
    ]);
  });

  it('lunations fall in the right local week, with their sign', () => {
    expect(weeklySky('2026-11-25').lunations).toEqual([
      { kind: 'full', date: '2026-11-24', sign: 2 },
    ]);
    expect(weeklySky('2026-11-12').lunations).toEqual([
      { kind: 'new', date: '2026-11-09', sign: 7 },
    ]);
  });
});
