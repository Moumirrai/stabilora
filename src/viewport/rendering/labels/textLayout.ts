// em, y-down, relative to anchor; no pixi/dom. Writes caller-owned arrays in GPU instance layout.
export type AlignX = 'left' | 'center' | 'right';
export type AlignY = 'top' | 'middle' | 'bottom' | 'baseline';

export const GLYPH_STRIDE = 9;
export const G_ADVANCE = 0;
export const G_PLANE_LEFT = 1; // plane bounds, em, y-up
export const G_PLANE_TOP = 2;
export const G_PLANE_RIGHT = 3;
export const G_PLANE_BOTTOM = 4;
export const G_U0 = 5; // uvs, v=0 top
export const G_V0 = 6; // v at quad top
export const G_U1 = 7;
export const G_V1 = 8; // v at quad bottom

export interface FontData {
  readonly lineHeight: number;
  readonly ascender: number; // em, up+
  readonly descender: number; // em, down-
  readonly glyphIndexByCode: Uint16Array; // code unit -> record, 0 = fallback
  readonly glyphs: Float32Array; // GLYPH_STRIDE floats each, record 0 = fallback
}

export const FLOATS_PER_GLYPH = 16;
export const BYTES_PER_GLYPH = FLOATS_PER_GLYPH * 4;

export const I_ANCHOR = 0; // vec2 world x,y
export const I_OFFSET = 2; // vec2 em, from anchor, y down
export const I_SIZE = 4; // vec2 em
export const I_UV = 6; // vec4 u0,v0,u1,v1
export const I_COLOR = 10; // vec4
export const I_ROT_FLAGS = 14; // vec2 rotation (rad), flags

export const MAX_LABEL_CHANNELS = 32; // flags float = channel 0..31

// NaN -> 0
export function clampChannel(channel: number): number {
  if (!(channel > 0)) return 0;
  return channel >= MAX_LABEL_CHANNELS - 1
    ? MAX_LABEL_CHANNELS - 1
    : Math.floor(channel);
}

export function packLabelFlags(channel: number): number {
  return clampChannel(channel);
}

export function channelOfFlags(flags: number): number {
  return Math.floor(flags) & (MAX_LABEL_CHANNELS - 1);
}

export interface LayoutMetrics {
  glyphCount: number;
  widthEm: number; // widest line
  heightEm: number; // lineCount * lineHeight
  lineCount: number;
  truncated: boolean; // cut by maxGlyphs
}

export function createLayoutMetrics(): LayoutMetrics {
  return {
    glyphCount: 0,
    widthEm: 0,
    heightEm: 0,
    lineCount: 0,
    truncated: false,
  };
}

const NEWLINE = 10;
const CARRIAGE_RETURN = 13;
const TAB = 9;
const SPACE = 32;

function isHighSurrogate(c: number): boolean {
  return c >= 0xd800 && c <= 0xdbff;
}
function isLowSurrogate(c: number): boolean {
  return c >= 0xdc00 && c <= 0xdfff;
}

interface ResolvedGlyph {
  gi: number; // record index, 0 = fallback
  next: number; // next utf-16 offset
  skip: boolean; // emits nothing
}

// utf-16 code units -> glyph record
function resolveGlyph(
  font: FontData,
  text: string,
  i: number,
  end: number
): ResolvedGlyph {
  const c = text.charCodeAt(i);
  if (
    isHighSurrogate(c) &&
    i + 1 < end &&
    isLowSurrogate(text.charCodeAt(i + 1))
  ) {
    return { gi: 0, next: i + 2, skip: false };
  }
  if (c < SPACE) {
    if (c !== TAB) return { gi: 0, next: i + 1, skip: true };
    return { gi: font.glyphIndexByCode[SPACE], next: i + 1, skip: false };
  }
  return { gi: font.glyphIndexByCode[c], next: i + 1, skip: false };
}

function measureLine(
  font: FontData,
  text: string,
  start: number,
  end: number
): number {
  const { glyphs } = font;
  let width = 0;
  for (let i = start; i < end; ) {
    const r = resolveGlyph(font, text, i, end);
    i = r.next;
    if (r.skip) continue;
    width += glyphs[r.gi * GLYPH_STRIDE + G_ADVANCE];
  }
  return width;
}

function hasQuad(glyphs: Float32Array, base: number): boolean {
  return (
    glyphs[base + G_PLANE_RIGHT] > glyphs[base + G_PLANE_LEFT] &&
    glyphs[base + G_PLANE_TOP] > glyphs[base + G_PLANE_BOTTOM]
  );
}

function alignFactorX(a: AlignX): number {
  return a === 'center' ? 0.5 : a === 'right' ? 1 : 0;
}

// spaces/controls emit none
export function countRenderableGlyphs(font: FontData, text: string): number {
  const { glyphs } = font;
  let count = 0;
  const len = text.length;
  for (let i = 0; i < len; ) {
    const r = resolveGlyph(font, text, i, len);
    i = r.next;
    if (r.skip) continue;
    if (hasQuad(glyphs, r.gi * GLYPH_STRIDE)) count++;
  }
  return count;
}

// baseline: first baseline on anchor
export function blockTopEm(
  font: FontData,
  lineCount: number,
  alignY: AlignY
): number {
  const height = lineCount * font.lineHeight;
  switch (alignY) {
    case 'top':
      return 0;
    case 'middle':
      return -height * 0.5;
    case 'bottom':
      return -height;
    case 'baseline':
    default:
      return -baselineInLineEm(font);
  }
}

// half-leading + ascender
export function baselineInLineEm(font: FontData): number {
  const leading = (font.lineHeight - (font.ascender - font.descender)) * 0.5;
  return leading + font.ascender;
}

// out: [ox,oy,w,h,u0,v0,u1,v1] per glyph, top-left, em, y-down; allocation-free.
export function layoutText(
  font: FontData,
  text: string,
  alignX: AlignX,
  alignY: AlignY,
  out: Float32Array,
  outOffset: number,
  outStride: number,
  maxGlyphs: number,
  metrics: LayoutMetrics
): number {
  const { glyphs, lineHeight } = font;
  const factorX = alignFactorX(alignX);
  const textLen = text.length;

  // pass 1: count + widest
  let lineCount = 0;
  let maxWidth = 0;
  for (let start = 0; ; ) {
    const nl = text.indexOf('\n', start);
    const end = nl < 0 ? textLen : nl;
    const w = measureLine(font, text, start, end);
    if (w > maxWidth) maxWidth = w;
    lineCount++;
    if (nl < 0) break;
    start = nl + 1;
  }

  const topEm = blockTopEm(font, lineCount, alignY);
  const firstBaseline = topEm + baselineInLineEm(font);
  const heightEm = lineCount * lineHeight;

  // pass 2: emit
  let written = 0;
  let truncated = false;
  let lineIndex = 0;
  for (let start = 0; ; lineIndex++) {
    const nl = text.indexOf('\n', start);
    const end = nl < 0 ? textLen : nl;

    const lineWidth = factorX === 0 ? 0 : measureLine(font, text, start, end);
    let pen = -lineWidth * factorX;
    const baselineY = firstBaseline + lineIndex * lineHeight;

    for (let i = start; i < end; ) {
      const r = resolveGlyph(font, text, i, end);
      i = r.next;
      if (r.skip) continue;
      const gi = r.gi;
      const g = gi * GLYPH_STRIDE;
      if (hasQuad(glyphs, g)) {
        if (written >= maxGlyphs) {
          truncated = true;
        } else {
          const left = glyphs[g + G_PLANE_LEFT];
          const right = glyphs[g + G_PLANE_RIGHT];
          const top = glyphs[g + G_PLANE_TOP];
          const bottom = glyphs[g + G_PLANE_BOTTOM];
          const o = outOffset + written * outStride;
          out[o] = pen + left;
          out[o + 1] = baselineY - top;
          out[o + 2] = right - left;
          out[o + 3] = top - bottom;
          out[o + 4] = glyphs[g + G_U0];
          out[o + 5] = glyphs[g + G_V0];
          out[o + 6] = glyphs[g + G_U1];
          out[o + 7] = glyphs[g + G_V1];
          written++;
        }
      }
      pen += glyphs[g + G_ADVANCE];
    }

    if (nl < 0) break;
    start = nl + 1;
  }

  metrics.glyphCount = written;
  metrics.widthEm = maxWidth;
  metrics.heightEm = heightEm;
  metrics.lineCount = lineCount;
  metrics.truncated = truncated;
  return written;
}

export function fillInstanceConstants(
  out: Float32Array,
  firstGlyph: number,
  count: number,
  anchorX: number,
  anchorY: number,
  r: number,
  g: number,
  b: number,
  a: number,
  rotation: number,
  flags: number
): void {
  let o = firstGlyph * FLOATS_PER_GLYPH;
  for (let i = 0; i < count; i++, o += FLOATS_PER_GLYPH) {
    out[o + I_ANCHOR] = anchorX;
    out[o + I_ANCHOR + 1] = anchorY;
    out[o + I_COLOR] = r;
    out[o + I_COLOR + 1] = g;
    out[o + I_COLOR + 2] = b;
    out[o + I_COLOR + 3] = a;
    out[o + I_ROT_FLAGS] = rotation;
    out[o + I_ROT_FLAGS + 1] = flags;
  }
}

export function translateGlyphs(
  out: Float32Array,
  firstGlyph: number,
  count: number,
  dx: number,
  dy: number
): void {
  let o = firstGlyph * FLOATS_PER_GLYPH + I_OFFSET;
  for (let i = 0; i < count; i++, o += FLOATS_PER_GLYPH) {
    out[o] += dx;
    out[o + 1] += dy;
  }
}
