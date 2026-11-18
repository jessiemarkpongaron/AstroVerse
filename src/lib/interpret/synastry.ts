import type { Synastry, SynastryAspect, SynastryBand, BandStrength } from '../astro/synastry.ts';
import type { AspectType, PointName } from '../astro/types.ts';
import synastryJson from './static/synastry.json';
import { ASPECT_TEXT, type ReviewStatus } from './staticText.ts';

type SynastryText = {
  version: number;
  review: ReviewStatus;
  templates: Record<AspectType, string>;
  bands: Record<SynastryBand, string>;
  intro: string;
  respect: string;
};
export const SYNASTRY_TEXT = synastryJson as unknown as SynastryText;

export const BANDS: readonly SynastryBand[] = ['harmony', 'growth', 'challenges'];
export const BAND_TITLES: Record<SynastryBand, string> = {
  harmony: 'Harmony',
  growth: 'Growth areas',
  challenges: 'Challenges',
};
export const STRENGTH_LABEL: Record<BandStrength, string> = {
  strong: 'Strong',
  some: 'Some',
  light: 'Light',
};
/** Contacts shown per band (the strongest first). */
export const PER_BAND = 5;

const LABEL: Partial<Record<PointName, string>> = { Ascendant: 'Rising' };
const VERB: Record<AspectType, string> = {
  conjunction: 'conjunct',
  sextile: 'sextile',
  square: 'square',
  trine: 'trine',
  opposition: 'opposite',
};

/** 'your sense of self' → 'their sense of self'; 'the way you think' → 'the way they think'. */
export function theirTheme(theme: string): string {
  return theme.replace(/\byour\b/g, 'their').replace(/\byou\b/g, 'they');
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function synastryText(
  x: Pick<SynastryAspect, 'a' | 'b' | 'type'>,
  opts: { includeDrafts?: boolean } = {},
): string | null {
  if (!opts.includeDrafts && SYNASTRY_TEXT.review !== 'approved') return null;
  return SYNASTRY_TEXT.templates[x.type]
    .replace('{A}', capitalize(ASPECT_TEXT.themes[x.a]))
    .replace('{b}', theirTheme(ASPECT_TEXT.themes[x.b]));
}

export interface CompatibilityItem {
  key: string;
  /** e.g. "Your Venus trine Ana's Mars". */
  title: string;
  text: string | null;
  aspect: SynastryAspect;
}

export interface CompatibilityReading {
  bands: {
    band: SynastryBand;
    title: string;
    strength: BandStrength;
    description: string | null;
    items: CompatibilityItem[];
    /** How many more contacts there are beyond the ones shown. */
    more: number;
  }[];
  intro: string | null;
  respect: string | null;
}

export function composeCompatibility(
  syn: Synastry,
  otherName: string,
  opts: { includeDrafts?: boolean } = {},
): CompatibilityReading {
  const approved = opts.includeDrafts === true || SYNASTRY_TEXT.review === 'approved';
  const their = otherName ? `${otherName}’s` : 'their';
  return {
    bands: BANDS.map((band) => {
      const all = syn.bands[band].aspects;
      return {
        band,
        title: BAND_TITLES[band],
        strength: syn.bands[band].strength,
        description: approved ? SYNASTRY_TEXT.bands[band] : null,
        items: all.slice(0, PER_BAND).map((aspect) => ({
          key: `${aspect.a}-${aspect.type}-${aspect.b}`,
          title: `Your ${LABEL[aspect.a] ?? aspect.a} ${VERB[aspect.type]} ${their} ${LABEL[aspect.b] ?? aspect.b}`,
          text: approved ? synastryText(aspect, { includeDrafts: true }) : null,
          aspect,
        })),
        more: Math.max(0, all.length - PER_BAND),
      };
    }),
    intro: approved ? SYNASTRY_TEXT.intro : null,
    respect: approved ? SYNASTRY_TEXT.respect : null,
  };
}
