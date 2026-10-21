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
import { GLYPH_DEFS } from '../glyphs/supportGlyphs';
import {
  DEFAULT_SUPPORT_COLOR,
  DEFAULT_SUPPORT_SIZE,
  DEFAULT_SUPPORT_STROKE,
} from './supportStyle';
import supportVertexShader from './shaders/support.vert.glsl?raw';
import supportFragmentShader from './shaders/support.frag.glsl?raw';

const FLOATS_PER_INSTANCE = 4; // x, z, angle, glyphIndex

const atlas = buildGlyphAtlas(GLYPH_DEFS); // static atlas of glyphs

export class SupportMesh extends Mesh<Geometry, Shader> {
  private instanceData: Float32Array;
  private supportUniforms: UniformGroup;

  constructor(cameraUniforms: CameraUniforms) {
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

    const supportUniforms = new UniformGroup({
      uSupportSize: { value: DEFAULT_SUPPORT_SIZE, type: 'f32' },
      uSupportStroke: { value: DEFAULT_SUPPORT_STROKE, type: 'f32' },
      uSupportColor: { value: [...DEFAULT_SUPPORT_COLOR], type: 'vec3<f32>' },
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
      vertex: supportVertexShader,
      fragment: supportFragmentShader,
    });
    const shader = new Shader({
      glProgram,
      resources: {
        cameraUniforms,
        supportUniforms,
        uGlyphAtlas: atlasSource,
      },
    });

    super({ geometry: geometry as any, shader: shader as any });

    this.instanceData = instanceData;
    this.supportUniforms = supportUniforms;
    this.label = 'SupportMesh';
  }

  // glyph unit length in screen pixels
  setSize(size: number): void {
    this.supportUniforms.uniforms.uSupportSize = size;
  }

  update(instances: readonly GlyphInstance[]): void {
    const count = instances.length;
    this.prepare(count);

    for (let i = 0; i < count; i++) {
      const { x, z, angle, glyph } = instances[i];
      const o = i * FLOATS_PER_INSTANCE;
      this.instanceData[o] = x;
      this.instanceData[o + 1] = z;
      this.instanceData[o + 2] = angle;
      this.instanceData[o + 3] = atlas.entries[glyph];
    }

    this.geometry.instanceCount = count;
    this.visible = count > 0;
    this.geometry.getBuffer('aInstance').update();
  }

  private prepare(count: number): void {
    if (this.instanceData.length >= count * FLOATS_PER_INSTANCE) return;
    this.instanceData = new Float32Array(count * FLOATS_PER_INSTANCE);
    this.geometry.getBuffer('aInstance').data = this.instanceData;
  }

  protected _calculateBounds() {
    this.bounds.addFrame(-1e6, -1e6, 1e6, 1e6);
  }
}
