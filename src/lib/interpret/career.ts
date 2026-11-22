import { houseRuler } from '../astro/rulers.ts';
import type { Body, Chart, PointName, SignIndex } from '../astro/types.ts';
import { SIGN_NAMES } from '../astro/zodiac.ts';
import { ordinal } from '../astro/uncertainty.ts';
import careerJson from './static/career.json';
import type { Forecast, ForecastPeriod } from './forecast.ts';
import {
  HOUSE_PLANETS,
  bigThreeEntry,
  planetInHouseEntry,
  planetInSignEntry,
  pointInSignEntry,
  type ReviewStatus,
  type StaticEntry,
} from './staticText.ts';
import type { StaticReadingItem } from './staticReading.ts';

export const ELEMENTS = ['fire', 'earth', 'air', 'water'] as const;
export type Element = (typeof ELEMENTS)[number];

type CareerText = {
  version: number;
  review: ReviewStatus;
  workStyle: Record<Element, string>;
  paths: Record<Element, { title: string; why: string }[]>;
  rulers: {
    review: ReviewStatus;
    intro: string;
    frames: Record<string, string>;
    destinations: Record<string, string>;
  };
};
export const CAREER_TEXT = careerJson as unknown as CareerText;

/** Houses read for career (PRD F6): public role, daily work, values/security. */
export const CAREER_HOUSES = [10, 6, 2] as const;
const PLANETS = HOUSE_PLANETS as readonly PointName[];

export interface CareerReading {
  /** Midheaven by sign, then planets in the 10th, 6th and 2nd houses. */
  direction: StaticReadingItem[];
  /** Element counts over the 10 planets, highest first. */
  elements: { element: Element; count: number }[];
  /** "Your chart leans toward …" (null until approved). */
  workStyle: string | null;
  /** Mars and Saturn by sign: drive and staying power. */
  howYouWork: StaticReadingItem[];
  /** Up to 6 strengths from the Midheaven, Sun, Mars and Saturn texts. */
  strengths: string[];
  /** 3 paths from the strongest element, 2 from the next (empty until approved). */
  paths: { title: string; why: string; element: Element }[];
  /** Up to 4 upcoming career-themed forecast periods. */
  timing: ForecastPeriod[];
  /** Rulers of the 10th, 6th and 2nd houses and where they sit (empty without a birth time or
   *  until the text is approved). */
  rulers: CareerRuler[];
}

export interface CareerRuler {
  house: number;
  ruler: Body;
  cuspSign: SignIndex;
  rulerHouse: number;
  /** "Saturn, ruler of your 10th house, in the 3rd house" */
  placement: string;
  text: string;
}

export const rulersIntro = () => CAREER_TEXT.rulers.intro;

function careerRulers(chart: Chart): CareerRuler[] {
  const { frames, destinations } = CAREER_TEXT.rulers;
  return CAREER_HOUSES.flatMap((house) => {
    const r = houseRuler(chart, house);
    if (!r) return [];
    const frame = frames[String(house)] as string;
    return [
      {
        house,
        ruler: r.ruler,
        cuspSign: r.cuspSign,
        rulerHouse: r.rulerHouse,
        placement: `${r.ruler}, ruler of your ${ordinal(house)} house, in the ${ordinal(r.rulerHouse)} house`,
        text: frame.replace('{destination}', destinations[String(r.rulerHouse)] as string),
      },
    ];
  });
}

const item = (key: string, placement: string, entry: StaticEntry | null) =>
  entry ? [{ key, placement, entry }] : [];

export function elementCounts(chart: Chart): { element: Element; count: number }[] {
  const counts: Record<Element, number> = { fire: 0, earth: 0, air: 0, water: 0 };
  for (const p of chart.points) {
    if (PLANETS.includes(p.name)) counts[ELEMENTS[p.sign % 4] as Element] += 1;
  }
  // Stable: ties keep fire → earth → air → water order.
  return ELEMENTS.map((element) => ({ element, count: counts[element] })).sort(
    (a, b) => b.count - a.count,
  );
}

/**
 * Free career reading (PRD F6) from approved static text and the forecast. House-based parts
 * need a birth time; the rest works for every chart.
 */
export function composeCareer(
  chart: Chart,
  forecast: Forecast | null,
  opts: { includeDrafts?: boolean } = {},
): CareerReading {
  const approved = opts.includeDrafts === true || CAREER_TEXT.review === 'approved';
  const at = (name: PointName) => chart.points.find((p) => p.name === name);

  const direction: StaticReadingItem[] = [];
  const mc = at('Midheaven');
  if (mc) {
    direction.push(
      ...item(
        'Midheaven.sign',
        `Midheaven in ${SIGN_NAMES[mc.sign]}`,
        pointInSignEntry('Midheaven', mc.sign),
      ),
    );
  }
  for (const house of CAREER_HOUSES) {
    for (const planet of HOUSE_PLANETS) {
      const p = at(planet);
      if (p?.house !== house) continue;
      direction.push(
        ...item(
          `${planet}.house`,
          `${planet} in the ${ordinal(house)} house`,
          planetInHouseEntry(planet, house),
        ),
      );
    }
  }

  const howYouWork: StaticReadingItem[] = [];
  for (const planet of ['Mars', 'Saturn'] as const) {
    const p = at(planet);
    if (p) {
      howYouWork.push(
        ...item(
          `${planet}.sign`,
          `${planet} in ${SIGN_NAMES[p.sign]}`,
          planetInSignEntry(planet, p.sign),
        ),
      );
    }
  }

  const sun = at('Sun');
  const strengthSources = [
    direction.find((i) => i.key === 'Midheaven.sign')?.entry,
    sun ? bigThreeEntry('sun', sun.sign) : undefined,
    ...howYouWork.map((i) => i.entry),
  ];
  const strengths = [
    ...new Set(strengthSources.flatMap((e) => e?.strengths.slice(0, 2) ?? [])),
  ].slice(0, 6);

  const elements = elementCounts(chart);
  const [first, second] = elements as [(typeof elements)[0], (typeof elements)[0]];
  const paths = approved
    ? [
        ...CAREER_TEXT.paths[first.element]
          .slice(0, 3)
          .map((x) => ({ ...x, element: first.element })),
        ...CAREER_TEXT.paths[second.element]
          .slice(0, 2)
          .map((x) => ({ ...x, element: second.element })),
      ]
    : [];

  const timing = (forecast?.themes.find((t) => t.theme === 'career')?.periods ?? []).slice(0, 4);

  return {
    direction,
    elements,
    workStyle: approved ? CAREER_TEXT.workStyle[first.element] : null,
    howYouWork,
    strengths,
    paths,
    timing,
    rulers:
      opts.includeDrafts === true || CAREER_TEXT.rulers.review === 'approved'
        ? careerRulers(chart)
        : [],
  };
}
