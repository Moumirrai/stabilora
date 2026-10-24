import { describe, expect, it } from 'vitest';
import atlasJson from '../../../../public/fonts/msdf/atlas.json';
import {
  atlasBoundsToUv,
  parseMsdfAtlas,
  type MsdfAtlasData,
} from './msdfAtlas';
import {
  FLOATS_PER_GLYPH,
  G_ADVANCE,
  G_U0,
  G_U1,
  G_V0,
  G_V1,
  GLYPH_STRIDE,
  countRenderableGlyphs,
  createLayoutMetrics,
  layoutText,
} from './textLayout';

const bounds = { left: 100, right: 200, bottom: 700, top: 800 };

describe('atlasBoundsToUv', () => {
  it('yOrigin bottom flips v so v=0 is the image top', () => {
    const uv = atlasBoundsToUv(bounds, 1000, 1000, 'bottom');
    expect(uv.u0).toBeCloseTo(0.1);
    expect(uv.u1).toBeCloseTo(0.2);
    expect(uv.v0).toBeCloseTo(0.2); // top edge
    expect(uv.v1).toBeCloseTo(0.3); // bottom edge
  });

  it('yOrigin top keeps y as-is', () => {
    const uv = atlasBoundsToUv(
      { left: 100, right: 200, top: 700, bottom: 800 },
      1000,
      1000,
      'top'
    );
    expect(uv.v0).toBeCloseTo(0.7);
    expect(uv.v1).toBeCloseTo(0.8);
  });
});

function tiny(over: Partial<MsdfAtlasData['atlas']> = {}): MsdfAtlasData {
  return {
    atlas: {
      type: 'msdf',
      distanceRange: 4,
      size: 32,
      width: 256,
      height: 128,
      yOrigin: 'bottom',
      ...over,
    },
    metrics: { emSize: 1, lineHeight: 1.2, ascender: 1, descender: -0.2 },
    glyphs: [
      { unicode: 32, advance: 0.5 },
      {
        unicode: 65,
        advance: 0.5,
        planeBounds: { left: 0, bottom: 0, right: 0.5, top: 0.8 },
        atlasBounds: { left: 0, bottom: 0, right: 16, top: 32 },
      },
    ],
  };
}

describe('parseMsdfAtlas', () => {
  it('parses glyphs, UVs and atlas parameters', () => {
    const f = parseMsdfAtlas(tiny());
    expect(f.pxRange).toBe(4);
    expect(f.atlasFontSizePx).toBe(32);
    const g = f.glyphIndexByCode[65] * GLYPH_STRIDE;
    expect(f.glyphs[g + G_U0]).toBe(0);
    expect(f.glyphs[g + G_U1]).toBeCloseTo(16 / 256);
    expect(f.glyphs[g + G_V0]).toBeCloseTo(1 - 32 / 128); // top
    expect(f.glyphs[g + G_V1]).toBe(1); // bottom row of image
    expect(f.glyphs[g + G_V0]).toBeLessThan(f.glyphs[g + G_V1]);
  });

  it('missing glyphs resolve to index 0 (fallback) without throwing', () => {
    const f = parseMsdfAtlas(tiny());
    expect(f.glyphIndexByCode[0x4e2d]).toBe(0);
    expect(f.fallbackCodePoint).toBe(0x20); // no box / '?' in this atlas -> space
    expect(f.glyphs[G_ADVANCE]).toBeCloseTo(0.5);
    const out = new Float32Array(FLOATS_PER_GLYPH * 4);
    expect(() =>
      layoutText(
        f,
        '\u4e2d',
        'left',
        'baseline',
        out,
        2,
        FLOATS_PER_GLYPH,
        4,
        createLayoutMetrics()
      )
    ).not.toThrow();
  });

  it('rejects non-msdf atlases', () => {
    expect(() => parseMsdfAtlas(tiny({ type: 'sdf' }))).toThrow(/unsupported/);
  });
});

describe('bundled atlas (public/fonts/msdf/atlas.json)', () => {
  const font = parseMsdfAtlas(atlasJson as MsdfAtlasData);

  it('has sane metrics and normalized UVs for every mapped glyph', () => {
    expect(font.lineHeight).toBeGreaterThan(1);
    for (let code = 33; code < 127; code++) {
      const gi = font.glyphIndexByCode[code];
      expect(gi, `glyph ${code}`).toBeGreaterThan(0);
      const o = gi * GLYPH_STRIDE;
      expect(font.glyphs[o + G_U0]).toBeGreaterThanOrEqual(0);
      expect(font.glyphs[o + G_U1]).toBeLessThanOrEqual(1);
      expect(font.glyphs[o + G_V0]).toBeGreaterThanOrEqual(0);
      expect(font.glyphs[o + G_V1]).toBeLessThanOrEqual(1);
      expect(font.glyphs[o + G_V0]).toBeLessThan(font.glyphs[o + G_V1]);
    }
  });

  it('lays out a label and falls back for unknown characters', () => {
    expect(countRenderableGlyphs(font, 'N12 \u4e2d')).toBe(4);
  });
});
