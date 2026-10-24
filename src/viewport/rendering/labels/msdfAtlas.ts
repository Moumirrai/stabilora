import {
  G_ADVANCE,
  G_PLANE_BOTTOM,
  G_PLANE_LEFT,
  G_PLANE_RIGHT,
  G_PLANE_TOP,
  G_U0,
  G_U1,
  G_V0,
  G_V1,
  GLYPH_STRIDE,
  type FontData,
} from './textLayout';

export type MsdfYOrigin = 'bottom' | 'top';

export interface MsdfBounds {
  left: number;
  bottom: number;
  right: number;
  top: number;
}

export interface MsdfGlyphJson {
  unicode?: number;
  index?: number;
  advance: number;
  planeBounds?: MsdfBounds;
  atlasBounds?: MsdfBounds;
}

export interface MsdfAtlasData {
  atlas: {
    type: string;
    distanceRange: number;
    distanceRangeMiddle?: number;
    size: number;
    width: number;
    height: number;
    yOrigin?: MsdfYOrigin;
  };
  metrics: {
    emSize?: number;
    lineHeight: number;
    ascender: number;
    descender: number;
    underlineY?: number;
    underlineThickness?: number;
  };
  glyphs: MsdfGlyphJson[];
  kerning?: unknown[];
}

export interface MsdfFont extends FontData {
  readonly pxRange: number;
  readonly atlasFontSizePx: number;
  readonly atlasWidth: number;
  readonly atlasHeight: number;
  readonly fallbackCodePoint: number;
}

export interface ParseMsdfOptions {
  fallback?: 'box' | 'space'; // default 'box'
}

export interface UvRect {
  u0: number;
  v0: number; // top edge
  u1: number;
  v1: number; // bottom edge
}

// bounds.top = top edge in both origins
export function atlasBoundsToUv(
  bounds: MsdfBounds,
  width: number,
  height: number,
  yOrigin: MsdfYOrigin
): UvRect {
  const u0 = bounds.left / width;
  const u1 = bounds.right / width;
  if (yOrigin === 'bottom') {
    return {
      u0,
      v0: 1 - bounds.top / height,
      u1,
      v1: 1 - bounds.bottom / height,
    };
  }
  return { u0, v0: bounds.top / height, u1, v1: bounds.bottom / height };
}

const BOX_FALLBACKS = [0x25a1, 0xfffd, 0x3f, 0x20];
const SPACE_FALLBACKS = [0x20];
const DEFAULT_FALLBACK_ADVANCE = 0.6;

export function parseMsdfAtlas(
  data: MsdfAtlasData,
  options: ParseMsdfOptions = {}
): MsdfFont {
  const { atlas, metrics } = data;
  if (!atlas || !metrics || !Array.isArray(data.glyphs)) {
    throw new Error('MSDF atlas JSON: missing atlas / metrics / glyphs');
  }
  if (atlas.type !== 'msdf' && atlas.type !== 'mtsdf') {
    throw new Error(
      `MSDF atlas JSON: unsupported atlas.type "${atlas.type}" (expected "msdf")`
    );
  }
  if (!(atlas.width > 0) || !(atlas.height > 0) || !(atlas.size > 0)) {
    throw new Error('MSDF atlas JSON: invalid atlas width/height/size');
  }
  const yOrigin: MsdfYOrigin = atlas.yOrigin === 'top' ? 'top' : 'bottom';
  const invEm = 1 / (metrics.emSize && metrics.emSize > 0 ? metrics.emSize : 1);

  const glyphIndexByCode = new Uint16Array(0x10000);
  const glyphs = new Float32Array((data.glyphs.length + 1) * GLYPH_STRIDE);
  let count = 0;

  for (const g of data.glyphs) {
    const code = g.unicode;
    if (code === undefined || code < 0 || code > 0xffff) continue;
    const idx = ++count;
    const o = idx * GLYPH_STRIDE;
    glyphs[o + G_ADVANCE] = g.advance * invEm;
    const pb = g.planeBounds;
    const ab = g.atlasBounds;
    if (pb && ab) {
      glyphs[o + G_PLANE_LEFT] = pb.left * invEm;
      glyphs[o + G_PLANE_RIGHT] = pb.right * invEm;
      glyphs[o + G_PLANE_TOP] = pb.top * invEm;
      glyphs[o + G_PLANE_BOTTOM] = pb.bottom * invEm;
      const uv = atlasBoundsToUv(ab, atlas.width, atlas.height, yOrigin);
      glyphs[o + G_U0] = uv.u0;
      glyphs[o + G_V0] = uv.v0;
      glyphs[o + G_U1] = uv.u1;
      glyphs[o + G_V1] = uv.v1;
    }
    glyphIndexByCode[code] = idx;
  }

  // index 0 = fallback for unmapped code units
  const candidates =
    options.fallback === 'space' ? SPACE_FALLBACKS : BOX_FALLBACKS;
  let fallbackCode = -1;
  for (const c of candidates) {
    if (glyphIndexByCode[c] !== 0) {
      fallbackCode = c;
      break;
    }
  }
  if (fallbackCode >= 0) {
    const src = glyphIndexByCode[fallbackCode] * GLYPH_STRIDE;
    for (let k = 0; k < GLYPH_STRIDE; k++) glyphs[k] = glyphs[src + k];
  } else {
    glyphs[G_ADVANCE] = DEFAULT_FALLBACK_ADVANCE; // invisible blank
  }

  return {
    lineHeight: metrics.lineHeight * invEm,
    ascender: metrics.ascender * invEm,
    descender: metrics.descender * invEm,
    glyphIndexByCode,
    glyphs,
    pxRange: atlas.distanceRange,
    atlasFontSizePx: atlas.size,
    atlasWidth: atlas.width,
    atlasHeight: atlas.height,
    fallbackCodePoint: fallbackCode,
  };
}

export const DEFAULT_MSDF_ATLAS_JSON_URL = `${
  import.meta.env.BASE_URL ?? '/'
}fonts/msdf/atlas.json`;

export async function loadMsdfAtlas(
  url: string = DEFAULT_MSDF_ATLAS_JSON_URL,
  fetchImpl: typeof fetch = fetch
): Promise<MsdfAtlasData> {
  const res = await fetchImpl(url);
  if (!res.ok) {
    throw new Error(
      `Failed to load MSDF atlas JSON "${url}": HTTP ${res.status}`
    );
  }
  return (await res.json()) as MsdfAtlasData;
}
