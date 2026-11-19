import type { SignIndex } from './astro/types.ts';
import {
  ALL_SIGNS,
  SIGN_PAGE_KINDS,
  allSignPagePaths,
  signFromSlug,
  signPageMeta,
  signSlug,
  sunSignDates,
} from './signPages.ts';

describe('sign pages', () => {
  it('has 37 sign pages and 13 horoscope pages, all unique', () => {
    const paths = allSignPagePaths();
    expect(paths).toHaveLength(50);
    expect(new Set(paths).size).toBe(50);
    expect(paths).toContain('/horoscope/gemini');
    expect(paths).toContain('/signs/gemini');
    expect(paths).toContain('/moon/virgo');
    expect(paths).toContain('/rising/scorpio');
  });

  it('round-trips slugs and rejects unknown ones', () => {
    for (const s of ALL_SIGNS) expect(signFromSlug(signSlug(s))).toBe(s);
    expect(signFromSlug('Gemini')).toBeNull();
    expect(signFromSlug('ophiuchus')).toBeNull();
    expect(signFromSlug(undefined)).toBeNull();
  });

  it('gives typical Sun sign dates', () => {
    expect(sunSignDates(2 as SignIndex)).toBe('May 21 – June 20');
    expect(sunSignDates(9 as SignIndex)).toBe('December 22 – January 19');
  });

  it('writes a unique title and a short description for every page', () => {
    const titles = new Set<string>();
    for (const k of SIGN_PAGE_KINDS) {
      for (const s of ALL_SIGNS) {
        const m = signPageMeta(k, s);
        titles.add(m.title);
        expect(m.title).toMatch(/\| AstroVerse$/);
        expect(m.description.length).toBeLessThanOrEqual(156);
        expect(m.description.length).toBeGreaterThan(80);
      }
    }
    expect(titles.size).toBe(36);
    expect(signPageMeta('sun', 2 as SignIndex).description).toMatch(
      /^Gemini Sun \(May 21 – June 20\): curiosity, communication, adaptability\. /,
    );
  });
});
