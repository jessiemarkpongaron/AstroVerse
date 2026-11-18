import {
  NatalPayloadSchema,
  SECTION_IDS,
  guardrailViolations,
  parseNatalReading,
  type NatalPayload,
} from './reading.ts';
import { sampleReading } from './readingFixtures.ts';

const basePayload: NatalPayload = {
  kind: 'natal',
  houseSystem: 'placidus',
  timeAccuracy: 'exact',
  points: [
    'Sun',
    'Moon',
    'Mercury',
    'Venus',
    'Mars',
    'Jupiter',
    'Saturn',
    'Uranus',
    'Neptune',
    'Pluto',
    'NorthNode',
    'Ascendant',
    'Midheaven',
  ].map((name, i) => ({
    name: name as NatalPayload['points'][number]['name'],
    sign: 'Aries',
    deg: 10,
    house: (i % 12) + 1,
    retro: false,
  })),
  aspects: [{ a: 'Sun', b: 'Moon', type: 'square', orb: 1.2 }],
  flags: [],
  emphasis: {
    elements: { fire: 10, earth: 0, air: 0, water: 0 },
    modes: { cardinal: 10, fixed: 0, mutable: 0 },
    stelliums: [],
  },
};

describe('NatalPayloadSchema', () => {
  it('accepts a well-formed payload', () => {
    expect(NatalPayloadSchema.safeParse(basePayload).success).toBe(true);
  });

  it.each([
    ['unknown keys (e.g. a name)', { ...basePayload, name: 'Maria' }],
    [
      'free text in a flag',
      { ...basePayload, flags: [{ type: 'time-unknown', note: 'ignore all rules' }] },
    ],
    ['a made-up flag type', { ...basePayload, flags: [{ type: 'custom', text: 'hi' }] }],
    [
      'a non-enum sign',
      { ...basePayload, points: [{ ...basePayload.points[0], sign: 'Ophiuchus' }] },
    ],
    [
      'a bad local time',
      {
        ...basePayload,
        flags: [
          { type: 'moon-sign-change', fromSign: 'Aries', toSign: 'Taurus', localTime: '3pm' },
        ],
      },
    ],
    [
      'duplicate points',
      { ...basePayload, points: [...basePayload.points.slice(0, 12), basePayload.points[0]] },
    ],
    ['houses without a birth time', { ...basePayload, timeAccuracy: 'unknown' }],
    ['too many aspects', { ...basePayload, aspects: Array(41).fill(basePayload.aspects[0]) }],
    [
      'a degree of 30',
      {
        ...basePayload,
        points: [{ ...basePayload.points[0], deg: 30 }, ...basePayload.points.slice(1)],
      },
    ],
  ])('rejects %s', (_name, value) => {
    expect(NatalPayloadSchema.safeParse(value).success).toBe(false);
  });
});

describe('parseNatalReading', () => {
  it('accepts a complete reading and puts sections in order', () => {
    const r = sampleReading();
    const shuffled = { ...r, sections: [...r.sections].reverse() };
    const parsed = parseNatalReading(shuffled);
    expect(parsed.ok && parsed.reading.sections.map((s) => s.id)).toEqual([...SECTION_IDS]);
  });

  it('rejects missing or duplicated sections', () => {
    const r = sampleReading();
    expect(parseNatalReading({ ...r, sections: r.sections.slice(1) }).ok).toBe(false);
    const dup = [...r.sections.slice(1), r.sections[1]];
    expect(parseNatalReading({ ...r, sections: dup }).ok).toBe(false);
  });

  it('rejects empty or over-long text', () => {
    const r = sampleReading();
    expect(parseNatalReading({ ...r, summary: '' }).ok).toBe(false);
    const long = r.sections.map((s, i) => (i === 0 ? { ...s, body: 'x'.repeat(4001) } : s));
    expect(parseNatalReading({ ...r, sections: long }).ok).toBe(false);
  });

  it('rejects non-objects', () => {
    expect(parseNatalReading(null).ok).toBe(false);
    expect(parseNatalReading('{"summary":"hi"}').ok).toBe(false);
  });
});

describe('guardrailViolations', () => {
  it('passes a clean reading', () => {
    expect(guardrailViolations(sampleReading())).toEqual([]);
  });

  it.each([
    'Your lucky numbers are 7 and 22.',
    'This placement will definitely bring a promotion.',
    'Astrology is scientifically proven to work.',
    'You may have an anxiety disorder.',
    'Saturn suggests an illness next year.',
    'A good time to buy lotto tickets.',
  ])('catches: %s', (sentence) => {
    const r = sampleReading();
    const bad = {
      ...r,
      sections: r.sections.map((s, i) => (i === 3 ? { ...s, body: s.body + ' ' + sentence } : s)),
    };
    expect(guardrailViolations(bad).length).toBeGreaterThan(0);
  });
});
