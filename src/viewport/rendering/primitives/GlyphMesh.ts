import {
  BufferImageSource,
  Geometry,
  GlProgram,
  Mesh,
  Shader,
  UniformGroup,
} from 'pixi.js';
import type { CameraUniforms } from './CameraUniforms';
import { buildGlyphAtlas } from '../glyphs/atlas';
import type { GlyphInstance } from '../glyphs/instance';
import type { Segment } from '../glyphs/path';
import glyphVertexShader from './shaders/glyph.vert.glsl?raw';
import glyphFragmentShader from './shaders/glyph.frag.glsl?raw';

const FLOATS_PER_INSTANCE = 4; // x, z, angle, glyphIndex

export interface GlyphMeshOptions<G extends string> {
  defs: Record<G, readonly Segment[]>;
  size: number;
  stroke: number;
  color: readonly [number, number, number];
  label?: string;
}

export class GlyphMesh<G extends string> extends Mesh<Geometry, Shader> {
  private instanceData: Float32Array;
  private glyphUniforms: UniformGroup;
  private readonly entries: Record<G, number>;

  constructor(cameraUniforms: CameraUniforms, options: GlyphMeshOptions<G>) {
    const instanceData = new Float32Array(0);

    const geometry = new Geometry();
    geometry.addAttribute('aExtrude', [-1, -1, -1, 1, 1, -1, 1, 1]);
    geometry.addIndex([0, 1, 2, 1, 3, 2]);
    geometry.addAttribute('aInstance', {
      buffer: instanceData,
      instance: true,
      size: FLOATS_PER_INSTANCE,
    });
    geometry.instanceCount = 0;

    const atlas = buildGlyphAtlas(options.defs);

    const glyphUniforms = new UniformGroup({
      uGlyphSize: { value: options.size, type: 'f32' },
      uGlyphStroke: { value: options.stroke, type: 'f32' },
      uGlyphColor: { value: [...options.color], type: 'vec3<f32>' },
    });

    // Float texels need nearest filtering; no premultiplied alpha on upload.
    const atlasSource = new BufferImageSource({
      resource: atlas.data,
      width: atlas.width,
      height: atlas.height,
      format: 'rgba32float',
      scaleMode: 'nearest',
      alphaMode: 'no-premultiply-alpha',
    });

    const glProgram = GlProgram.from({
      vertex: glyphVertexShader,
      fragment: glyphFragmentShader,
    });
    const shader = new Shader({
      glProgram,
      resources: {
        cameraUniforms,
        glyphUniforms,
        uGlyphAtlas: atlasSource,
      },
    });

    super({ geometry, shader });

    this.instanceData = instanceData;
    this.glyphUniforms = glyphUniforms;
    this.entries = atlas.entries;
    if (options.label !== undefined) this.label = options.label;
  }

  // glyph unit length in screen pixels
  setSize(size: number): void {
    this.glyphUniforms.uniforms.uGlyphSize = size;
  }

  update(instances: readonly GlyphInstance<G>[]): void {
    const count = instances.length;
    this.prepare(count);

    for (let i = 0; i < count; i++) {
      const { x, z, angle, glyph } = instances[i];
      const o = i * FLOATS_PER_INSTANCE;
      this.instanceData[o] = x;
      this.instanceData[o + 1] = z;
      this.instanceData[o + 2] = angle;
      this.instanceData[o + 3] = this.entries[glyph];
    }

    this.geometry.instanceCount = count;
    this.geometry.getBuffer('aInstance').update();
  }

  private prepare(count: number): void {
    const needed = count * FLOATS_PER_INSTANCE;
    if (this.instanceData.length === needed) return;
    if (this.instanceData.length > needed) {
      if (needed === 0 || this.instanceData.length <= Math.max(64, needed * 4))
        return;
    }
    this.instanceData = new Float32Array(needed);
    this.geometry.getBuffer('aInstance').data = this.instanceData;
  }

  protected _calculateBounds() {
    this.bounds.addFrame(-1e6, -1e6, 1e6, 1e6);
  }
}
