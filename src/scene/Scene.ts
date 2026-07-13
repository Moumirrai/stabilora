import {
  Model,
  ModelRepository,
  type TransactionChanges,
} from '@stabilora/arcora';
import { SpatialIndex } from '../spatial/SpatialIndex';
import { hitTestPrecise, type HitResult } from '../spatial/hitTest';
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
    this.beamGroup = new InstancedBeamLineGroup(
      viewport.camera.cameraUniforms,
      {
        thickness: 3.0,
        dashLength: 8.0,
        gapLength: 8.0,
        offset: 6.0,
      }
    );

    viewport.worldContainer.addChild(this.nodeMesh);
    viewport.worldContainer.addChild(this.beamGroup);

    this.unsubOnChange = this.repository.onChange(
      (changes: TransactionChanges) => {
        this.spatialIndex.sync(changes, this.model);
      }
    );
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
      this.beamGroup.setBeam(
        i,
        nodeA.pos.x,
        nodeA.pos.z,
        nodeB.pos.x,
        nodeB.pos.z
      );
      i++;
    }

    this.beamGroup.submit(i);
    this.viewport.requestRender();
  }

  fitInView(instant?: boolean): void {
    const bbox = this.spatialIndex.boundingBox();
    if (
      !bbox ||
      !isFinite(bbox.maxX - bbox.minX) ||
      !isFinite(bbox.maxY - bbox.minY)
    ) {
      this.viewport.camera.zoomToRect(
        {
          minX: -4000,
          minY: -4000,
          maxX: 4000,
          maxY: 4000,
        },
        { instant }
      );
      return;
    }
    this.viewport.camera.zoomToRect(bbox, { marginPercent: 0.08, instant });
  }

  hitTest(
    worldX: number,
    worldZ: number,
    tolerance: number,
  ): HitResult | undefined {
    const candidates = this.spatialIndex.searchNearest(
      worldX,
      worldZ,
      tolerance,
    );
    return hitTestPrecise(
      this.model,
      candidates,
      { x: worldX, z: worldZ },
      tolerance,
    );
  }

  undo(): void {
    this.repository.undo();
    this.renderSync();
  }

  redo(): void {
    this.repository.redo();
    this.renderSync();
  }

  destroy(): void {
    this.unsubOnChange();
    this.nodeMesh.destroy();
    this.beamGroup.destroy();
  }
}
