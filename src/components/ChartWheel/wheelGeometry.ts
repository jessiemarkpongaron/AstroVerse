import { angleDiff, normalizeDeg } from '../../lib/astro/zodiac.ts';

export const WHEEL = {
  size: 400,
  c: 200,
  rOuter: 196, // outer edge of the sign ring
  rSigns: 164, // inner edge of the sign ring
  rPlanets: 138, // planet glyph radius
  rHouseNumbers: 84, // house number radius
  rAspects: 72, // aspect circle
} as const;

/**
 * Screen position of an ecliptic longitude. The reference longitude (the Ascendant, or 0° Aries
 * when the time is unknown) sits at 9 o'clock and the zodiac runs counter-clockwise.
 */
export function polar(
  longitude: number,
  radius: number,
  reference: number,
): { x: number; y: number } {
  const a = ((180 + longitude - reference) * Math.PI) / 180;
  return {
    x: round(WHEEL.c + radius * Math.cos(a)),
    y: round(WHEEL.c - radius * Math.sin(a)),
  };
}

function round(v: number) {
  return Math.round(v * 100) / 100;
}

/**
 * Spread label angles so neighbours are at least `minSep` degrees apart, with the least total
 * squared movement and without reordering. The circle is cut at its largest empty gap; then
 * with y_i = x_i − i·minSep the problem becomes isotonic regression (pool-adjacent-violators),
 * and p_i = z_i + i·minSep. Returns display longitudes in input order.
 */
export function spreadLabels(longitudes: readonly number[], minSep: number): number[] {
  const n = longitudes.length;
  if (n < 2) return [...longitudes];
  const sep = Math.min(minSep, 360 / n);
  const order = longitudes
    .map((lon, i) => ({ i, lon: normalizeDeg(lon) }))
    .sort((a, b) => a.lon - b.lon);

  // Start just after the largest gap so the sequence can be unwrapped linearly.
  let start = 0;
  let largest = -1;
  for (let k = 0; k < n; k++) {
    const gap = normalizeDeg(
      (order[(k + 1) % n] as { lon: number }).lon - (order[k] as { lon: number }).lon,
    );
    if (gap > largest) {
      largest = gap;
      start = (k + 1) % n;
    }
  }
  const seq = Array.from(
    { length: n },
    (_, k) => order[(start + k) % n] as { i: number; lon: number },
  );
  const base = seq[0]?.lon ?? 0;
  const x = seq.map((o) => base + normalizeDeg(o.lon - base));

  // Pool-adjacent-violators on y_i = x_i − i·sep (non-decreasing fit).
  const blocks: { sum: number; count: number }[] = [];
  x.forEach((xi, i) => {
    blocks.push({ sum: xi - i * sep, count: 1 });
    while (blocks.length > 1) {
      const last = blocks[blocks.length - 1] as { sum: number; count: number };
      const prev = blocks[blocks.length - 2] as { sum: number; count: number };
      if (prev.sum / prev.count <= last.sum / last.count) break;
      prev.sum += last.sum;
      prev.count += last.count;
      blocks.pop();
    }
  });
  const z: number[] = [];
  for (const b of blocks) for (let k = 0; k < b.count; k++) z.push(b.sum / b.count);

  const out = new Array<number>(n);
  seq.forEach((o, k) => (out[o.i] = normalizeDeg((z[k] as number) + k * sep)));
  return out;
}

/** Midpoint longitude going forward from a to b (for house numbers). */
export function forwardMidpoint(a: number, b: number): number {
  return normalizeDeg(a + normalizeDeg(b - a) / 2);
}

export { angleDiff };
