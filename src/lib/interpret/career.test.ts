import { buildChart } from '../astro/chart.ts';
import { chartTransits } from '../astro/transits.ts';
import type { BirthInput } from '../astro/types.ts';
import { CAREER_TEXT, ELEMENTS, composeCareer, elementCounts } from './career.ts';
import { buildForecast } from './forecast.ts';

const carrascal: BirthInput = {
  date: '1990-05-31',
  time: '15:30',
  timeAccuracy: 'exact',
  place: { name: 'Carrascal', lat: 9.37028, lon: 125.94917, tz: 'Asia/Manila' },
};

const BANNED = [
  /\bguarantee/i,
  /\bwill (become|be|earn|make)\b/i,
  /\b(rich|wealth|fortune|luck|lucky|salary|income|money)\b/i,
  /\binvest/i,
  /\bgambl/i,
  /\bdestined\b/i,
  /\bmust\b/i,
  /\bshould\b/i,
];

describe('career.json', () => {
  it('has a work-style line and 4 paths for each element', () => {
    for (const el of ELEMENTS) {
      expect(CAREER_TEXT.workStyle[el]).toMatch(
        new RegExp(`^Your chart leans toward ${el}, so you may`),
      );
      expect(CAREER_TEXT.paths[el]).toHaveLength(4);
    }
    expect(['draft', 'approved']).toContain(CAREER_TEXT.review);
  });

  it('paths suggest, never promise or instruct, and stay clear of money talk', () => {
    const texts = ELEMENTS.flatMap((el) => [
      CAREER_TEXT.workStyle[el],
      ...CAREER_TEXT.paths[el].flatMap((p) => [p.title, p.why]),
    ]);
    for (const t of texts) for (const re of BANNED) expect(t).not.toMatch(re);
    for (const el of ELEMENTS) {
      for (const p of CAREER_TEXT.paths[el]) {
        expect(p.why).toMatch(/\b(may|can)\b/);
        expect(p.why.split(/(?<=[.!?])\s+/)).toHaveLength(1);
      }
    }
    const titles = ELEMENTS.flatMap((el) => CAREER_TEXT.paths[el].map((p) => p.title));
    expect(new Set(titles).size).toBe(titles.length);
  });
});

describe('composeCareer (Carrascal)', () => {
  const chart = buildChart(carrascal);
  const forecast = buildForecast(chartTransits(chart, new Date('2026-11-18T05:00Z')), 'exact', {
    includeDrafts: true,
  });
  const career = composeCareer(chart, forecast, { includeDrafts: true });

  it('counts elements over the 10 planets, strongest first', () => {
    const counts = elementCounts(chart);
    expect(counts.reduce((s, e) => s + e.count, 0)).toBe(10);
    for (let i = 1; i < counts.length; i++) {
      expect((counts[i - 1] as { count: number }).count).toBeGreaterThanOrEqual(
        (counts[i] as { count: number }).count,
      );
    }
  });

  it('starts the direction with the Midheaven, then 10th/6th/2nd-house planets', () => {
    expect(career.direction[0]?.placement).toBe('Midheaven in Leo');
    for (const i of career.direction.slice(1)) {
      expect(i.placement).toMatch(/in the (10th|6th|2nd) house$/);
    }
    // Venus is in the 6th house for this chart.
    expect(career.direction.map((i) => i.placement)).toContain('Venus in the 6th house');
  });

  it('describes how you work through Mars and Saturn, with up to 6 distinct strengths', () => {
    expect(career.howYouWork.map((i) => i.placement)).toEqual([
      'Mars in Aries',
      'Saturn in Capricorn',
    ]);
    expect(career.strengths.length).toBeGreaterThan(2);
    expect(career.strengths.length).toBeLessThanOrEqual(6);
    expect(new Set(career.strengths).size).toBe(career.strengths.length);
  });

  it('suggests 5 paths: 3 from the strongest element and 2 from the next', () => {
    const [first, second] = elementCounts(chart);
    expect(career.paths).toHaveLength(5);
    expect(career.paths.slice(0, 3).every((p) => p.element === first?.element)).toBe(true);
    expect(career.paths.slice(3).every((p) => p.element === second?.element)).toBe(true);
    expect(career.workStyle).toMatch(new RegExp(`leans toward ${first?.element}`));
  });

  it('takes timing from career-themed forecast periods (up to 4)', () => {
    expect(career.timing.length).toBeGreaterThan(0);
    expect(career.timing.length).toBeLessThanOrEqual(4);
    for (const p of career.timing) expect(p.theme).toBe('career');
  });

  it('hides the new texts until approved', () => {
    const live = composeCareer(chart, forecast);
    const approved = CAREER_TEXT.review === 'approved';
    expect(live.paths.length > 0).toBe(approved);
    expect(live.workStyle !== null).toBe(approved);
  });

  it('unknown birth time: no Midheaven or houses, but work style and paths remain', () => {
    const c = composeCareer(
      buildChart({ ...carrascal, time: null, timeAccuracy: 'unknown' }),
      null,
      {
        includeDrafts: true,
      },
    );
    expect(c.direction).toEqual([]);
    expect(c.howYouWork).toHaveLength(2);
    expect(c.paths).toHaveLength(5);
    expect(c.timing).toEqual([]);
  });
});

describe('career house rulers', () => {
  const R = CAREER_TEXT.rulers;
  const chart = buildChart(carrascal);

  it('texts follow the guardrails: tendencies, not promises', () => {
    const texts = [R.intro, ...Object.values(R.frames), ...Object.values(R.destinations)];
    for (const t of texts) {
      for (const re of BANNED) expect(t).not.toMatch(re);
      expect(t).not.toMatch(/\bwill\b/i);
    }
    expect(Object.keys(R.frames).sort()).toEqual(['10', '2', '6']);
    expect(Object.keys(R.destinations)).toHaveLength(12);
    for (const f of Object.values(R.frames)) expect(f).toContain('{destination}');
  });

  it('reads the 10th, 6th and 2nd house rulers with filled-in sentences', () => {
    const { rulers } = composeCareer(chart, null, { includeDrafts: true });
    expect(rulers.map((r) => r.house)).toEqual([10, 6, 2]);
    for (const r of rulers) {
      expect(r.placement).toMatch(
        new RegExp(
          `^${r.ruler}, ruler of your \\d+\\w\\w house, in the ${r.rulerHouse}\\w\\w house$`,
        ),
      );
      expect(r.text).not.toContain('{');
      expect(r.text).toContain(R.destinations[String(r.rulerHouse)]);
    }
  });

  it('is empty without a birth time, and hidden until approved', () => {
    const noTime = buildChart({ ...carrascal, time: null, timeAccuracy: 'unknown' });
    expect(composeCareer(noTime, null, { includeDrafts: true }).rulers).toEqual([]);
    if (R.review !== 'approved') expect(composeCareer(chart, null).rulers).toEqual([]);
  });
});
