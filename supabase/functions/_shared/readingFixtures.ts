/** Test helpers only (never imported by an entry point). */
import { SECTION_IDS, type NatalReading } from './reading.ts';

const body = (id: string) =>
  `You may notice that your ${id} side shows up in many small ways. Astrologers link this ` +
  'placement with curiosity and warmth.\n\nYou can work with it by slowing down a little.';

export function sampleReading(): NatalReading {
  return {
    summary:
      'You are curious, quick and warm, with a quiet, intense side that people notice over time.',
    sections: SECTION_IDS.map((id) => ({ id, body: body(id), keyPlacements: ['Sun in Gemini'] })),
  };
}
