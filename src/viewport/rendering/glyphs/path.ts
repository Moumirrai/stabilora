export type Point = readonly [number, number];
export type Segment = readonly [number, number, number, number];

const TAU = Math.PI * 2; // full circle

export function line(a: Point, b: Point): Segment[] {
  return [[a[0], a[1], b[0], b[1]]];
}

export function polyline(points: readonly Point[], closed = false): Segment[] {
  const out: Segment[] = [];
  const n = closed ? points.length : points.length - 1;
  for (let i = 0; i < n; i++) {
    out.push(...line(points[i], points[(i + 1) % points.length]));
  }
  return out;
}

// arc from angle `a0` to `a1`
export function arc(
  cx: number,
  cy: number,
  radius: number,
  a0: number,
  a1: number,
  steps = 8
): Segment[] {
  return polyline(arcPoints(cx, cy, radius, a0, a1, steps));
}

export function circle(
  cx: number,
  cy: number,
  radius: number,
  steps = 40
): Segment[] {
  return arc(cx, cy, radius, 0, TAU, steps);
}

// Closed polygon whose corners are replaced by tangent arcs of the given radius. The radius is clamped per corner so fillets never overrun an edge.
export function roundedPolygon(
  points: readonly Point[],
  radius: number
): Segment[] {
  const path: Point[] = [];
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const v = points[i];
    const toPrev = unit(sub(points[(i + n - 1) % n], v));
    const toNext = unit(sub(points[(i + 1) % n], v));
    const lenPrev = dist(points[(i + n - 1) % n], v);
    const lenNext = dist(points[(i + 1) % n], v);

    const cosAngle = clamp(dot(toPrev, toNext), -1, 1);
    const half = Math.acos(cosAngle) / 2;
    // straight (or degenerate) corner -> skip rounding
    if (half < 1e-3 || Math.abs(half - Math.PI / 2) < 1e-3) {
      path.push(v);
      continue;
    }

    // Distance from the vertex to each tangency point, limited so adjacent
    // fillets can each use at most half of a shared edge.
    const maxReach = Math.min(lenPrev, lenNext) / 2;
    const reach = Math.min(radius / Math.tan(half), maxReach);
    const r = reach * Math.tan(half);

    const a: Point = [v[0] + toPrev[0] * reach, v[1] + toPrev[1] * reach];
    const b: Point = [v[0] + toNext[0] * reach, v[1] + toNext[1] * reach];
    const bisector = unit([toPrev[0] + toNext[0], toPrev[1] + toNext[1]]);
    const centerDist = r / Math.sin(half);
    const cx = v[0] + bisector[0] * centerDist;
    const cy = v[1] + bisector[1] * centerDist;

    const aStart = Math.atan2(a[1] - cy, a[0] - cx);
    const aEnd = Math.atan2(b[1] - cy, b[0] - cx);
    const sweep = wrapPi(aEnd - aStart);
    const steps = Math.max(2, Math.ceil((Math.abs(sweep) / (Math.PI / 2)) * 6));
    path.push(...arcPoints(cx, cy, r, aStart, aStart + sweep, steps));
  }

  return polyline(path, true);
}

export function zigzag(
  from: Point,
  to: Point,
  teeth: number,
  amplitude: number
): Segment[] {
  const axis = sub(to, from);
  const normal = unit([-axis[1], axis[0]]);
  const points: Point[] = [from];
  const count = teeth * 2;
  for (let k = 0; k < count; k++) {
    const t = (k + 0.5) / count;
    const side = k % 2 === 0 ? 1 : -1;
    points.push([
      from[0] + axis[0] * t + normal[0] * amplitude * side,
      from[1] + axis[1] * t + normal[1] * amplitude * side,
    ]);
  }
  points.push(to);
  return polyline(points);
}

// spiral path growing from `r0` to `r1`
export function spiral(
  cx: number,
  cy: number,
  r0: number,
  r1: number,
  turns: number,
  stepsPerTurn = 16
): Segment[] {
  const steps = Math.ceil(turns * stepsPerTurn);
  const points: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = t * turns * TAU;
    const r = r0 + (r1 - r0) * t;
    points.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
  }
  return polyline(points);
}

// bounding box of a list of segments, in glyph units
export function segmentBounds(
  segments: readonly Segment[]
): [number, number, number, number] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x0, y0, x1, y1] of segments) {
    minX = Math.min(minX, x0, x1);
    minY = Math.min(minY, y0, y1);
    maxX = Math.max(maxX, x0, x1);
    maxY = Math.max(maxY, y0, y1);
  }
  return [minX, minY, maxX, maxY];
}

function arcPoints(
  cx: number,
  cy: number,
  radius: number,
  a0: number,
  a1: number,
  steps: number
): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    points.push([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius]);
  }
  return points;
}

// tiny vector math utilities

function sub(a: Point, b: Point): Point {
  return [a[0] - b[0], a[1] - b[1]];
}

function dot(a: Point, b: Point): number {
  return a[0] * b[0] + a[1] * b[1];
}

function dist(a: Point, b: Point): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function unit(a: Point): Point {
  const len = Math.hypot(a[0], a[1]);
  return len > 0 ? [a[0] / len, a[1] / len] : [0, 0];
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function wrapPi(a: number): number {
  return ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
}
