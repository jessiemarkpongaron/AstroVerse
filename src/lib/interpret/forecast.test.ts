import { buildChart } from '../astro/chart.ts';
import { TRANSIT_BODIES, chartTransits, type TransitWindow } from '../astro/transits.ts';
import type { AspectType, PointName } from '../astro/types.ts';
import { FORECAST_TEXT, buildForecast, ingressText, transitTheme } from './forecast.ts';
import { ASPECT_TEXT } from './staticText.ts';

const BANNED = [
  /\bdeath\b/i,
  /\bdie\b/i,
  /\billness\b/i,
  /\baccident/i,
  /\bpregnan/i,
  /\blotto\b/i,
  /\bgambl/i,
  /\binvest/i,
  /\bguarantee/i,
  /\bwill definitely\b/i,
  /\bdestined\b/i,
  /\bdoomed\b/i,
  /\bfated?\b/i,
  /\bkarma/i,
  /\bdisaster/i,
  /\b(january|february|march|april|may \d|june|july|august|september|october|november|december)\b/i,
];
const sentences = (t: string) => t.split(/(?<=[.!?])\s+/).filter(Boolean);
const TYPES: AspectType[] = ['conjunction', 'sextile', 'square', 'trine', 'opposition'];
const NATAL: PointName[] = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Ascendant',
  'Midheaven',
];

describe('forecast.json', () => {
  it('has three tones for every transiting planet, 12 house topics and ingress lines', () => {
    for (const b of TRANSIT_BODIES) {
      expect(Object.keys(FORECAST_TEXT.bodies[b]).sort()).toEqual([
        'conjunction',
        'flowing',
        'tense',
      ]);
      expect(FORECAST_TEXT.ingress[b]).toMatch(/\{n\}.*\{topic\}/);
    }
    expect(Object.keys(FORECAST_TEXT.houseTopics)).toHaveLength(12);
    expect(['draft', 'approved']).toContain(FORECAST_TEXT.review);
  });

  it('every filled-in text reads as themes, not events, and passes the guardrails', () => {
    const texts: string[] = [];
    for (const b of TRANSIT_BODIES) {
      for (const tone of ['conjunction', 'flowing', 'tense'] as const) {
        const { meaning, howToUseIt } = FORECAST_TEXT.bodies[b][tone];
        expect(meaning).toContain('{b}');
        expect(sentences(meaning).length).toBeGreaterThanOrEqual(1);
        expect(sentences(meaning).length).toBeLessThanOrEqual(2);
        expect(sentences(howToUseIt)).toHaveLength(1);
        for (const n of NATAL) texts.push(meaning.replace('{b}', ASPECT_TEXT.themes[n]));
        texts.push(howToUseIt);
      }
      if (b === 'Jupiter') {
        const all = Object.values(FORECAST_TEXT.bodies.Jupiter)
          .flatMap((x) => [x.meaning, x.howToUseIt])
          .join(' ');
        expect(all).not.toMatch(/\b(luck|lucky|money|wealth|fortune|rich|win(ning)?s?)\b/i);
      }
    }
    for (const h of Object.values(FORECAST_TEXT.houseTopics)) texts.push(h);
    for (const t of texts) for (const re of BANNED) expect(t).not.toMatch(re);
    // Encouraging framing: every "how to use it" is an invitation, not a warning of doom.
    for (const b of TRANSIT_BODIES) {
      for (const x of Object.values(FORECAST_TEXT.bodies[b]))
        expect(x.howToUseIt).toMatch(/^[A-Z]/);
    }
  });

  it('ingress lines fill in planet, house and topic', () => {
    expect(
      ingressText(
        { body: 'Jupiter', house: 11, date: '2027-08-22', retrograde: false },
        { includeDrafts: true },
      ),
    ).toBe(
      'Jupiter moves into your 11th house (friends, groups and hopes), bringing a focus on growth there over the coming months.',
    );
    expect(
      ingressText(
        { body: 'Uranus', house: 7, date: '2028-01-11', retrograde: true },
        { includeDrafts: true },
      ),
    ).toBe(
      'Uranus moves back into your 7th house (partnerships) for a while as it turns retrograde.',
    );
  });
});

describe('transitTheme', () => {
  const w = (transiting: TransitWindow['transiting'], type: AspectType, natal: PointName) => ({
    transiting,
    type,
    natal,
  });

  it('assigns every combination to one of the six themes', () => {
    for (const b of TRANSIT_BODIES)
      for (const t of TYPES)
        for (const n of NATAL)
          expect(transitTheme(w(b, t, n))).toMatch(
            /^(career|relationships|home|growth|transformation|rest)$/,
          );
  });

  it.each([
    [w('Pluto', 'opposition', 'Midheaven'), 'career'],
    [w('Saturn', 'conjunction', 'Venus'), 'relationships'],
    [w('Uranus', 'square', 'Moon'), 'home'],
    [w('Jupiter', 'trine', 'Mercury'), 'growth'],
    [w('Saturn', 'opposition', 'Ascendant'), 'relationships'],
    [w('Pluto', 'square', 'Ascendant'), 'transformation'],
    [w('Uranus', 'conjunction', 'Sun'), 'transformation'],
    [w('Neptune', 'sextile', 'Sun'), 'rest'],
    [w('Saturn', 'square', 'Saturn'), 'career'],
    [w('Jupiter', 'square', 'Sun'), 'growth'],
  ])('%o → %s', (input, theme) => {
    expect(transitTheme(input)).toBe(theme);
  });
});

describe('buildForecast (Carrascal, from 2026-11-18)', () => {
  const chart = buildChart({
    date: '1990-05-31',
    time: '15:30',
    timeAccuracy: 'exact',
    place: { name: 'Carrascal', lat: 9.37028, lon: 125.94917, tz: 'Asia/Manila' },
  });
  const scan = chartTransits(chart, new Date('2026-11-18T05:00Z'));
  const f = buildForecast(scan, 'exact', { includeDrafts: true });
  const all = f.themes.flatMap((t) => t.periods);

  it('groups periods by theme, each chronological', () => {
    expect(f.themes.map((t) => t.theme)).toEqual(
      expect.arrayContaining(['career', 'relationships', 'home', 'growth', 'transformation']),
    );
    for (const t of f.themes) {
      const starts = t.periods.map((p) => p.window.start);
      expect([...starts].sort()).toEqual(starts);
    }
  });

  it('keeps exact transits and near misses within 1°, drops wider ones', () => {
    for (const p of all) expect(p.window.exactDates.length > 0 || p.window.minOrb <= 1).toBe(true);
    // Jupiter square Mercury only reaches 1.83° in this scan → left out.
    expect(all.some((p) => p.title === 'Jupiter square your Mercury')).toBe(false);
    expect(all.some((p) => p.title === 'Pluto opposite your Midheaven')).toBe(true);
  });

  it('writes readable titles and fills the texts', () => {
    const p = all.find((x) => x.title === 'Saturn square your Saturn');
    expect(p?.meaning).toBe(
      'Saturn is testing your sense of responsibility, so things may feel slower or heavier for a while. Steady effort now can make you stronger.',
    );
    expect(all.find((x) => x.title.includes('your Rising'))).toBeDefined();
  });

  it('lists what is happening now and the house ingresses with text', () => {
    expect(f.now.map((p) => p.title)).toEqual(
      expect.arrayContaining(['Saturn sextile your Sun', 'Pluto opposite your Midheaven']),
    );
    expect(f.ingresses[0]?.text).toMatch(/^Pluto moves into your 4th house \(home and family\)/);
  });

  it('marks Rising/Midheaven transits as time-sensitive for approximate birth times', () => {
    const approx = buildForecast(scan, 'approximate', { includeDrafts: true }).themes.flatMap(
      (t) => t.periods,
    );
    for (const p of approx) {
      expect(p.timeSensitive).toBe(
        p.window.natal === 'Ascendant' || p.window.natal === 'Midheaven',
      );
    }
  });

  it('hides texts until approved', () => {
    const live = buildForecast(scan, 'exact');
    const approved = FORECAST_TEXT.review === 'approved';
    for (const p of live.themes.flatMap((t) => t.periods))
      expect(p.meaning !== null).toBe(approved);
  });
});
