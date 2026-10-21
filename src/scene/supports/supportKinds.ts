import { Dof } from '@stabilora/arcora';
import type { GlyphName } from '../../viewport/rendering/glyphs/supportGlyphs';

export interface GlyphSpec {
  glyph: GlyphName;
  baseAngle: number;
  orientation: 'local' | 'elements';
}

const QUARTER = Math.PI / 2;

export const SUPPORT_KINDS = {
  pin: { glyph: 'pin', baseAngle: 0, orientation: 'local' },
  roller: { glyph: 'roller', baseAngle: 0, orientation: 'local' },
  verticalRoller: {
    glyph: 'roller',
    baseAngle: -QUARTER,
    orientation: 'local',
  },
  fixed: { glyph: 'fixed', baseAngle: 0, orientation: 'elements' },
  slider: { glyph: 'slider', baseAngle: 0, orientation: 'local' },
  verticalSlider: {
    glyph: 'slider',
    baseAngle: -QUARTER,
    orientation: 'local',
  },
  rotationOnly: { glyph: 'rotation', baseAngle: 0, orientation: 'local' },
} satisfies Record<string, GlyphSpec>;

export type SupportKind = keyof typeof SUPPORT_KINDS;

// spring glyph per DOF. A spring only draws on DOFs that are not constrained by dirichlet BC
export const SPRING_GLYPHS: Record<Dof, GlyphSpec> = {
  [Dof.Ux]: {
    glyph: 'springTranslation',
    baseAngle: -QUARTER,
    orientation: 'local',
  },
  [Dof.Uy]: {
    glyph: 'springTranslation',
    baseAngle: 0,
    orientation: 'local',
  },
  [Dof.Rz]: { glyph: 'springRotation', baseAngle: 0, orientation: 'local' },
};

export function classifySupport(
  ux: boolean,
  uy: boolean,
  rz: boolean
): SupportKind | null {
  if (ux && uy && rz) return 'fixed';
  if (ux && uy) return 'pin';
  if (uy && rz) return 'slider';
  if (ux && rz) return 'verticalSlider';
  if (uy) return 'roller';
  if (ux) return 'verticalRoller';
  if (rz) return 'rotationOnly';
  return null;
}
