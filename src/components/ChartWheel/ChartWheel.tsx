import type { Chart, PointName } from '../../lib/astro/types.ts';
import { SIGN_NAMES } from '../../lib/astro/zodiac.ts';
import { POINT_GLYPHS, POINT_LABELS, SIGN_GLYPHS, aspectTone } from '../../lib/display.ts';
import { WHEEL, angleDiff, forwardMidpoint, polar, spreadLabels } from './wheelGeometry.ts';

const ELEMENT_FILL = [
  'fill-red-100 dark:fill-red-950/50', // fire
  'fill-emerald-100 dark:fill-emerald-950/50', // earth
  'fill-sky-100 dark:fill-sky-950/50', // air
  'fill-indigo-100 dark:fill-indigo-950/50', // water
] as const;

const ASPECT_STROKE = {
  flowing: 'stroke-sky-600 dark:stroke-sky-400',
  challenging: 'stroke-red-600 dark:stroke-red-400',
  blending: 'stroke-amber-600 dark:stroke-amber-400',
} as const;

const ANGLES: ReadonlySet<PointName> = new Set(['Ascendant', 'Midheaven']);

interface ChartWheelProps {
  chart: Chart;
}

/** Annular sector path between two longitudes. */
function sectorPath(from: number, to: number, r1: number, r2: number, ref: number) {
  const a = polar(from, r2, ref);
  const b = polar(to, r2, ref);
  const c = polar(to, r1, ref);
  const d = polar(from, r1, ref);
  // Counter-clockwise on screen = sweep-flag 0 in SVG (y axis points down).
  return `M${a.x} ${a.y} A${r2} ${r2} 0 0 0 ${b.x} ${b.y} L${c.x} ${c.y} A${r1} ${r1} 0 0 1 ${d.x} ${d.y}Z`;
}

export function ChartWheel({ chart }: ChartWheelProps) {
  const asc = chart.points.find((p) => p.name === 'Ascendant');
  const ref = asc?.longitude ?? 0;
  const { c, rOuter, rSigns, rPlanets, rHouseNumbers, rAspects } = WHEEL;
  const bodies = chart.points.filter((p) => !ANGLES.has(p.name));
  const display = spreadLabels(
    bodies.map((p) => p.longitude),
    9,
  );
  const lon = new Map(chart.points.map((p) => [p.name, p.longitude]));
  const cusps = chart.houses?.cusps ?? null;

  const summary = chart.points
    .map((p) => `${POINT_LABELS[p.name]} in ${SIGN_NAMES[p.sign]}`)
    .join(', ');

  return (
    <svg
      viewBox={`0 0 ${WHEEL.size} ${WHEEL.size}`}
      role="img"
      aria-labelledby="wheel-title wheel-desc"
      className="mx-auto block h-auto w-full max-w-[28rem] select-none"
    >
      <title id="wheel-title">Birth chart wheel</title>
      <desc id="wheel-desc">{summary}</desc>

      {/* Sign ring */}
      {SIGN_GLYPHS.map((glyph, i) => {
        const mid = polar(i * 30 + 15, (rOuter + rSigns) / 2, ref);
        return (
          <g key={i}>
            <path
              d={sectorPath(i * 30, i * 30 + 30, rSigns, rOuter, ref)}
              className={`${ELEMENT_FILL[i % 4]} stroke-slate-300 dark:stroke-slate-600`}
              strokeWidth={1}
            />
            <text
              x={mid.x}
              y={mid.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={18}
              className="fill-slate-700 dark:fill-slate-200"
            >
              {glyph}
            </text>
          </g>
        );
      })}

      {/* Inner circles */}
      <circle
        cx={c}
        cy={c}
        r={rSigns}
        className="fill-white stroke-slate-300 dark:fill-night dark:stroke-slate-600"
      />
      <circle
        cx={c}
        cy={c}
        r={rAspects}
        className="fill-none stroke-slate-300 dark:stroke-slate-600"
      />

      {/* Houses */}
      {cusps?.map((cusp, i) => {
        const angular = i % 3 === 0;
        const a = polar(cusp, rAspects, ref);
        const b = polar(cusp, angular ? rOuter : rSigns, ref);
        const n = polar(forwardMidpoint(cusp, cusps[(i + 1) % 12] as number), rHouseNumbers, ref);
        return (
          <g key={`h${i}`}>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              strokeWidth={angular ? 2 : 1}
              className={
                angular
                  ? 'stroke-slate-700 dark:stroke-slate-200'
                  : 'stroke-slate-300 dark:stroke-slate-600'
              }
            />
            <text
              x={n.x}
              y={n.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={10}
              className="fill-slate-500 dark:fill-slate-400"
            >
              {i + 1}
            </text>
          </g>
        );
      })}
      {asc && (
        <text
          x={polar(ref, rOuter + 2, ref).x + 2}
          y={c - 6}
          fontSize={10}
          fontWeight={700}
          className="fill-slate-700 dark:fill-slate-200"
        >
          AC
        </text>
      )}

      {/* Aspects (between bodies only, to keep the centre readable) */}
      {chart.aspects
        .filter((a) => !ANGLES.has(a.a) && !ANGLES.has(a.b))
        .map((a) => {
          const p = polar(lon.get(a.a) ?? 0, rAspects, ref);
          const q = polar(lon.get(a.b) ?? 0, rAspects, ref);
          if (a.type === 'conjunction') return null;
          return (
            <line
              key={`${a.a}-${a.b}`}
              x1={p.x}
              y1={p.y}
              x2={q.x}
              y2={q.y}
              strokeWidth={1.2}
              strokeOpacity={Math.max(0.35, 1 - a.orb / 10)}
              className={ASPECT_STROKE[aspectTone(a.type)]}
            />
          );
        })}

      {/* Planets: tick at true position, glyph at spread position */}
      {bodies.map((p, i) => {
        const tick1 = polar(p.longitude, rSigns, ref);
        const tick2 = polar(p.longitude, rSigns - 7, ref);
        const shown = display[i] as number;
        const g = polar(shown, rPlanets, ref);
        const moved = Math.abs(angleDiff(p.longitude, shown)) > 1;
        const lead = polar(shown, rPlanets + 11, ref);
        return (
          <g key={p.name}>
            <line
              x1={tick1.x}
              y1={tick1.y}
              x2={tick2.x}
              y2={tick2.y}
              strokeWidth={1.5}
              className="stroke-slate-700 dark:stroke-slate-200"
            />
            {moved && (
              <line
                x1={tick2.x}
                y1={tick2.y}
                x2={lead.x}
                y2={lead.y}
                strokeWidth={0.75}
                className="stroke-slate-400 dark:stroke-slate-500"
              />
            )}
            <text
              x={g.x}
              y={g.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={17}
              className={
                p.retrograde ? 'fill-red-700 dark:fill-red-400' : 'fill-ink dark:fill-slate-100'
              }
            >
              {POINT_GLYPHS[p.name]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
