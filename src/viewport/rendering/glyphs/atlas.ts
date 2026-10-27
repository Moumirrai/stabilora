import { segmentBounds, type Segment } from './path';

export interface GlyphAtlas<K extends string> {
  data: Float32Array;
  width: number;
  height: number;
  entries: Record<K, number>; // glyph name -> index passed to the shader
}

// Pack glyph segments into one float texture.
// Texel layout, read with texelFetch in glyph.vert/frag.glsl:
//   2g     = segmentStart, segmentCount, 0, 0
//   2g + 1 = minX, minY, maxX, maxY
//   2G...  = x0, y0, x1, y1 (one per segment)
export function buildGlyphAtlas<K extends string>(
  defs: Record<K, readonly Segment[]>,
  width = 256
): GlyphAtlas<K> {
  const names = Object.keys(defs) as K[];
  const headerTexels = names.length * 2;
  const segmentTexels = names.reduce((sum, name) => sum + defs[name].length, 0);
  const height = Math.max(1, Math.ceil((headerTexels + segmentTexels) / width));
  const data = new Float32Array(width * height * 4);

  const entries = {} as Record<K, number>;
  let cursor = headerTexels;

  names.forEach((name, index) => {
    const segments = defs[name];
    const bounds = segmentBounds(segments);
    entries[name] = index;

    data.set([cursor, segments.length, 0, 0], index * 2 * 4);
    data.set(bounds, (index * 2 + 1) * 4);
    for (const segment of segments) {
      data.set(segment, cursor * 4);
      cursor++;
    }
  });

  return { data, width, height, entries };
}
