import { Mesh, Geometry, Shader, GlProgram, UniformGroup } from 'pixi.js';
import nodeVertexShader from './shaders/node.vert.glsl?raw';
import nodeFragmentShader from './shaders/node.frag.glsl?raw';
import type { ViewportUniforms } from './ViewportUniforms';

export class NodeMesh extends Mesh<Geometry, Shader> {
  private positionData: Float32Array;
  private stateData: Float32Array;
  private nodeUniforms: UniformGroup;

  constructor(viewportUniforms: ViewportUniforms) {
    const positionData = new Float32Array(0);
    const stateData = new Float32Array(0);

    const geometry = new Geometry();
    geometry.addAttribute('aPosition', { buffer: positionData, size: 2 });
    geometry.addAttribute('aState', { buffer: stateData, size: 1 });
    geometry.topology = 'point-list';

    const nodeUniforms = new UniformGroup({
      uPointSize: { value: 20.0, type: 'f32' },
      uNodeColor: { value: [1.0, 1.0, 1.0], type: 'vec3<f32>' },
      uSelectColor: { value: [1.0, 0.8, 0.0], type: 'vec3<f32>' },
      uGhostAlpha: { value: 0.35, type: 'f32' },
    });

    const glProgram = GlProgram.from({
      vertex: nodeVertexShader,
      fragment: nodeFragmentShader,
    });

    const shader = new Shader({
      glProgram,
      resources: { nodeUniforms, viewportUniforms },
    });

    super({ geometry: geometry as any, shader: shader as any });

    this.positionData = positionData;
    this.stateData = stateData;
    this.nodeUniforms = nodeUniforms;
    this.label = 'NodeMesh';
  }

  update(
    nodes: Array<{ id: string; pos: { x: number; z: number } }>,
    getState: (id: string) => number
  ): void {
    const count = nodes.length;
    if (count === 0) {
      this.visible = false;
      return;
    }

    this.prepareBuffers(count);

    for (let i = 0; i < count; i++) {
      const node = nodes[i];
      this.positionData[i * 2] = node.pos.x;
      this.positionData[i * 2 + 1] = node.pos.z;
      this.stateData[i] = getState(node.id);
    }

    this.geometry.getBuffer('aPosition').update();
    this.geometry.getBuffer('aState').update();
    this.visible = true;
  }

  setNodeColor(color: [number, number, number]): void {
    this.nodeUniforms.uniforms.uNodeColor = color;
  }

  setSelectColor(color: [number, number, number]): void {
    this.nodeUniforms.uniforms.uSelectColor = color;
  }

  setPointSize(size: number): void {
    this.nodeUniforms.uniforms.uPointSize = size;
  }

  private prepareBuffers(count: number): void {
    const posNeeded = count * 2;
    if (this.positionData.length !== posNeeded) {
      this.positionData = new Float32Array(posNeeded);
      this.stateData = new Float32Array(count);
      this.geometry.getBuffer('aPosition').data = this.positionData;
      this.geometry.getBuffer('aState').data = this.stateData;
    }
  }

  protected _calculateBounds() {
    this.bounds.addFrame(-1e6, -1e6, 1e6, 1e6);
  }
}
