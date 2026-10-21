import type { GlyphName } from './supportGlyphs';

// One glyph placed in world space. Shared by support collection and rendering.
export interface GlyphInstance {
  x: number;
  z: number;
  angle: number;
  glyph: GlyphName;
}
