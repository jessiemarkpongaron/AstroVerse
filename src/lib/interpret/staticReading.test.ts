import { buildChart } from '../astro/chart.ts';
import type { BirthInput } from '../astro/types.ts';
import { composeStaticReading } from './staticReading.ts';
import { PLANET_IN_HOUSE_TEXT, POINT_IN_SIGN_TEXT } from './staticText.ts';

const carrascal: BirthInput = {
  date: '1990-05-31',
  time: '15:30',
  timeAccuracy: 'exact',
  place: { name: 'Carrascal', lat: 9.37028, lon: 125.94917, tz: 'Asia/Manila' },
};

describe('composeStaticReading', () => {
  const reading = composeStaticReading(buildChart(carrascal));
  const section = (id: string) => reading.find((s) => s.id === id);

  it('builds themed sections in reading order from approved text', () => {
    expect(reading.map((s) => s.id)).toEqual([
      'personality',
      'mind',
      'love',
      'work',
      'emotions',
      'growth',
      'career',
      'lessons',
    ]);
    expect(section('personality')?.items.map((i) => i.placement)).toEqual(
      expect.arrayContaining(['Sun in Gemini', 'Scorpio Rising']),
    );
    expect(section('emotions')?.items[0]?.placement).toBe('Moon in Virgo');
    expect(section('mind')?.items[0]?.entry.meaning).toMatch(/think things through slowly/);
  });

  it('frames the outer planets in the lessons section', () => {
    const signs = section('lessons')
      ?.items.filter((i) => i.key.endsWith('.sign') && !i.key.startsWith('NorthNode'))
      .map((i) => i.placement);
    expect(signs).toEqual([
      'Saturn in Capricorn',
      'Uranus in Capricorn',
      'Neptune in Capricorn',
      'Pluto in Scorpio',
    ]);
    expect(section('lessons')?.items.map((i) => i.key)).toContain('Saturn.house');
  });

  it('includes house texts only once a planet is approved', () => {
    const houseItems = reading.flatMap((s) => s.items).filter((i) => i.key.endsWith('.house'));
    for (const i of houseItems) {
      const planet = i.key.split('.')[0] as keyof typeof PLANET_IN_HOUSE_TEXT.review;
      expect(PLANET_IN_HOUSE_TEXT.review[planet]).toBe('approved');
      expect(i.placement).toMatch(/in the \d+(st|nd|rd|th) house$/);
    }
  });

  it('adds Career Direction (Midheaven) and the North Node once approved', () => {
    const mcApproved = POINT_IN_SIGN_TEXT.review.Midheaven === 'approved';
    expect(section('career')?.items.map((i) => i.placement)).toEqual(
      mcApproved ? ['Midheaven in Leo'] : undefined,
    );
    const nn = section('lessons')?.items.find((i) => i.key === 'NorthNode.sign');
    expect(nn?.placement).toBe(
      POINT_IN_SIGN_TEXT.review.NorthNode === 'approved' ? 'North Node in Aquarius' : undefined,
    );
  });

  it('unknown birth time: no Rising, no houses', () => {
    const r = composeStaticReading(
      buildChart({ ...carrascal, time: null, timeAccuracy: 'unknown' }),
    );
    const items = r.flatMap((s) => s.items);
    expect(items.some((i) => i.placement.includes('Rising'))).toBe(false);
    expect(items.some((i) => i.key.endsWith('.house'))).toBe(false);
    expect(items.some((i) => i.placement === 'Sun in Gemini')).toBe(true);
  });
});
