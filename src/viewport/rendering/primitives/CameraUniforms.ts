import { UniformGroup } from 'pixi.js';

export class CameraUniforms extends UniformGroup {
  constructor() {
    super({
      uCameraScale: { value: 1.0, type: 'f32' },
      uCameraPosition: { value: [0, 0], type: 'vec2<f32>' },
    });
  }
}
