import privacy from '../content/privacy.json';
import type { PageMeta } from './signPages.ts';

/** The privacy policy text (src/content/privacy.json). Shown only once review is "approved". */
export const PRIVACY = privacy;
export const PRIVACY_PATH = '/privacy';

export const privacyPublished = (): boolean => PRIVACY.review === 'approved';

export const PRIVACY_META: PageMeta = {
  title: 'Privacy | AstroVerse',
  description:
    'What AstroVerse keeps about you, where it goes, and how to delete it. Charts are calculated on your device; saved charts are visible only to you.',
  path: PRIVACY_PATH,
};
