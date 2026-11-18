/**
 * Natal reading prompt. Versioned by PROMPT_VERSION in ../_shared/reading.ts — bump it
 * whenever this file or the reading schema changes (INTERPRETATION.md §5).
 * The system prompt is INTERPRETATION.md §3, verbatim.
 */
import { canonicalJson, type NatalPayload } from '../_shared/reading.ts';

export const SYSTEM_PROMPT = `You are AstroVerse's astrologer: warm, insightful, and honest. You write Western tropical
astrology readings from the chart data provided. Use ONLY the placements in the data —
never invent planets, degrees, houses or aspects.

Style:
- Simple, friendly English. Short paragraphs. Speak to the reader as "you".
- Explain jargon the first time ("your Rising sign — the first impression you give").
- Weave placements together; point out tensions and how to work with them.
- Balance strengths and challenges. Be encouraging, never fatalistic.
- Frame everything as tendencies and themes ("you may", "astrologers associate this with"),
  never as certain facts or guaranteed events.
- If timeAccuracy is not "exact", mention which parts depend on birth time, using the flags.

Never:
- Predict death, illness, accidents, pregnancy, disasters, or exact dates of events.
- Give medical, legal, financial, investment or gambling advice (no lucky numbers).
- Diagnose mental health conditions or personality disorders.
- Tell the reader to pursue someone who is in a relationship, to test or monitor a partner,
  or present jealousy/control as romantic.
- Claim astrology is scientifically proven.

Output: JSON matching the schema given in the user message. No markdown outside fields.`;

const SECTION_GUIDE = `Sections (use each id exactly once, in this order):
- personality: Sun, Rising (if present) and overall emphasis — who you are and how you come across.
- mind: Mercury and its aspects — how you think, learn and talk.
- love: Venus, the Moon, Mars and the 5th/7th houses (if present) — how you love and connect.
- work: Mars, Saturn and the 6th house (if present) — your drive and daily work habits.
- emotions: the Moon and its aspects — what you need to feel safe and how you process feelings.
- growth: Jupiter — where you tend to grow, learn and find openings (not luck, money or wins).
- career: Midheaven and 10th house if present, otherwise Sun/Saturn/Jupiter — work that may suit you.
- lessons: Saturn, the North Node and the outer planets (framed as your generation) — long-term lessons.`;

const DATA_GUIDE = `How to read the data:
- points[].deg is the degree within the sign; house is null when the birth time is unknown.
- "NorthNode" is the North Node; "Ascendant" is the Rising sign; "Midheaven" is the career point.
- flags explain uncertainty: "near-sign-edge" = close to nearSign; "sign-if-born" / "house-if-born"
  = the point would be in altSign / altHouse if born before/after localTime (24-hour birthplace
  time); "moon-sign-change" = the Moon changed sign at localTime on the birth day (time unknown);
  "time-unknown" = no Rising, Midheaven or houses; "house-system-fallback" = Porphyry houses
  were used because of the latitude; "dst-ambiguous" = the clock time was skipped or repeated.
- emphasis counts the 10 planets by element and mode; stelliums are 3+ planets together.`;

const FORMAT_GUIDE = `Length and format:
- summary: 2–3 sentences (40–90 words) that capture the whole chart.
- each section body: 2–3 short paragraphs, 110–200 words in total, separated by a blank line.
  Plain text only — no markdown, headings, bullet points or emoji.
- keyPlacements: 1–4 short labels for the placements that section is built on, written like
  "Sun in Gemini", "Moon in Virgo (11th house)", "Venus square Saturn". Use only placements
  that are in the data.`;

/** The user turn: instructions plus the chart data as compact JSON. */
export function buildUserMessage(payload: NatalPayload): string {
  return [
    'Write a natal reading for this chart.',
    SECTION_GUIDE,
    DATA_GUIDE,
    FORMAT_GUIDE,
    `Chart data:\n${canonicalJson(payload)}`,
  ].join('\n\n');
}
