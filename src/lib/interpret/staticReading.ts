import type { Aspect, Chart, ChartPoint, PointName } from '../astro/types.ts';
import { SIGN_NAMES } from '../astro/zodiac.ts';
import { ordinal } from '../astro/uncertainty.ts';
import { SECTION_TITLES, type SectionId } from '../../../supabase/functions/_shared/reading.ts';
import {
  aspectEntry,
  bigThreeEntry,
  planetInHouseEntry,
  planetInSignEntry,
  pointInSignEntry,
  type HousePlanet,
  type SignPoint,
  type SnippetPlanet,
  type StaticEntry,
} from './staticText.ts';

/** One paragraph of the free reading, built from a single approved static entry. */
export interface StaticReadingItem {
  /** Stable key, e.g. 'Venus.sign' or 'Venus.house'. */
  key: string;
  /** Placement label, e.g. 'Venus in Taurus' or 'Venus in the 6th house'. */
  placement: string;
  entry: StaticEntry;
}

export interface StaticReadingSection {
  id: SectionId;
  title: string;
  items: StaticReadingItem[];
}

type Source =
  | { kind: 'bigThree'; point: 'Sun' | 'Moon' | 'Ascendant' }
  | { kind: 'sign'; point: SnippetPlanet }
  | { kind: 'house'; point: HousePlanet }
  | { kind: 'point'; point: SignPoint };

/** Which placements feed each section (same themes as the AI reading, PRD F4). */
const PLAN: Record<SectionId, Source[]> = {
  personality: [
    { kind: 'bigThree', point: 'Sun' },
    { kind: 'house', point: 'Sun' },
    { kind: 'bigThree', point: 'Ascendant' },
  ],
  mind: [
    { kind: 'sign', point: 'Mercury' },
    { kind: 'house', point: 'Mercury' },
  ],
  love: [
    { kind: 'sign', point: 'Venus' },
    { kind: 'house', point: 'Venus' },
  ],
  work: [
    { kind: 'sign', point: 'Mars' },
    { kind: 'house', point: 'Mars' },
  ],
  emotions: [
    { kind: 'bigThree', point: 'Moon' },
    { kind: 'house', point: 'Moon' },
  ],
  growth: [
    { kind: 'sign', point: 'Jupiter' },
    { kind: 'house', point: 'Jupiter' },
  ],
  career: [{ kind: 'point', point: 'Midheaven' }],
  lessons: [
    { kind: 'sign', point: 'Saturn' },
    { kind: 'house', point: 'Saturn' },
    { kind: 'point', point: 'NorthNode' },
    { kind: 'sign', point: 'Uranus' },
    { kind: 'sign', point: 'Neptune' },
    { kind: 'sign', point: 'Pluto' },
  ],
};

const BIG_THREE_KEY = { Sun: 'sun', Moon: 'moon', Ascendant: 'rising' } as const;

/** Points whose aspects belong to each section (an aspect is used once, first match wins). */
const ASPECT_ANCHORS: Record<SectionId, PointName[]> = {
  personality: ['Sun', 'Ascendant'],
  mind: ['Mercury'],
  love: ['Venus'],
  work: ['Mars'],
  emotions: ['Moon'],
  growth: ['Jupiter'],
  career: ['Midheaven'],
  lessons: ['Saturn', 'NorthNode'],
};
/** Only close aspects, and at most this many per section, keep the reading focused. */
export const ASPECT_MAX_ORB = 3;
export const ASPECTS_PER_SECTION = 2;
const OUTER = new Set<PointName>(['Uranus', 'Neptune', 'Pluto']);
const ANGLES = new Set<PointName>(['Ascendant', 'Midheaven']);
const LABEL: Partial<Record<PointName, string>> = { NorthNode: 'North Node' };
const label = (p: PointName) => LABEL[p] ?? p;

/** Generational (outer–outer) and angle–angle aspects say little about one person. */
function personal(a: Aspect): boolean {
  if (OUTER.has(a.a) && OUTER.has(a.b)) return false;
  if (ANGLES.has(a.a) && ANGLES.has(a.b)) return false;
  return a.orb <= ASPECT_MAX_ORB;
}

function aspectItems(anchors: PointName[], pool: Aspect[], used: Set<Aspect>): StaticReadingItem[] {
  const out: StaticReadingItem[] = [];
  for (const asp of pool) {
    if (out.length >= ASPECTS_PER_SECTION) break;
    if (used.has(asp)) continue;
    const anchor = anchors.find((p) => p === asp.a || p === asp.b);
    if (!anchor) continue;
    const other = anchor === asp.a ? asp.b : asp.a;
    const entry = aspectEntry(anchor, other, asp.type);
    if (!entry) continue;
    used.add(asp);
    out.push({
      key: `aspect.${anchor}-${other}`,
      placement: `${label(anchor)} ${asp.type} ${label(other)}`,
      entry,
    });
  }
  return out;
}

function item(source: Source, p: ChartPoint): StaticReadingItem | null {
  const sign = SIGN_NAMES[p.sign];
  switch (source.kind) {
    case 'bigThree':
      return {
        key: `${source.point}.sign`,
        placement: source.point === 'Ascendant' ? `${sign} Rising` : `${source.point} in ${sign}`,
        entry: bigThreeEntry(BIG_THREE_KEY[source.point], p.sign),
      };
    case 'sign': {
      const entry = planetInSignEntry(source.point, p.sign);
      return entry
        ? { key: `${source.point}.sign`, placement: `${source.point} in ${sign}`, entry }
        : null;
    }
    case 'point': {
      const entry = pointInSignEntry(source.point, p.sign);
      const label = source.point === 'NorthNode' ? 'North Node' : source.point;
      return entry
        ? { key: `${source.point}.sign`, placement: `${label} in ${sign}`, entry }
        : null;
    }
    case 'house': {
      if (p.house === null) return null;
      const entry = planetInHouseEntry(source.point, p.house);
      return entry
        ? {
            key: `${source.point}.house`,
            placement: `${source.point} in the ${ordinal(p.house)} house`,
            entry,
          }
        : null;
    }
  }
}

/**
 * The free full reading (no AI, no network): for each theme, the approved static texts for
 * this chart's placements. Sections whose texts aren't written yet are left out, and house
 * texts are skipped when the birth time is unknown.
 */
export function composeStaticReading(chart: Chart): StaticReadingSection[] {
  const byName = new Map<PointName, ChartPoint>(chart.points.map((p) => [p.name, p]));
  const sections: StaticReadingSection[] = [];
  const pool = chart.aspects.filter(personal).sort((x, y) => x.orb - y.orb);
  const used = new Set<Aspect>();
  for (const [id, sources] of Object.entries(PLAN) as [SectionId, Source[]][]) {
    const items = sources.flatMap((s) => {
      const p = byName.get(s.point);
      const it = p ? item(s, p) : null;
      return it ? [it] : [];
    });
    items.push(...aspectItems(ASPECT_ANCHORS[id], pool, used));
    if (items.length > 0) sections.push({ id, title: SECTION_TITLES[id], items });
  }
  return sections;
}
