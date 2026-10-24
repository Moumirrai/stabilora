import { describe, expect, it } from 'vitest';
import {
  MAX_LABEL_CHANNELS,
  channelOfFlags,
  clampChannel,
  packLabelFlags,
  FLOATS_PER_GLYPH,
  GLYPH_STRIDE,
  I_ANCHOR,
  I_COLOR,
  I_OFFSET,
  I_ROT_FLAGS,
  blockTopEm,
  countRenderableGlyphs,
  createLayoutMetrics,
  fillInstanceConstants,
  layoutText,
  translateGlyphs,
  type AlignX,
  type AlignY,
  type FontData,
} from './textLayout';

/**
 * Synthetic monospace font: advance 0.5, lineHeight 1.2, ascender 1.0,
 * descender -0.2 (no half-leading, so baseline-in-line = 1.0).
 * 'A'/'B' have quads, ' ' has none, fallback (record 0) has a quad.
 */
function makeFont(): FontData {
  const glyphs = new Float32Array(4 * GLYPH_STRIDE);
  const set = (
    idx: number,
    adv: number,
    l: number,
    t: number,
    r: number,
    b: number,
    uvOffset: number
  ) => {
    const o = idx * GLYPH_STRIDE;
    glyphs.set([adv, l, t, r, b, uvOffset, 0.1, uvOffset + 0.1, 0.2], o);
  };
  set(0, 0.5, 0.05, 0.7, 0.45, 0, 0.9); // fallback box
  set(1, 0.5, 0.05, 0.7, 0.45, 0, 0.0); // A
  set(2, 0.5, 0.05, 0.7, 0.45, 0, 0.2); // B
  glyphs[3 * GLYPH_STRIDE] = 0.5; // space: advance only
  const table = new Uint16Array(0x10000);
  table[65] = 1;
  table[66] = 2;
  table[32] = 3;
  return {
    lineHeight: 1.2,
    ascender: 1.0,
    descender: -0.2,
    glyphIndexByCode: table,
    glyphs,
  };
}

const font = makeFont();

function run(
  text: string,
  alignX: AlignX = 'left',
  alignY: AlignY = 'baseline',
  maxGlyphs = 64
) {
  const out = new Float32Array(maxGlyphs * FLOATS_PER_GLYPH);
  const metrics = createLayoutMetrics();
  const n = layoutText(
    font,
    text,
    alignX,
    alignY,
    out,
    I_OFFSET,
    FLOATS_PER_GLYPH,
    maxGlyphs,
    metrics
  );
  const glyph = (i: number) => {
    const o = i * FLOATS_PER_GLYPH + I_OFFSET;
    return {
      x: out[o],
      y: out[o + 1],
      w: out[o + 2],
      h: out[o + 3],
      uv: [out[o + 4], out[o + 5], out[o + 6], out[o + 7]],
    };
  };
  return { n, metrics, glyph, out };
}

describe('countRenderableGlyphs', () => {
  it('skips spaces, newlines and control chars', () => {
    expect(countRenderableGlyphs(font, 'A B\nA\tB\r')).toBe(4);
    expect(countRenderableGlyphs(font, '')).toBe(0);
    expect(countRenderableGlyphs(font, '   ')).toBe(0);
  });
});

describe('layoutText single line', () => {
  it('left / baseline places glyph relative to the anchor in em (y down)', () => {
    const { n, glyph, metrics } = run('A');
    expect(n).toBe(1);
    const g = glyph(0);
    expect(g.x).toBeCloseTo(0.05);
    expect(g.y).toBeCloseTo(-0.7); // baseline at 0, glyph top 0.7 above it
    expect(g.w).toBeCloseTo(0.4);
    expect(g.h).toBeCloseTo(0.7);
    expect(g.uv).toEqual([
      0,
      expect.closeTo(0.1),
      expect.closeTo(0.1),
      expect.closeTo(0.2),
    ]);
    expect(metrics.widthEm).toBeCloseTo(0.5);
    expect(metrics.lineCount).toBe(1);
  });

  it('advances the pen per glyph, including spaces', () => {
    const { glyph, n } = run('A B');
    expect(n).toBe(2);
    expect(glyph(0).x).toBeCloseTo(0.05);
    expect(glyph(1).x).toBeCloseTo(1.0 + 0.05);
  });

  it('center and right alignment shift by 0.5x / 1x of the line width', () => {
    expect(run('AB', 'center').glyph(0).x).toBeCloseTo(-0.5 + 0.05);
    expect(run('AB', 'right').glyph(0).x).toBeCloseTo(-1.0 + 0.05);
    expect(run('AB', 'right').glyph(1).x).toBeCloseTo(-0.5 + 0.05);
  });

  it('vertical alignment', () => {
    // First baseline: top -> 1.0, middle -> -0.6 + 1.0, bottom -> -1.2 + 1.0
    expect(run('A', 'left', 'top').glyph(0).y).toBeCloseTo(1.0 - 0.7);
    expect(run('A', 'left', 'middle').glyph(0).y).toBeCloseTo(-0.6 + 1.0 - 0.7);
    expect(run('A', 'left', 'bottom').glyph(0).y).toBeCloseTo(-0.2 - 0.7);
    expect(run('A', 'left', 'baseline').glyph(0).y).toBeCloseTo(-0.7);
  });

  it('half-leading is distributed around the ascender/descender box', () => {
    const roomy: FontData = { ...font, lineHeight: 1.6 }; // 0.4 extra -> 0.2 leading
    expect(blockTopEm(roomy, 1, 'top')).toBe(0);
    expect(blockTopEm(roomy, 1, 'baseline')).toBeCloseTo(-1.2);
  });
});

describe('layoutText multi-line', () => {
  it('breaks on \\n using the font line height', () => {
    const { n, glyph, metrics } = run('A\nB');
    expect(n).toBe(2);
    expect(metrics.lineCount).toBe(2);
    expect(metrics.heightEm).toBeCloseTo(2.4);
    expect(glyph(1).y - glyph(0).y).toBeCloseTo(1.2);
  });

  it('aligns each line independently', () => {
    const { glyph } = run('AB\nA', 'center');
    expect(glyph(0).x).toBeCloseTo(-0.5 + 0.05);
    expect(glyph(2).x).toBeCloseTo(-0.25 + 0.05); // second line width 0.5
  });

  it('middle alignment centers the whole block', () => {
    const { glyph } = run('A\nB', 'left', 'middle');
    // top = -1.2; line0 baseline = -0.2, line1 baseline = 1.0
    expect(glyph(0).y).toBeCloseTo(-0.2 - 0.7);
    expect(glyph(1).y).toBeCloseTo(1.0 - 0.7);
  });

  it('counts a trailing newline as an (empty) line', () => {
    expect(run('A\n').metrics.lineCount).toBe(2);
    expect(run('').metrics.lineCount).toBe(1);
  });
});

describe('layoutText robustness', () => {
  it('maps missing glyphs to the fallback instead of throwing', () => {
    const { n, glyph } = run('Z');
    expect(n).toBe(1);
    expect(glyph(0).uv[0]).toBeCloseTo(0.9); // fallback record (index 0) UVs
    expect(glyph(0).uv[1]).toBeCloseTo(0.1);
  });

  it('treats a surrogate pair as one fallback glyph', () => {
    const { n, metrics } = run('\u{1F600}');
    expect(n).toBe(1);
    expect(metrics.widthEm).toBeCloseTo(0.5);
  });

  it('truncates at maxGlyphs and reports it', () => {
    const { n, metrics } = run('ABABAB', 'left', 'baseline', 4);
    expect(n).toBe(4);
    expect(metrics.truncated).toBe(true);
    expect(run('AB', 'left', 'baseline', 4).metrics.truncated).toBe(false);
  });

  it('writes with a custom stride/offset without touching other floats', () => {
    const out = new Float32Array(32).fill(-9);
    const metrics = createLayoutMetrics();
    layoutText(font, 'A', 'left', 'baseline', out, 3, 16, 2, metrics);
    expect(out[2]).toBe(-9);
    expect(out[3]).toBeCloseTo(0.05);
    expect(out[10]).toBeCloseTo(0.2); // last of the 8 written floats (3..10)
    expect(out[11]).toBe(-9);
  });
});

describe('fillInstanceConstants', () => {
  it('fills anchor, color, rotation and flags for each glyph', () => {
    const out = new Float32Array(3 * FLOATS_PER_GLYPH);
    fillInstanceConstants(out, 1, 2, 5, 6, 0.1, 0.2, 0.3, 0.4, 1.5, 3);
    expect(out[I_ANCHOR]).toBe(0); // glyph 0 untouched
    for (const g of [1, 2]) {
      const o = g * FLOATS_PER_GLYPH;
      expect([out[o + I_ANCHOR], out[o + I_ANCHOR + 1]]).toEqual([5, 6]);
      expect(out[o + I_COLOR + 3]).toBeCloseTo(0.4);
      expect(out[o + I_ROT_FLAGS]).toBeCloseTo(1.5);
      expect(out[o + I_ROT_FLAGS + 1]).toBe(3);
    }
  });
});

describe('translateGlyphs', () => {
  it('shifts offsets of the given glyph range only', () => {
    const out = new Float32Array(3 * FLOATS_PER_GLYPH);
    layoutText(
      font,
      'AB',
      'left',
      'baseline',
      out,
      I_OFFSET,
      FLOATS_PER_GLYPH,
      3,
      createLayoutMetrics()
    );
    const x0 = out[I_OFFSET];
    const x1 = out[FLOATS_PER_GLYPH + I_OFFSET];
    translateGlyphs(out, 1, 1, 2, -3);
    expect(out[I_OFFSET]).toBeCloseTo(x0);
    expect(out[FLOATS_PER_GLYPH + I_OFFSET]).toBeCloseTo(x1 + 2);
    expect(out[FLOATS_PER_GLYPH + I_OFFSET + 1]).toBeCloseTo(-0.7 - 3);
  });
});

describe('size channel flags', () => {
  it('round-trips the channel for every channel', () => {
    for (let ch = 0; ch < MAX_LABEL_CHANNELS; ch++) {
      expect(channelOfFlags(packLabelFlags(ch))).toBe(ch);
    }
  });

  it('packs channel 0 as flag value 0', () => {
    expect(packLabelFlags(0)).toBe(0);
  });

  it('clamps out-of-range, fractional and NaN channels', () => {
    expect(clampChannel(-3)).toBe(0);
    expect(clampChannel(NaN)).toBe(0);
    expect(clampChannel(2.9)).toBe(2);
    expect(clampChannel(1000)).toBe(MAX_LABEL_CHANNELS - 1);
  });

  it('fits exactly in the float32 flags slot', () => {
    const f = new Float32Array([packLabelFlags(MAX_LABEL_CHANNELS - 1)]);
    expect(channelOfFlags(f[0])).toBe(MAX_LABEL_CHANNELS - 1);
  });
});
