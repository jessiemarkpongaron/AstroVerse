import { SIGN_NAMES } from '../astro/zodiac.ts';
import {
  BIG_THREE_TEXT,
  HOUSE_KEYS,
  HOUSE_PLANETS,
  PLANET_IN_HOUSE_TEXT,
  PLANET_IN_SIGN_TEXT,
  SNIPPET_PLANETS,
  bigThreeEntry,
  planetInHouseEntry,
  planetInSignEntry,
  type StaticEntry,
} from './staticText.ts';

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

function checkEntry(e: StaticEntry, minSentences: number, maxSentences: number) {
  const n = sentences(e.meaning).length;
  expect(n).toBeGreaterThanOrEqual(minSentences);
  expect(n).toBeLessThanOrEqual(maxSentences);
  expect(e.meaning).toMatch(/\byou(r)?\b/i); // second person
  expect(e.keywords.length).toBeGreaterThanOrEqual(3);
  expect(e.keywords.length).toBeLessThanOrEqual(5);
  expect(e.strengths.length).toBeGreaterThanOrEqual(2);
  expect(e.challenges.length).toBeGreaterThanOrEqual(2);
  const text = [e.meaning, ...e.keywords, ...e.strengths, ...e.challenges].join(' ');
  for (const re of BANNED) expect(text).not.toMatch(re);
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
    checkEntry(e, 2, 3);
  });

  it('meanings are unique (no copy-paste between entries)', () => {
    const meanings = all.map(([, e]) => e.meaning);
    expect(new Set(meanings).size).toBe(meanings.length);
  });

  it('bigThreeEntry looks up by sign index', () => {
    expect(bigThreeEntry('sun', 2).keywords).toContain('Curiosity');
  });
});

const written = SNIPPET_PLANETS.filter((p) => PLANET_IN_SIGN_TEXT.planets[p]);
const snippets: [string, StaticEntry][] = written.flatMap((p) =>
  SIGN_NAMES.map((s): [string, StaticEntry] => [
    `${p}.${s}`,
    PLANET_IN_SIGN_TEXT.planets[p]?.[s] as StaticEntry,
  ]),
);

describe('planetInSign.json', () => {
  it('every written planet has all 12 signs and a review status', () => {
    expect(written.length).toBeGreaterThan(0);
    for (const p of written) {
      expect(Object.keys(PLANET_IN_SIGN_TEXT.planets[p] ?? {}).sort()).toEqual(
        [...SIGN_NAMES].sort(),
      );
      expect(['draft', 'approved']).toContain(PLANET_IN_SIGN_TEXT.review[p]);
    }
  });

  it.each(snippets)('%s follows the style and guardrails', (_id, e) => {
    checkEntry(e, 1, 2);
  });

  it.each(snippets.filter(([id]) => id.startsWith('Jupiter.')))(
    '%s avoids luck/money language (PRD §5: no financial or gambling advice)',
    (_id, e) => {
      const text = [e.meaning, ...e.keywords, ...e.strengths, ...e.challenges].join(' ');
      expect(text).not.toMatch(/\b(luck|lucky|money|wealth|fortune|rich|win(ning)?s?)\b/i);
    },
  );

  it.each(snippets.filter(([id]) => id.startsWith('Saturn.')))(
    '%s is encouraging, not fatalistic (INTERPRETATION.md style)',
    (_id, e) => {
      const text = [e.meaning, ...e.keywords, ...e.strengths, ...e.challenges].join(' ');
      expect(text).not.toMatch(
        /\b(never|doomed|curse[ds]?|karma|punish\w*|fate|fated|suffer\w*|misfortune|bad luck|hopeless)\b/i,
      );
      // Every Saturn lesson points to growth.
      expect(e.meaning).toMatch(/\b(can|grow|learn|build|become)\b/i);
    },
  );

  it.each(snippets.filter(([id]) => /^(Uranus|Neptune|Pluto)\./.test(id)))(
    '%s is framed generationally (outer planets stay in a sign for years)',
    (_id, e) => {
      expect(e.meaning).toMatch(/\bgeneration\b/i);
    },
  );

  it('snippets are unique and differ from Big Three text', () => {
    const texts = [...snippets.map(([, e]) => e.meaning), ...all.map(([, e]) => e.meaning)];
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('planetInSignEntry returns null for planets not written yet', () => {
    expect(planetInSignEntry('Mercury', 1)?.keywords).toContain('Steady');
    const missing = SNIPPET_PLANETS.find((p) => !PLANET_IN_SIGN_TEXT.planets[p]);
    if (missing) expect(planetInSignEntry(missing, 0)).toBeNull();
  });
});

const housePlanets = HOUSE_PLANETS.filter((p) => PLANET_IN_HOUSE_TEXT.planets[p]);
const houseSnippets: [string, StaticEntry][] = housePlanets.flatMap((p) =>
  HOUSE_KEYS.map((h): [string, StaticEntry] => [
    `${p}.house${h}`,
    PLANET_IN_HOUSE_TEXT.planets[p]?.[h] as StaticEntry,
  ]),
);

describe('planetInHouse.json', () => {
  it('every written planet has all 12 houses and a review status', () => {
    expect(housePlanets.length).toBeGreaterThan(0);
    for (const p of housePlanets) {
      expect(Object.keys(PLANET_IN_HOUSE_TEXT.planets[p] ?? {}).sort()).toEqual(
        [...HOUSE_KEYS].sort(),
      );
      expect(['draft', 'approved']).toContain(PLANET_IN_HOUSE_TEXT.review[p]);
    }
  });

  it.each(houseSnippets)('%s follows the style and guardrails', (_id, e) => {
    checkEntry(e, 1, 2);
  });

  it.each(houseSnippets.filter(([id]) => /\.house(2|8)$/.test(id)))(
    '%s talks about values and shared bonds, not money (PRD §5)',
    (_id, e) => {
      const text = [e.meaning, ...e.keywords, ...e.strengths, ...e.challenges].join(' ');
      expect(text).not.toMatch(/\b(luck|lucky|money|wealth|fortune|rich|inherit\w*|debts?)\b/i);
    },
  );

  it.each(houseSnippets.filter(([id]) => /\.house(5|6)$/.test(id)))(
    '%s avoids health and pregnancy claims',
    (_id, e) => {
      const text = [e.meaning, ...e.keywords, ...e.strengths, ...e.challenges].join(' ');
      expect(text).not.toMatch(/\b(health|sick\w*|pregnan\w*|babies|fertil\w*)\b/i);
    },
  );

  it.each(houseSnippets.filter(([id]) => id.startsWith('Jupiter.')))(
    '%s avoids luck/money language (PRD §5)',
    (_id, e) => {
      const text = [e.meaning, ...e.keywords, ...e.strengths, ...e.challenges].join(' ');
      expect(text).not.toMatch(/\b(luck|lucky|money|wealth|fortune|rich|win(ning)?s?)\b/i);
    },
  );

  it.each(houseSnippets.filter(([id]) => /^(Venus|Mars)\./.test(id)))(
    '%s never presents jealousy or control as romantic',
    (_id, e) => {
      expect(e.meaning).not.toMatch(/\b(jealous\w*|possessive|control\w*)\b/i);
    },
  );

  it.each(houseSnippets.filter(([id]) => id.startsWith('Saturn.')))(
    '%s is encouraging, not fatalistic, and points to growth',
    (_id, e) => {
      const text = [e.meaning, ...e.keywords, ...e.strengths, ...e.challenges].join(' ');
      expect(text).not.toMatch(
        /\b(never|doomed|curse[ds]?|karma|punish\w*|fate|fated|suffer\w*|misfortune|bad luck|hopeless)\b/i,
      );
      expect(e.meaning).toMatch(/\b(can|grow|learn|build|become)\b/i);
    },
  );

  it.each(houseSnippets.filter(([id]) => /^(Pluto|Saturn|Uranus|Neptune)\.house(8|12)$/.test(id)))(
    '%s keeps 8th/12th-house depth free of loss, crisis or illness wording',
    (_id, e) => {
      const text = [e.meaning, ...e.keywords, ...e.strengths, ...e.challenges].join(' ');
      expect(text).not.toMatch(/\b(loss|grief|dying|hospital\w*|addict\w*|trauma\w*|psychic)\b/i);
    },
  );

  it('house snippets are unique and differ from all other static text', () => {
    const texts = [
      ...houseSnippets.map(([, e]) => e.meaning),
      ...snippets.map(([, e]) => e.meaning),
      ...all.map(([, e]) => e.meaning),
    ];
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('planetInHouseEntry hides drafts unless asked', () => {
    const draft = housePlanets.find((p) => PLANET_IN_HOUSE_TEXT.review[p] === 'draft');
    if (draft) {
      expect(planetInHouseEntry(draft, 1)).toBeNull();
      expect(planetInHouseEntry(draft, 1, { includeDrafts: true })?.meaning).toBeTruthy();
    }
    const approved = housePlanets.find((p) => PLANET_IN_HOUSE_TEXT.review[p] === 'approved');
    if (approved) expect(planetInHouseEntry(approved, 12)?.meaning).toBeTruthy();
    expect(planetInHouseEntry('Pluto', 13, { includeDrafts: true })).toBeNull();
  });
});
