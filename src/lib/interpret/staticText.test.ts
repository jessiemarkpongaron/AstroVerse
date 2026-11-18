import { SIGN_NAMES } from '../astro/zodiac.ts';
import { BIG_THREE_TEXT, bigThreeEntry, type StaticEntry } from './staticText.ts';

/**
 * Guardrails from docs/INTERPRETATION.md and PRD §5, enforced on every static entry.
 * Matching is on whole words / phrases, case-insensitive.
 */
const BANNED = [
  /\bdeath\b/i,
  /\bdie\b/i,
  /\billness\b/i,
  /\bdisease\b/i,
  /\baccident/i,
  /\bpregnan/i,
  /\blotto\b/i,
  /\blucky numbers?\b/i,
  /\bgambl/i,
  /\binvest/i,
  /\bguarantee/i,
  /\bwill definitely\b/i,
  /\bscientifically\b/i,
  /\bdisorder\b/i,
  /\bdiagnos/i,
  /\bdestined\b/i,
  /\bdoomed\b/i,
];

function sentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
}

const groups = ['sun', 'moon', 'rising'] as const;
const all: [string, StaticEntry][] = groups.flatMap((g) =>
  SIGN_NAMES.map((s) => [`${g}.${s}`, BIG_THREE_TEXT[g][s]] as [string, StaticEntry]),
);

describe('bigThree.json', () => {
  it('has all 36 entries (Sun/Moon/Rising × 12 signs)', () => {
    for (const g of groups)
      expect(Object.keys(BIG_THREE_TEXT[g]).sort()).toEqual([...SIGN_NAMES].sort());
  });

  it.each(all)('%s follows the style and guardrails', (_id, e) => {
    const n = sentences(e.meaning).length;
    expect(n).toBeGreaterThanOrEqual(2);
    expect(n).toBeLessThanOrEqual(3);
    expect(e.meaning).toMatch(/\byou(r)?\b/i); // second person
    expect(e.keywords.length).toBeGreaterThanOrEqual(3);
    expect(e.keywords.length).toBeLessThanOrEqual(5);
    expect(e.strengths.length).toBeGreaterThanOrEqual(2);
    expect(e.challenges.length).toBeGreaterThanOrEqual(2);
    const text = [e.meaning, ...e.keywords, ...e.strengths, ...e.challenges].join(' ');
    for (const re of BANNED) expect(text).not.toMatch(re);
  });

  it('meanings are unique (no copy-paste between entries)', () => {
    const meanings = all.map(([, e]) => e.meaning);
    expect(new Set(meanings).size).toBe(meanings.length);
  });

  it('bigThreeEntry looks up by sign index', () => {
    expect(bigThreeEntry('sun', 2).keywords).toContain('Curiosity');
  });
});
