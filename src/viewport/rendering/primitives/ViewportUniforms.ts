import { UniformGroup } from 'pixi.js';

export class ViewportUniforms extends UniformGroup {
  constructor() {
    super({
      uStageSize: { value: [1, 1], type: 'vec2<f32>' },
    });
  }
}
