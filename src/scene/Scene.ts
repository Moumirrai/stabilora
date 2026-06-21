import { Model, ModelRepository, type TransactionChanges } from '@stabilora/arcora';
import { SpatialIndex } from '../spatial/SpatialIndex';
import { NodeMesh } from '../viewport/rendering/NodeMesh';
import { InstancedBeamLineGroup } from '../viewport/rendering/primitives/InstancedBeamLineGroup';
import type { ViewportEngine } from '../viewport/ViewportEngine';

export class Scene {
  readonly model: Model;
  readonly repository: ModelRepository;
  readonly spatialIndex: SpatialIndex;

  readonly nodeMesh: NodeMesh;
  readonly beamGroup: InstancedBeamLineGroup;

  private viewport: ViewportEngine;
  private unsubOnChange: () => void;

  constructor(viewport: ViewportEngine) {
    this.viewport = viewport;
    this.model = new Model();
    this.repository = new ModelRepository(this.model);
    this.spatialIndex = new SpatialIndex();

    this.nodeMesh = new NodeMesh();
    this.beamGroup = new InstancedBeamLineGroup(viewport.camera.cameraUniforms, {
      thickness: 3.0,
      dashLength: 4.0,
      gapLength: 3.0,
      offset: 6.0,
    });

    viewport.worldContainer.addChild(this.nodeMesh);
    viewport.worldContainer.addChild(this.beamGroup);

    this.unsubOnChange = this.repository.onChange((changes: TransactionChanges) => {
      this.spatialIndex.sync(changes, this.model);
    });
  }

  renderSync(): void {
    this.nodeMesh.update(this.model);

    const count = this.model.elements.size;
    this.beamGroup.prepare(count);

    let i = 0;
    for (const element of this.model.elements.values()) {
      const nodeA = this.model.nodes.get(element.nodeIDs[0]);
      const nodeB = this.model.nodes.get(element.nodeIDs[1]);
      if (!nodeA || !nodeB) continue;
      this.beamGroup.setBeam(i, nodeA.pos.x, nodeA.pos.z, nodeB.pos.x, nodeB.pos.z);
      i++;
    }

    this.beamGroup.submit(i);
    this.viewport.requestRender();
  }

  destroy(): void {
    this.unsubOnChange();
    this.nodeMesh.destroy();
    this.beamGroup.destroy();
  }
}
