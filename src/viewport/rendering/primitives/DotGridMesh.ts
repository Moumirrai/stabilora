import { Mesh, Geometry, Shader, GlProgram, UniformGroup } from 'pixi.js';
import dotGridVertexShader from './shaders/dotGrid.vert.glsl?raw';
import dotGridFragmentShader from './shaders/dotGrid.frag.glsl?raw';
import type { CameraUniforms } from './CameraUniforms';
import type { CameraState } from '../../CameraController';
import type { ViewportUniforms } from './ViewportUniforms';

const dotGridUniforms = new UniformGroup({
  uStagePosition: { value: [0, 0], type: 'vec2<f32>' },
  uStageSize: { value: [1, 1], type: 'vec2<f32>' },
});

export class DotGridMesh extends Mesh<Geometry, Shader> {
  constructor(
    cameraUniforms: CameraUniforms,
    viewportUniforms: ViewportUniforms
  ) {
    const geometry = new Geometry();
    geometry.addAttribute('aPosition', [0, 0, 1, 0, 0, 1, 1, 1]);
    geometry.addIndex([0, 1, 2, 1, 3, 2]);

    const glProgram = GlProgram.from({
      vertex: dotGridVertexShader,
      fragment: dotGridFragmentShader,
    });

    const shader = new Shader({
      glProgram,
      resources: { cameraUniforms, viewportUniforms },
    });

    super({ geometry, shader });

    this.cullable = true;
  }

  public updateStage(
    cameraState: CameraState,
    stageSize: { x: number; y: number }
  ) {
    dotGridUniforms.uniforms.uStagePosition = [
      cameraState.position.x,
      cameraState.position.y,
    ];
    dotGridUniforms.uniforms.uStageSize = [stageSize.x, stageSize.y];
  }
}
