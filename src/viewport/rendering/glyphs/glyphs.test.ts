import { describe, expect, it } from 'vitest';
import { GLYPH_DEFS } from './supportGlyphs';
import { buildGlyphAtlas } from './atlas';
import { roundedPolygon, segmentBounds, zigzag } from './path';

describe('glyph geometry', () => {
  it('rounded polygon stays inside the sharp polygon and is closed', () => {
    const tri: [number, number][] = [
      [0, 0],
      [-0.4, 0.7],
      [0.4, 0.7],
    ];
    const segs = roundedPolygon(tri, 0.12);
    const [minX, minY, maxX, maxY] = segmentBounds(segs);
    expect(minX).toBeGreaterThanOrEqual(-0.4 - 1e-9);
    expect(maxX).toBeLessThanOrEqual(0.4 + 1e-9);
    expect(minY).toBeGreaterThan(0); // apex is rounded off
    expect(maxY).toBeLessThanOrEqual(0.7 + 1e-9);
    // Consecutive segments connect and the path closes.
    for (let i = 0; i < segs.length; i++) {
      const next = segs[(i + 1) % segs.length];
      expect(segs[i][2]).toBeCloseTo(next[0]);
      expect(segs[i][3]).toBeCloseTo(next[1]);
    }
  });

  it('zigzag starts and ends on the axis endpoints', () => {
    const segs = zigzag([0, 0.15], [0, 0.75], 3, 0.15);
    expect(segs[0].slice(0, 2)).toEqual([0, 0.15]);
    expect(segs.at(-1)!.slice(2)).toEqual([0, 0.75]);
    expect(segs).toHaveLength(7);
  });

  it('atlas indexes every glyph and its segments', () => {
    const atlas = buildGlyphAtlas(GLYPH_DEFS);
    const names = Object.keys(GLYPH_DEFS) as (keyof typeof GLYPH_DEFS)[];
    expect(new Set(Object.values(atlas.entries)).size).toBe(names.length);

    // Headers occupy the first 2 texels of each glyph, segments follow.
    let cursor = names.length * 2;
    for (const name of names) {
      const index = atlas.entries[name];
      const header = atlas.data.slice(index * 8, index * 8 + 4);
      const count = GLYPH_DEFS[name].length;
      expect([header[0], header[1]]).toEqual([cursor, count]);
      expect([...atlas.data.slice(cursor * 4, cursor * 4 + 4)]).toEqual(
        GLYPH_DEFS[name][0].map(Math.fround)
      );
      cursor += count;
    }
  });
});
