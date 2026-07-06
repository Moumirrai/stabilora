import { Mesh, Geometry, Shader, GlProgram, UniformGroup } from 'pixi.js';
import type { CameraUniforms } from './CameraUniforms';
import { beamVertexShader } from './shaders/beam.vert';
import { beamFragmentShader } from './shaders/beam.frag';

export interface BeamStyle {
  thickness: number;
  dashLength: number;
  gapLength: number;
  offset: number;
}

export class InstancedBeamLineGroup extends Mesh<Geometry, Shader> {
  private startData: Float32Array;
  private endData: Float32Array;
  private beamUniforms: UniformGroup;

  constructor(cameraUniforms: CameraUniforms, style?: Partial<BeamStyle>) {
    const startData = new Float32Array(0);
    const endData = new Float32Array(0);

    const geometry = new Geometry();
    geometry.addAttribute('aExtrude', [-1, -1, -1, 1, 1, -1, 1, 1]);
    geometry.addIndex([0, 1, 2, 1, 3, 2]);
    geometry.addAttribute('aStart', {
      buffer: startData,
      instance: true,
      size: 2,
    });
    geometry.addAttribute('aEnd', { buffer: endData, instance: true, size: 2 });
    geometry.instanceCount = 0;

    const beamUniforms = new UniformGroup({
      uBeamThickness: { value: style?.thickness ?? 3.0, type: 'f32' },
      uBeamDashLength: { value: style?.dashLength ?? 8.0, type: 'f32' },
      uBeamGapLength: { value: style?.gapLength ?? 8.0, type: 'f32' },
      uBeamOffset: { value: style?.offset ?? 6.0, type: 'f32' },
    });

    const glProgram = GlProgram.from({
      vertex: beamVertexShader,
      fragment: beamFragmentShader,
    });

    const shader = new Shader({
      glProgram,
      resources: {
        cameraUniforms,
        beamUniforms,
      },
    });

    super({ geometry: geometry as any, shader: shader as any });

    this.startData = startData;
    this.endData = endData;
    this.beamUniforms = beamUniforms;
  }

  setStyle(style: BeamStyle): void {
    this.beamUniforms.uniforms.uBeamThickness = style.thickness;
    this.beamUniforms.uniforms.uBeamDashLength = style.dashLength;
    this.beamUniforms.uniforms.uBeamGapLength = style.gapLength;
    this.beamUniforms.uniforms.uBeamOffset = style.offset;
  }

  prepare(count: number): void {
    const needed = count * 2;
    if (this.startData.length >= needed) return;
    this.startData = new Float32Array(needed);
    this.endData = new Float32Array(needed);
    this.geometry.getBuffer('aStart').data = this.startData;
    this.geometry.getBuffer('aEnd').data = this.endData;
  }

  setBeam(index: number, sx: number, sy: number, ex: number, ey: number): void {
    this.startData[index * 2] = sx;
    this.startData[index * 2 + 1] = sy;
    this.endData[index * 2] = ex;
    this.endData[index * 2 + 1] = ey;
  }

  submit(count: number): void {
    this.geometry.instanceCount = count;
    this.geometry.getBuffer('aStart').update();
    this.geometry.getBuffer('aEnd').update();
  }

  protected _calculateBounds() {
    this.bounds.addFrame(-1e6, -1e6, 1e6, 1e6);
  }
}
