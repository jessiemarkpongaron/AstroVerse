import type { SignIndex } from '../astro/types.ts';
import { SIGN_NAMES, type SignName } from '../astro/zodiac.ts';
import bigThreeJson from './static/bigThree.json';

/** One static interpretation entry (docs/INTERPRETATION.md §1). */
export interface StaticEntry {
  meaning: string;
  keywords: string[];
  strengths: string[];
  challenges: string[];
}

export type BigThreeKey = 'sun' | 'moon' | 'rising';

type BigThreeText = Record<BigThreeKey, Record<SignName, StaticEntry>>;

export const BIG_THREE_TEXT = bigThreeJson as unknown as BigThreeText & { version: number };

export function bigThreeEntry(key: BigThreeKey, sign: SignIndex): StaticEntry {
  return BIG_THREE_TEXT[key][SIGN_NAMES[sign]];
}
