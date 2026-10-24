/**
 * MSDF label system. Static labels are retained and re-uploaded only when they
 * change; stream labels are rewritten on every `beginStream`..`endStream` pass.
 * Camera changes only touch uniforms.
 */
import {
  Buffer,
  BufferUsage,
  Geometry,
  Mesh,
  Rectangle,
  Shader,
  type Texture,
} from 'pixi.js';
import type { CameraUniforms } from '../primitives/CameraUniforms';
import type { ViewportUniforms } from '../primitives/ViewportUniforms';
import {
  createLabelProgram,
  createLabelShader,
  LabelSharedUniforms,
} from './labelShader';
import { parseMsdfAtlas, type MsdfAtlasData, type MsdfFont } from './msdfAtlas';
import {
  BYTES_PER_GLYPH,
  channelOfFlags,
  clampChannel,
  countRenderableGlyphs,
  createLayoutMetrics,
  fillInstanceConstants,
  FLOATS_PER_GLYPH,
  I_OFFSET,
  layoutText,
  MAX_LABEL_CHANNELS,
  packLabelFlags,
  translateGlyphs,
  type AlignX,
  type AlignY,
} from './textLayout';

export type LabelId = string;
export type { AlignX, AlignY };

export interface LabelOptions {
  /** Optional caller-provided id (e.g. node id); auto-generated when omitted. */
  id?: string;
  text: string;
  anchor: { x: number; y: number }; //world space
  color?: [number, number, number, number]; //float 0..1
  rotation?: number; // radians, clockwise
  channel?: number; // channel 0..31 (default 0). used for font size override
  alignX?: AlignX;
  alignY?: AlignY;
  offsetEm?: { x: number; y: number };
  visible?: boolean;
}

export interface LabelSystemOptions {
  maxStaticGlyphs?: number; // default 65536
  maxStreamGlyphs?: number; // default 65536
  fallback?: 'box' | 'space'; // fallback glyph for unmapped characters
  fontSizePx?: number; // initial font size of channel 0, default 12
  defaultColor?: [number, number, number, number]; // default color used if not specified in LabelOptions
}

interface StaticRecord {
  id: LabelId;
  text: string;
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  a: number;
  rotation: number;
  /** Size channel (`packLabelFlags`). */
  flags: number;
  alignX: AlignX;
  alignY: AlignY;
  ox: number;
  oy: number;
  visible: boolean;
  /** Laid-out glyph instances (FLOATS_PER_GLYPH each); may be larger than `glyphCount`. */
  data: Float32Array;
  glyphCount: number;
}

export const DEFAULT_LABEL_FONT_SIZE_PX = 12;

const EMPTY_GLYPHS = new Float32Array(0);

function createInstanceGeometry(instanceBuffer: Buffer): Geometry {
  const cornerBuffer = new Buffer({
    data: new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]),
    usage: BufferUsage.VERTEX | BufferUsage.COPY_DST,
    label: 'label-corners',
  });
  const stride = BYTES_PER_GLYPH;
  const geometry = new Geometry();
  geometry.addAttribute('aCorner', {
    buffer: cornerBuffer,
    format: 'float32x2',
    stride: 8,
    offset: 0,
  });
  const instanced = (
    offsetFloats: number,
    format: 'float32x2' | 'float32x4'
  ) => ({
    buffer: instanceBuffer,
    format,
    stride,
    offset: offsetFloats * 4,
    instance: true,
  });
  geometry.addAttribute('aAnchor', instanced(0, 'float32x2'));
  geometry.addAttribute('aOffset', instanced(2, 'float32x2'));
  geometry.addAttribute('aSize', instanced(4, 'float32x2'));
  geometry.addAttribute('aUvBounds', instanced(6, 'float32x4'));
  geometry.addAttribute('aColor', instanced(10, 'float32x4'));
  geometry.addAttribute('aRotationAndFlags', instanced(14, 'float32x2'));
  geometry.addIndex(new Uint16Array([0, 1, 2, 1, 3, 2]));
  geometry.instanceCount = 0;
  return geometry;
}

function createLabelMesh(
  geometry: Geometry,
  shader: Shader
): Mesh<Geometry, Shader> {
  const mesh = new Mesh<Geometry, Shader>({ geometry, shader });
  mesh.state.blendMode = 'normal-npm';
  mesh.state.depthTest = false;
  mesh.state.culling = false;
  mesh.eventMode = 'none';
  mesh.boundsArea = new Rectangle(-1e7, -1e7, 2e7, 2e7); //prevent pixi from culling the mesh
  return mesh;
}

export class LabelSystem {
  readonly staticMesh: Mesh<Geometry, Shader>;
  readonly streamMesh: Mesh<Geometry, Shader>;

  private readonly font: MsdfFont;
  private readonly shared: LabelSharedUniforms;
  private readonly maxStaticGlyphs: number;
  private readonly maxStreamGlyphs: number;
  private readonly defaultColor: [number, number, number, number];

  // Camera
  private fontSizePx: number;
  /** Per-channel px override; 0 = inherit channel 0. */
  private readonly channelOverride = new Float32Array(MAX_LABEL_CHANNELS);
  private readonly channelVisible = new Uint8Array(MAX_LABEL_CHANNELS).fill(1); // 1 = visible

  // Static layer
  private readonly records = new Map<LabelId, StaticRecord>();
  /** Retained glyphs in label insertion order; fixed size, allocated up-front. */
  private readonly staticStaging: Float32Array;
  private readonly staticBuffer: Buffer;
  private readonly staticGeometry: Geometry;
  private staticDirty = true;
  private nextId = 1;

  // Stream layer
  private readonly streamData: Float32Array;
  private readonly streamBuffer: Buffer;
  private readonly streamGeometry: Geometry;
  private streamGlyphs = 0;
  private streamDirty = true;
  private streamOverflowWarned = false;
  private staticOverflowWarned = false;

  private readonly metrics = createLayoutMetrics();
  private disposed = false;

  constructor(
    atlasData: MsdfAtlasData,
    atlasTexture: Texture,
    cameraUniforms: CameraUniforms,
    viewportUniforms: ViewportUniforms,
    options: LabelSystemOptions = {}
  ) {
    this.font = parseMsdfAtlas(atlasData, { fallback: options.fallback });
    this.maxStaticGlyphs = Math.max(1, options.maxStaticGlyphs ?? 65536);
    this.maxStreamGlyphs = Math.max(1, options.maxStreamGlyphs ?? 65536);
    this.defaultColor = options.defaultColor ?? [1, 1, 1, 1];
    this.fontSizePx = options.fontSizePx ?? DEFAULT_LABEL_FONT_SIZE_PX;

    // Atlas must be sampled bilinearly, without mipmaps.
    const source = atlasTexture.source;
    source.autoGenerateMipmaps = false;
    source.scaleMode = 'linear';
    source.style.addressMode = 'clamp-to-edge';

    this.shared = new LabelSharedUniforms(this.font, this.fontSizePx);
    const program = createLabelProgram();

    this.staticStaging = new Float32Array(
      this.maxStaticGlyphs * FLOATS_PER_GLYPH
    );
    this.staticBuffer = new Buffer({
      data: this.staticStaging,
      usage: BufferUsage.VERTEX | BufferUsage.COPY_DST,
      label: 'label-static-instances',
    });
    this.staticGeometry = createInstanceGeometry(this.staticBuffer);
    this.staticMesh = createLabelMesh(
      this.staticGeometry,
      createLabelShader(
        program,
        atlasTexture,
        this.shared,
        cameraUniforms,
        viewportUniforms
      )
    );
    this.staticMesh.label = 'labels-static';

    this.streamData = new Float32Array(this.maxStreamGlyphs * FLOATS_PER_GLYPH);
    this.streamBuffer = new Buffer({
      data: this.streamData,
      usage: BufferUsage.VERTEX | BufferUsage.COPY_DST,
      label: 'label-stream-instances',
    });
    this.streamGeometry = createInstanceGeometry(this.streamBuffer);
    this.streamMesh = createLabelMesh(
      this.streamGeometry,
      createLabelShader(
        program,
        atlasTexture,
        this.shared,
        cameraUniforms,
        viewportUniforms
      )
    );
    this.streamMesh.label = 'labels-stream';
  }

  /**
   * Default size in CSS px (does not scale with zoom). Also affects every
   * channel without its own override.
   */
  setFontSizePx(px: number): void {
    if (!(px > 0) || px === this.fontSizePx) return;
    this.fontSizePx = px;
    this.resolveChannelSizes();
  }

  /**
   * Size for one channel (0..31), CSS px. Only writes one uniform array; no
   * label data is re-laid out. `null` follows channel 0 again.
   */
  setChannelFontSizePx(channel: number, px: number | null): void {
    const ch = clampChannel(channel);
    if (ch === 0) {
      if (px !== null) this.setFontSizePx(px);
      return;
    }
    if (px !== null && !(px > 0)) return;
    const value = px === null ? 0 : px;
    if (this.channelOverride[ch] === value) return;
    this.channelOverride[ch] = value;
    this.resolveChannelSizes();
  }

  private resolveChannelSizes(): void {
    const sizes = this.shared.channelFontSizes;
    sizes[0] = this.fontSizePx;
    for (let i = 1; i < MAX_LABEL_CHANNELS; i++) {
      sizes[i] =
        this.channelOverride[i] > 0 ? this.channelOverride[i] : this.fontSizePx;
    }
  }

  setChannelVisible(channel: number, visible: boolean): void {
    // static: immediate, stream: next pass
    const ch = clampChannel(channel);
    const value = visible ? 1 : 0;
    if (this.channelVisible[ch] === value) return;
    this.channelVisible[ch] = value;
    this.staticDirty = true;
  }

  isChannelVisible(channel: number): boolean {
    return this.channelVisible[clampChannel(channel)] === 1;
  }

  addStatic(options: LabelOptions): LabelId {
    const id = options.id ?? `label-${this.nextId++}`;
    const existing = this.records.get(id);
    if (existing) {
      this.updateStatic(id, options);
      return id;
    }
    const color = options.color ?? this.defaultColor;
    const rec: StaticRecord = {
      id,
      text: options.text,
      x: options.anchor.x,
      y: options.anchor.y,
      r: color[0],
      g: color[1],
      b: color[2],
      a: color[3],
      rotation: options.rotation ?? 0,
      flags: packLabelFlags(options.channel ?? 0),
      alignX: options.alignX ?? 'left',
      alignY: options.alignY ?? 'baseline',
      ox: options.offsetEm?.x ?? 0,
      oy: options.offsetEm?.y ?? 0,
      visible: options.visible ?? true,
      data: EMPTY_GLYPHS,
      glyphCount: 0,
    };
    this.records.set(rec.id, rec);
    this.writeStatic(rec);
    return rec.id;
  }

  updateStatic(id: LabelId, patch: Partial<Omit<LabelOptions, 'id'>>): void {
    const rec = this.records.get(id);
    if (!rec) return;
    if (patch.text !== undefined) rec.text = patch.text;
    if (patch.anchor !== undefined) {
      rec.x = patch.anchor.x;
      rec.y = patch.anchor.y;
    }
    if (patch.color !== undefined) {
      rec.r = patch.color[0];
      rec.g = patch.color[1];
      rec.b = patch.color[2];
      rec.a = patch.color[3];
    }
    if (patch.rotation !== undefined) rec.rotation = patch.rotation;
    if (patch.channel !== undefined) {
      rec.flags = packLabelFlags(patch.channel);
    }
    if (patch.alignX !== undefined) rec.alignX = patch.alignX;
    if (patch.alignY !== undefined) rec.alignY = patch.alignY;
    if (patch.offsetEm !== undefined) {
      rec.ox = patch.offsetEm.x;
      rec.oy = patch.offsetEm.y;
    }
    if (patch.visible !== undefined) rec.visible = patch.visible;
    this.writeStatic(rec);
  }

  removeStatic(id: LabelId): void {
    if (!this.records.delete(id)) return;
    this.staticDirty = true;
  }

  private writeStatic(rec: StaticRecord): void {
    const needed = countRenderableGlyphs(this.font, rec.text);
    if (needed * FLOATS_PER_GLYPH > rec.data.length) {
      rec.data = new Float32Array(needed * FLOATS_PER_GLYPH);
    }

    if (needed > 0) {
      const n = layoutText(
        this.font,
        rec.text,
        rec.alignX,
        rec.alignY,
        rec.data,
        I_OFFSET,
        FLOATS_PER_GLYPH,
        rec.data.length / FLOATS_PER_GLYPH,
        this.metrics
      );
      fillInstanceConstants(
        rec.data,
        0,
        n,
        rec.x,
        rec.y,
        rec.r,
        rec.g,
        rec.b,
        rec.a,
        rec.rotation,
        rec.flags
      );
      if (rec.ox !== 0 || rec.oy !== 0) {
        translateGlyphs(rec.data, 0, n, rec.ox, rec.oy);
      }
      rec.glyphCount = n;
    } else {
      rec.glyphCount = 0;
    }

    this.staticDirty = true;
  }

  beginStream(): void {
    this.streamGlyphs = 0;
  }

  pushStream(options: LabelOptions): void {
    if (options.visible === false) return;
    if (this.channelVisible[clampChannel(options.channel ?? 0)] === 0) return;
    const first = this.streamGlyphs;
    const remaining = this.maxStreamGlyphs - first;
    if (remaining <= 0) {
      this.warnStreamOverflow();
      return;
    }
    const n = layoutText(
      this.font,
      options.text,
      options.alignX ?? 'left',
      options.alignY ?? 'baseline',
      this.streamData,
      first * FLOATS_PER_GLYPH + I_OFFSET,
      FLOATS_PER_GLYPH,
      remaining,
      this.metrics
    );
    if (this.metrics.truncated) {
      this.warnStreamOverflow(); // drop the whole label, keep the cursor
      return;
    }
    if (n === 0) return;
    const c = options.color ?? this.defaultColor;
    fillInstanceConstants(
      this.streamData,
      first,
      n,
      options.anchor.x,
      options.anchor.y,
      c[0],
      c[1],
      c[2],
      c[3],
      options.rotation ?? 0,
      packLabelFlags(options.channel ?? 0)
    );
    const off = options.offsetEm;
    if (off !== undefined)
      translateGlyphs(this.streamData, first, n, off.x, off.y);
    this.streamGlyphs = first + n;
  }

  endStream(): void {
    this.streamDirty = true;
  }

  private warnStaticOverflow(): void {
    if (this.staticOverflowWarned) return;
    this.staticOverflowWarned = true;
    console.warn(
      `LabelSystem: total static glyph capacity (${this.maxStaticGlyphs}) exceeded; extra labels dropped.`
    );
  }

  private warnStreamOverflow(): void {
    if (this.streamOverflowWarned) return;
    this.streamOverflowWarned = true;
    console.warn(
      `LabelSystem: stream glyph capacity (${this.maxStreamGlyphs}) exceeded; extra labels dropped.`
    );
  }

  /**
   * Upload changed layers. Called once per frame before the renderer draws;
   * Pixi's traversal draws the meshes.
   */
  prepareRender(): void {
    if (this.disposed) return;

    if (this.staticDirty) {
      this.rebuildStatic();
      this.staticDirty = false;
    }

    if (this.streamDirty) {
      if (this.streamGlyphs > 0) {
        this.streamBuffer.update(this.streamGlyphs * BYTES_PER_GLYPH);
        this.streamGeometry.instanceCount = this.streamGlyphs;
      } else if (this.streamGeometry.instanceCount !== 0) {
        this.streamGeometry.instanceCount = 0;
      }
      this.streamDirty = false;
    }
  }

  private rebuildStatic(): void {
    const dst = this.staticStaging;
    let w = 0;
    for (const rec of this.records.values()) {
      if (!rec.visible || rec.glyphCount === 0) continue;
      if (this.channelVisible[channelOfFlags(rec.flags)] === 0) continue;
      const len = rec.glyphCount * FLOATS_PER_GLYPH;
      if (w + len > dst.length) {
        this.warnStaticOverflow();
        continue;
      }
      dst.set(rec.data.subarray(0, len), w);
      w += len;
    }
    const glyphs = w / FLOATS_PER_GLYPH;
    if (glyphs > 0) {
      this.staticBuffer.update(glyphs * BYTES_PER_GLYPH);
      this.staticGeometry.instanceCount = glyphs;
    } else if (this.staticGeometry.instanceCount !== 0) {
      this.staticGeometry.instanceCount = 0;
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.staticMesh.removeFromParent();
    this.streamMesh.removeFromParent();
    this.staticMesh.destroy();
    this.streamMesh.destroy();
    this.staticGeometry.destroy(true);
    this.streamGeometry.destroy(true);
    this.records.clear();
  }
}
