/**
 * PixiJS v8 GLSL program for MSDF labels.
 *
 * screenPx = world * uCameraScale + uCameraPosition. Offsets are y-down, NDC is
 * y-up (hence the sign flip). Output is premultiplied alpha (`normal-npm`).
 */
import { GlProgram, Shader, UniformGroup, type Texture } from 'pixi.js';
import type { CameraUniforms } from '../primitives/CameraUniforms';
import type { ViewportUniforms } from '../primitives/ViewportUniforms';
import type { MsdfFont } from './msdfAtlas';
import labelVertexShader from './shaders/label.vert.glsl?raw';
import labelFragmentShader from './shaders/label.frag.glsl?raw';
import { MAX_LABEL_CHANNELS } from './textLayout';

export const LABEL_VERTEX_SOURCE = labelVertexShader;

export const LABEL_FRAGMENT_SOURCE = labelFragmentShader;

export function createLabelProgram(): GlProgram {
  // Single source of truth for channel packing lives in textLayout.ts.
  const vertex = LABEL_VERTEX_SOURCE.replace(
    '#define MAX_LABEL_CHANNELS 32',
    `#define MAX_LABEL_CHANNELS ${MAX_LABEL_CHANNELS}`
  );
  return GlProgram.from({
    vertex,
    fragment: LABEL_FRAGMENT_SOURCE,
    name: 'stabilora-msdf-label',
  });
}

export class LabelSharedUniforms extends UniformGroup {
  /** Font size (px) per size channel; mutate in place, then request a render. */
  readonly channelFontSizes: Float32Array;

  constructor(
    font: Pick<MsdfFont, 'pxRange' | 'atlasFontSizePx'>,
    fontSizePx: number
  ) {
    const channelFontSizes = new Float32Array(MAX_LABEL_CHANNELS).fill(
      fontSizePx
    );
    super({
      uChannelFontSizePx: {
        value: channelFontSizes,
        type: 'f32',
        size: MAX_LABEL_CHANNELS,
      },
      uPxRange: { value: font.pxRange, type: 'f32' },
      uAtlasFontSizePx: { value: font.atlasFontSizePx, type: 'f32' },
    });
    this.channelFontSizes = channelFontSizes;
  }
}

/** Both meshes share the program; only their instance geometry differs. */
export function createLabelShader(
  program: GlProgram,
  atlasTexture: Texture,
  shared: LabelSharedUniforms,
  cameraUniforms: CameraUniforms,
  viewportUniforms: ViewportUniforms
): Shader {
  return new Shader({
    glProgram: program,
    resources: {
      labelShared: shared,
      cameraUniforms,
      viewportUniforms,
      uAtlas: atlasTexture.source,
      uAtlasSampler: atlasTexture.source.style,
    },
  });
}
