import type { Chart, PointName } from './astro/types.ts';
import { SIGN_NAMES } from './astro/zodiac.ts';
import { signGlyph } from './display.ts';
import { bigThreeEntry, type BigThreeKey } from './interpret/staticText.ts';

/**
 * Shareable Big Three image (PRD F10): 1080×1350, signs and keywords only. No name, date, time,
 * place or degrees, so the image can't be used to work out someone's birth data.
 */
export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;
export const CARD_FOOTER = 'astroverse.digitalverseph.com';

export interface ShareCardRow {
  label: 'Sun' | 'Moon' | 'Rising';
  role: string;
  sign: string | null;
  glyph: string;
  keywords: string[];
}

const ROWS: { point: PointName; key: BigThreeKey; label: ShareCardRow['label']; role: string }[] =
  [
    { point: 'Sun', key: 'sun', label: 'Sun', role: 'Core self' },
    { point: 'Moon', key: 'moon', label: 'Moon', role: 'Emotions' },
    { point: 'Ascendant', key: 'rising', label: 'Rising', role: 'First impression' },
  ];

/** U+FE0E asks for the text (not emoji) form of zodiac glyphs. */
const TEXT_STYLE = '︎';

export function shareCardContent(chart: Chart): ShareCardRow[] {
  return ROWS.map(({ point, key, label, role }) => {
    const p = chart.points.find((x) => x.name === point);
    if (!p) return { label, role, sign: null, glyph: '', keywords: [] };
    return {
      label,
      role,
      sign: SIGN_NAMES[p.sign],
      glyph: signGlyph(p.sign) + TEXT_STYLE,
      keywords: bigThreeEntry(key, p.sign).keywords.slice(0, 3),
    };
  });
}

/** The subset of CanvasRenderingContext2D the card uses (lets tests pass a recorder). */
export type CardContext = Pick<
  CanvasRenderingContext2D,
  | 'fillStyle'
  | 'strokeStyle'
  | 'lineWidth'
  | 'font'
  | 'textAlign'
  | 'textBaseline'
  | 'fillRect'
  | 'fillText'
  | 'measureText'
  | 'beginPath'
  | 'arc'
  | 'fill'
  | 'roundRect'
  | 'stroke'
  | 'createLinearGradient'
>;

const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const C = {
  night: '#0f0b1e',
  dusk: '#1e1640',
  gold: '#f5c96a',
  text: '#f1f5f9',
  muted: '#a5a3c4',
  panel: '#221a46',
  line: 'rgba(245,201,106,0.35)',
};

/** Deterministic star field (same image every time; no Math.random). */
function stars(ctx: CardContext) {
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  let s = 7;
  for (let i = 0; i < 70; i++) {
    s = (s * 9301 + 49297) % 233280;
    const x = (s / 233280) * CARD_WIDTH;
    s = (s * 9301 + 49297) % 233280;
    const y = (s / 233280) * CARD_HEIGHT;
    ctx.beginPath();
    ctx.arc(x, y, i % 5 === 0 ? 2.5 : 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawShareCard(ctx: CardContext, rows: readonly ShareCardRow[]): void {
  const bg = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT);
  bg.addColorStop(0, C.night);
  bg.addColorStop(1, C.dusk);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  stars(ctx);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = C.gold;
  ctx.font = `600 44px ${FONT}`;
  ctx.fillText('✦ AstroVerse', CARD_WIDTH / 2, 130);
  ctx.fillStyle = C.text;
  ctx.font = `700 76px ${FONT}`;
  ctx.fillText('My Big Three', CARD_WIDTH / 2, 230);

  const x = 90;
  const w = CARD_WIDTH - 2 * x;
  const h = 270;
  rows.forEach((row, i) => {
    const y = 290 + i * (h + 26);
    ctx.fillStyle = C.panel;
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 36);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = C.muted;
    ctx.font = `500 36px ${FONT}`;
    ctx.fillText(`${row.label} · ${row.role}`, x + 50, y + 64);

    if (row.sign === null) {
      ctx.fillStyle = C.text;
      ctx.font = `500 40px ${FONT}`;
      ctx.fillText('Add a birth time to see it', x + 50, y + 160);
      return;
    }
    ctx.fillStyle = C.gold;
    ctx.font = `400 96px ${FONT}`;
    ctx.fillText(row.glyph, x + 50, y + 168);
    ctx.fillStyle = C.text;
    ctx.font = `700 84px ${FONT}`;
    ctx.fillText(row.sign, x + 170, y + 166);
    ctx.fillStyle = C.muted;
    const line = row.keywords.join(' · ');
    let size = 36;
    do {
      ctx.font = `400 ${size}px ${FONT}`;
    } while (ctx.measureText(line).width > w - 100 && --size > 24);
    ctx.fillText(line, x + 50, y + 228);
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = C.muted;
  ctx.font = `400 34px ${FONT}`;
  ctx.fillText('Find yours free at', CARD_WIDTH / 2, CARD_HEIGHT - 105);
  ctx.fillStyle = C.gold;
  ctx.font = `600 38px ${FONT}`;
  ctx.fillText(CARD_FOOTER, CARD_WIDTH / 2, CARD_HEIGHT - 55);
}
