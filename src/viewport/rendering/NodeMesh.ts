import { Mesh, MeshGeometry } from 'pixi.js';
import type { Model } from '@stabilora/arcora';

export class NodeMesh extends Mesh<MeshGeometry> {
  constructor() {
    const geometry = new MeshGeometry({
      positions: new Float32Array(0),
      topology: 'point-list',
    });
    super({ geometry });
    this.label = 'NodeMesh';
  }

  update(model: Model): void {
    const geom = this.geometry as MeshGeometry;
    const count = model.nodes.size;
    if (count === 0) {
      geom.positions = new Float32Array(0);
      this.visible = false;
      return;
    }

    const positions = new Float32Array(count * 2);
    let i = 0;
    for (const node of model.nodes.values()) {
      positions[i * 2] = node.pos.x;
      positions[i * 2 + 1] = node.pos.z;
      i++;
    }

    geom.positions = positions;
    this.visible = true;
  }
}
