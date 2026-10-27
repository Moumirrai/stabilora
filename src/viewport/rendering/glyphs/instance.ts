// One glyph placed in world space. Shared by support collection and rendering.
export interface GlyphInstance<G extends string> {
  x: number;
  z: number;
  angle: number;
  glyph: G;
}
