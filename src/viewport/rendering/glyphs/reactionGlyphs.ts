import { arc, line, type Segment } from './path';

export const REACTION_GAP = 0.9;
export const REACTION_LEN = 1.0;
export const REACTION_TIP = REACTION_GAP + REACTION_LEN;
const MOMENT_HEAD_LEN = 0.24;
const MOMENT_HEAD_SPREAD = 0.15;
const MOMENT_HEAD_ROTATION = Math.PI / 12;

const MOMENT_R = 0.55;
const MOMENT_A0 = -Math.PI / 4;
const MOMENT_A1 = (5 * Math.PI) / 4;
export const MOMENT_OUTER = 0.72;

function momentHead(
  ex: number,
  ey: number,
  tx: number,
  ty: number,
  cw: boolean
): Segment[] {
  const radius = Math.hypot(ex, ey) || 1;
  const rx = ex / radius;
  const ry = ey / radius;

  const dir = cw ? 1 : -1;

  const cos = Math.cos(dir * MOMENT_HEAD_ROTATION);
  const sin = Math.sin(dir * MOMENT_HEAD_ROTATION);

  const rotatedTangentX = tx * cos - ty * sin;
  const rotatedTangentY = tx * sin + ty * cos;
  const rotatedRadialX = rx * cos - ry * sin;
  const rotatedRadialY = rx * sin + ry * cos;

  const baseX = ex - rotatedTangentX * MOMENT_HEAD_LEN;
  const baseY = ey - rotatedTangentY * MOMENT_HEAD_LEN;

  return [
    ...line(
      [ex, ey],
      [
        baseX + rotatedRadialX * MOMENT_HEAD_SPREAD,
        baseY + rotatedRadialY * MOMENT_HEAD_SPREAD,
      ]
    ),
    ...line(
      [ex, ey],
      [
        baseX - rotatedRadialX * MOMENT_HEAD_SPREAD,
        baseY - rotatedRadialY * MOMENT_HEAD_SPREAD,
      ]
    ),
  ];
}

function reactionMomentCcw(): Segment[] {
  const ex = Math.cos(MOMENT_A1) * MOMENT_R;
  const ey = Math.sin(MOMENT_A1) * MOMENT_R;
  return [
    ...arc(0, 0, MOMENT_R, MOMENT_A0, MOMENT_A1, 40),
    ...momentHead(ex, ey, -Math.sin(MOMENT_A1), Math.cos(MOMENT_A1), false),
  ];
}

function reactionMomentCw(): Segment[] {
  const ex = Math.cos(MOMENT_A0) * MOMENT_R;
  const ey = Math.sin(MOMENT_A0) * MOMENT_R;
  return [
    ...arc(0, 0, MOMENT_R, MOMENT_A1, MOMENT_A0, 40),
    ...momentHead(ex, ey, Math.sin(MOMENT_A0), -Math.cos(MOMENT_A0), true),
  ];
}

export const REACTION_GLYPH_DEFS = {
  reactionArrow: [
    ...line([0, REACTION_GAP], [0, REACTION_GAP + REACTION_LEN]),
    ...line([0, REACTION_GAP], [-0.18, REACTION_GAP + 0.32]),
    ...line([0, REACTION_GAP], [0.18, REACTION_GAP + 0.32]),
  ],
  reactionMomentCcw: reactionMomentCcw(),
  reactionMomentCw: reactionMomentCw(),
} as const satisfies Record<string, readonly Segment[]>;

export type ReactionGlyphName = keyof typeof REACTION_GLYPH_DEFS;
