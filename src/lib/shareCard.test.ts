import { buildChart } from './astro/chart.ts';
import type { BirthInput } from './astro/types.ts';
import {
  CARD_FOOTER,
  CARD_HEIGHT,
  CARD_WIDTH,
  drawShareCard,
  shareCardContent,
  type CardContext,
} from './shareCard.ts';

const carrascal: BirthInput = {
  date: '1990-05-31',
  time: '15:30',
  timeAccuracy: 'exact',
  place: { name: 'Carrascal', lat: 9.37028, lon: 125.94917, tz: 'Asia/Manila' },
};

/** Records every fillText and fillRect; other calls are no-ops. */
function recorder() {
  const texts: string[] = [];
  const rects: number[][] = [];
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    fillRect: (...a: number[]) => rects.push(a),
    fillText: (t: string) => texts.push(t),
    measureText: (t: string) => ({ width: t.length * 18 }),
    beginPath: () => {},
    arc: () => {},
    fill: () => {},
    roundRect: () => {},
    stroke: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
  } as unknown as CardContext;
  return { ctx, texts, rects };
}

describe('shareCardContent', () => {
  it('gives sign and 3 keywords for Sun, Moon and Rising', () => {
    const rows = shareCardContent(buildChart(carrascal));
    expect(rows.map((r) => [r.label, r.sign])).toEqual([
      ['Sun', 'Gemini'],
      ['Moon', 'Virgo'],
      ['Rising', 'Scorpio'],
    ]);
    for (const r of rows) {
      expect(r.keywords).toHaveLength(3);
      expect(r.glyph.endsWith('︎')).toBe(true);
    }
  });

  it('has no Rising sign without a birth time', () => {
    const rows = shareCardContent(
      buildChart({ ...carrascal, time: null, timeAccuracy: 'unknown' }),
    );
    expect(rows[2]).toMatchObject({ label: 'Rising', sign: null, keywords: [] });
  });
});

describe('drawShareCard', () => {
  it('fills the full 1080×1350 card and writes signs, keywords and the site', () => {
    const { ctx, texts, rects } = recorder();
    const rows = shareCardContent(buildChart(carrascal));
    drawShareCard(ctx, rows);
    expect(rects[0]).toEqual([0, 0, CARD_WIDTH, CARD_HEIGHT]);
    for (const sign of ['Gemini', 'Virgo', 'Scorpio']) expect(texts).toContain(sign);
    expect(texts).toContain(rows[0]?.keywords.join(' · '));
    expect(texts).toContain(CARD_FOOTER);
  });

  it('never writes birth data (date, time, place, degrees)', () => {
    const { ctx, texts } = recorder();
    drawShareCard(ctx, shareCardContent(buildChart(carrascal)));
    const all = texts.join('\n');
    expect(all).not.toMatch(/1990|15:30|Carrascal|°|\d{1,2}:\d{2}/);
  });

  it('shows a hint instead of a Rising sign when the time is unknown', () => {
    const { ctx, texts } = recorder();
    drawShareCard(
      ctx,
      shareCardContent(buildChart({ ...carrascal, time: null, timeAccuracy: 'unknown' })),
    );
    expect(texts).toContain('Add a birth time to see it');
  });
});
