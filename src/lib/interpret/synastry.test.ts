import { buildChart } from '../astro/chart.ts';
import { SYNASTRY_POINTS, compareCharts } from '../astro/synastry.ts';
import type { AspectType, BirthInput } from '../astro/types.ts';
import {
  BANDS,
  PER_BAND,
  SYNASTRY_TEXT,
  composeCompatibility,
  synastryText,
  theirTheme,
} from './synastry.ts';

const TYPES: AspectType[] = ['conjunction', 'sextile', 'square', 'trine', 'opposition'];
const BANNED = [
  /\bsoul ?mates?\b/i,
  /\bdestined\b/i,
  /\bmeant to be\b/i,
  /\bfated?\b/i,
  /\bkarma/i,
  /\bjealous/i,
  /\bpossess/i,
  /\bcontrol/i,
  /\bcheat/i,
  /\bbreak ?up\b/i,
  /\bdivorce/i,
  /\bguarantee/i,
  /\bperfect match\b/i,
  /\bincompatible\b/i,
  /\bdoomed\b/i,
  /\bnever\b/i,
  /%/,
];

describe('synastry.json', () => {
  it('has a template per aspect type, a description per band, intro and respect note', () => {
    for (const t of TYPES) expect(SYNASTRY_TEXT.templates[t]).toMatch(/^\{A\} and \{b\} /);
    for (const b of BANDS) expect(SYNASTRY_TEXT.bands[b].length).toBeGreaterThan(10);
    expect(SYNASTRY_TEXT.intro).toMatch(/not a verdict/);
    expect(SYNASTRY_TEXT.respect).toMatch(/respect/);
    expect(['draft', 'approved']).toContain(SYNASTRY_TEXT.review);
  });

  it('every filled-in sentence passes the relationship guardrails (PRD §5)', () => {
    const all = [SYNASTRY_TEXT.intro, SYNASTRY_TEXT.respect, ...Object.values(SYNASTRY_TEXT.bands)];
    for (const t of TYPES)
      for (const a of SYNASTRY_POINTS)
        for (const b of SYNASTRY_POINTS) {
          const s = synastryText({ a, b, type: t }, { includeDrafts: true }) as string;
          expect(s).not.toMatch(/[{}]/);
          expect(s).toMatch(/\b(their|they)\b/);
          expect(s.split(/(?<=[.!?])\s+/).length).toBeLessThanOrEqual(2);
          all.push(s);
        }
    for (const s of all) for (const re of BANNED) expect(s).not.toMatch(re);
  });

  it('turns the reader’s themes into the other person’s', () => {
    expect(theirTheme('your sense of self')).toBe('their sense of self');
    expect(theirTheme('the way you think')).toBe('the way they think');
    expect(theirTheme('the first impression you give')).toBe('the first impression they give');
    expect(synastryText({ a: 'Venus', b: 'Mars', type: 'trine' }, { includeDrafts: true })).toBe(
      'Your way of loving and their drive flow together naturally, which can make this part of your connection feel easy.',
    );
  });
});

describe('composeCompatibility', () => {
  const me: BirthInput = {
    date: '1990-05-31',
    time: '15:30',
    timeAccuracy: 'exact',
    place: { name: 'Carrascal', lat: 9.37028, lon: 125.94917, tz: 'Asia/Manila' },
  };
  const ana: BirthInput = {
    date: '1992-11-08',
    time: '08:15',
    timeAccuracy: 'exact',
    place: { name: 'Manila', lat: 14.5995, lon: 120.9842, tz: 'Asia/Manila' },
  };
  const syn = compareCharts(buildChart(me), buildChart(ana));
  const r = composeCompatibility(syn, 'Ana', { includeDrafts: true });

  it('has the three bands in order, each with a strength word and at most 5 contacts', () => {
    expect(r.bands.map((b) => b.title)).toEqual(['Harmony', 'Growth areas', 'Challenges']);
    for (const b of r.bands) {
      expect(['strong', 'some', 'light']).toContain(b.strength);
      expect(b.items.length).toBeLessThanOrEqual(PER_BAND);
      expect(b.items.length + b.more).toBe(syn.bands[b.band].aspects.length);
    }
  });

  it('titles name both people', () => {
    const item = r.bands.flatMap((b) => b.items)[0];
    expect(item?.title).toMatch(/^Your \w+ (conjunct|sextile|square|trine|opposite) Ana’s \w+$/);
    const anon = composeCompatibility(syn, '', { includeDrafts: true });
    expect(anon.bands.flatMap((b) => b.items)[0]?.title).toMatch(/ their \w+$/);
  });

  it('hides texts until approved', () => {
    const live = composeCompatibility(syn, 'Ana');
    const approved = SYNASTRY_TEXT.review === 'approved';
    expect(live.intro !== null).toBe(approved);
    for (const b of live.bands) for (const i of b.items) expect(i.text !== null).toBe(approved);
  });
});
