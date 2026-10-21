import {
  circle,
  line,
  roundedPolygon,
  spiral,
  zigzag,
  type Point,
  type Segment,
} from './path';

// gap between the anchor and the tip of a glyph (pin, roller)
const GAP = 0.1;
const CORNER_RADIUS = 0.12;

// n evenly spaced values in [from, to].
function range(from: number, to: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) =>
    n === 1 ? from : from + ((to - from) * i) / (n - 1)
  );
}

// Diagonal ticks hanging below a horizontal bar at height y.
function hatch(y: number, from: number, to: number, count: number): Segment[] {
  const length = 0.22;
  return range(from, to, count).flatMap((x) =>
    line([x + length / 2, y], [x - length / 2, y + length])
  );
}

const TRIANGLE_HEIGHT = 0.7;
const TRIANGLE: readonly Point[] = [
  [0, GAP],
  [-0.4, GAP + TRIANGLE_HEIGHT],
  [0.4, GAP + TRIANGLE_HEIGHT],
];

const SPRING_LEAD = 0.15;
const SPRING_LENGTH = 0.6;
const SPRING_RADIUS = 0.45;
const SPRING_GROUND_Y = 0.75;

export const GLYPH_DEFS = {
  pin: roundedPolygon(TRIANGLE, CORNER_RADIUS),

  roller: [
    ...roundedPolygon(TRIANGLE, CORNER_RADIUS),
    ...line(
      [-0.5, GAP + TRIANGLE_HEIGHT + 0.14],
      [0.5, GAP + TRIANGLE_HEIGHT + 0.14]
    ),
  ],

  fixed: [...line([-0.65, 0], [0.65, 0]), ...hatch(0, -0.5, 0.5, 5)],

  slider: [
    ...line([-0.6, 0], [0.6, 0]),
    ...circle(-0.28, 0.25, 0.12, 16),
    ...circle(0.28, 0.25, 0.12, 16),
    ...line([-0.6, 0.5], [0.6, 0.5]),
    ...hatch(0.5, -0.5, 0.5, 5),
  ],

  rotation: [
    ...circle(0, 0, 0.5, 40),
    ...[1, 3, 5, 7].flatMap((k) => {
      const a = (k * Math.PI) / 4;
      const [c, s] = [Math.cos(a), Math.sin(a)];
      return line([c * 0.5, s * 0.5], [c * 0.68, s * 0.68]);
    }),
  ],

  springTranslation: [
    ...line([0, 0], [0, SPRING_LEAD]),
    ...zigzag([0, SPRING_LEAD], [0, SPRING_LEAD + SPRING_LENGTH], 3, 0.15),
    ...line(
      [0, SPRING_LEAD + SPRING_LENGTH],
      [0, SPRING_LEAD * 2 + SPRING_LENGTH]
    ),
    ...line(
      [-0.3, SPRING_LEAD * 2 + SPRING_LENGTH],
      [0.3, SPRING_LEAD * 2 + SPRING_LENGTH]
    ),
  ],

  springRotation: [
    ...spiral(0, 0, 0.1, SPRING_RADIUS, 2.25),
    ...line([0, SPRING_RADIUS], [0, SPRING_GROUND_Y]),
    ...line([-0.65, SPRING_GROUND_Y], [0.65, SPRING_GROUND_Y]),
    ...hatch(SPRING_GROUND_Y, -0.5, 0.5, 5),
  ],
} as const satisfies Record<string, readonly Segment[]>;

export type GlyphName = keyof typeof GLYPH_DEFS;
