import { MOON_PHASES, WEEKLY_BODIES, type DailySky, type WeeklySky } from '../astro/horoscope.ts';
import type { SignIndex } from '../astro/types.ts';
import { HOROSCOPE_TEXT, composeDaily, composeWeekly } from './horoscope.ts';

const BANNED = [
  /\bwill\b/i,
  /\b(luck|lucky|fortune|money|rich|win)\b/i,
  /\b(fate|fated|destined|doomed|karma)\b/i,
  /\b(never|always|guarantee\w*)\b/i,
  /\b(accident|death|die|ill|illness|sick|danger\w*|disaster)\b/i,
  /\b(should|must)\b/i,
  /%/,
  /[{}]/,
];

const signs = Array.from({ length: 12 }, (_, i) => i as SignIndex);

function allDailies(): string[] {
  const out: string[] = [];
  for (const reader of signs) {
    for (const moonSign of signs) {
      for (const phase of MOON_PHASES) {
        const sky: DailySky = {
          date: '2026-11-20',
          moonSign,
          phase,
          moonChange: { sign: ((moonSign + 1) % 12) as SignIndex, at: '14:00' },
        };
        const d = composeDaily(reader, sky, { includeDrafts: true });
        out.push(d.focus ?? 'MISSING', d.phase ?? 'MISSING', d.change ?? 'MISSING');
      }
    }
  }
  return out;
}

function allWeeklies(): string[] {
  const out: string[] = [];
  for (const reader of signs) {
    for (const sign of signs) {
      for (const retrograde of [false, true]) {
        const week: WeeklySky = {
          start: '2026-11-23',
          end: '2026-11-29',
          planets: WEEKLY_BODIES.map((body) => ({ body, sign, retrograde })),
          lunations: [
            { kind: 'new', date: '2026-11-24', sign },
            { kind: 'full', date: '2026-11-26', sign },
          ],
        };
        for (const it of composeWeekly(reader, week, { includeDrafts: true }).items) {
          out.push(it.text ?? 'MISSING');
        }
      }
    }
  }
  return out;
}

describe('horoscope.json', () => {
  it('has a focus for every house and a line for every phase', () => {
    for (let h = 1; h <= 12; h++) expect(HOROSCOPE_TEXT.moonHouse[String(h)]).toBeTruthy();
    for (const p of MOON_PHASES) expect(HOROSCOPE_TEXT.phase[p]).toBeTruthy();
  });

  it('every filled-in sentence passes the guardrails (no predictions, luck, fate, advice)', () => {
    for (const text of [...allDailies(), ...allWeeklies()]) {
      expect(text).not.toBe('MISSING');
      for (const re of BANNED) expect(text, `${re} in: ${text}`).not.toMatch(re);
    }
  });
});

describe('composeDaily / composeWeekly', () => {
  const gemini = 2 as SignIndex;

  it('Moon in Pisces is the 10th house for Gemini; sign change names the next house', () => {
    const d = composeDaily(
      gemini,
      {
        date: '2026-11-20',
        moonSign: 11,
        phase: 'waxing-gibbous',
        moonChange: { sign: 0, at: '13:58' },
      },
      { includeDrafts: true },
    );
    expect(d.moonHouse).toBe(10);
    expect(d.focus).toBe(HOROSCOPE_TEXT.moonHouse['10']);
    expect(d.change).toBe(
      'Around 13:58, the Moon moves into your 11th house and the mood shifts toward friends, groups and hopes.',
    );
  });

  it('weekly lists lunations first, then planets with houses from the reader’s sign', () => {
    const w = composeWeekly(
      gemini,
      {
        start: '2026-11-23',
        end: '2026-11-29',
        planets: [{ body: 'Venus', sign: 6, retrograde: false }],
        lunations: [{ kind: 'full', date: '2026-11-24', sign: 2 }],
      },
      { includeDrafts: true },
    );
    expect(w.items.map((i) => i.title)).toEqual(['Full Moon in Gemini · Nov 24', 'Venus in Libra']);
    expect(w.items[0]?.text).toBe(
      'Full Moon in your 1st house on Tuesday, November 24: things around you and how you show up may come to a head. Notice what is ready to be finished or let go.',
    );
    expect(w.items[1]?.text).toMatch(
      /^Venus in your 5th house brings warmth to creativity, romance and fun\./,
    );
  });

  it('hides text until approved', () => {
    if (HOROSCOPE_TEXT.review === 'approved') return;
    const d = composeDaily(gemini, {
      date: '2026-11-20',
      moonSign: 11,
      phase: 'full',
      moonChange: null,
    });
    expect([d.focus, d.phase, d.change]).toEqual([null, null, null]);
  });
});
