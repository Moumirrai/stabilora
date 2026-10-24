import {
  Model,
  ModelRepository,
  Solver,
  type TransactionChanges,
} from '@stabilora/arcora';
import { SpatialIndex } from '../spatial/SpatialIndex';
import { hitTestPrecise, type HitResult } from '../spatial/hitTest';
import { NodeMesh } from '../viewport/rendering/primitives/NodeMesh';
import { InstancedBeamLineGroup } from '../viewport/rendering/primitives/InstancedBeamLineGroup';
import { SupportMesh } from '../viewport/rendering/primitives/SupportMesh';
import type { ViewportEngine } from '../viewport/ViewportEngine';
import {
  LabelLayer,
  type LabelLayerOptions,
} from '../viewport/rendering/labels/LabelLayer';
import { NodeLabels } from './NodeLabels';
import { SelectionController } from './SelectionController';
import { collectSupportInstances } from './supports/collectSupports';

export interface SceneOptions {
  labels?: LabelLayerOptions;
}

export class Scene {
  readonly model: Model;
  readonly solver: Solver;
  readonly repository: ModelRepository;
  readonly spatialIndex: SpatialIndex;

  readonly nodeMesh: NodeMesh;
  readonly beamGroup: InstancedBeamLineGroup;
  private readonly supportMesh: SupportMesh;
  readonly selection = new SelectionController();

  readonly labels: LabelLayer;
  readonly nodeLabels: NodeLabels;

  private viewport: ViewportEngine;
  private unsubOnChange: () => void;

  // font load is cached; scene owns its label batch like the batches below
  static async create(
    viewport: ViewportEngine,
    options: SceneOptions = {}
  ): Promise<Scene> {
    const labels = await LabelLayer.create(viewport, options.labels);
    return new Scene(viewport, labels);
  }

  private constructor(viewport: ViewportEngine, labels: LabelLayer) {
    this.viewport = viewport;
    this.labels = labels;
    this.model = new Model();
    this.solver = new Solver(this.model);
    this.repository = new ModelRepository(this.model);
    this.spatialIndex = new SpatialIndex();

    this.nodeMesh = new NodeMesh(viewport.viewportUniforms);
    this.beamGroup = new InstancedBeamLineGroup(
      viewport.camera.cameraUniforms,
      {
        thickness: 3.0,
        dashLength: 8.0,
        gapLength: 8.0,
        offset: 6.0,
      }
    );
    this.supportMesh = new SupportMesh(viewport.camera.cameraUniforms);

    viewport.worldContainer.addChild(this.beamGroup);
    viewport.worldContainer.addChild(this.supportMesh);
    viewport.worldContainer.addChild(this.nodeMesh);

    this.nodeLabels = new NodeLabels(this.model, this.labels);
    this.unsubOnChange = this.repository.onChange(
      (changes: TransactionChanges) => {
        this.spatialIndex.sync(changes, this.model);
        this.nodeLabels.sync(changes);
      }
    );
    this.nodeLabels.syncAll();
  }

  renderSync(): void {
    this.renderSceneGeometry();
    this.renderSupports();
    this.viewport.requestRender();
  }

  // Supports are not selection-aware. If that changes, this path must rebuild them.
  renderSelection(): void {
    this.renderSceneGeometry();
    this.viewport.requestRender();
  }

  private renderSceneGeometry(): void {
    const model = this.model;

    this.nodeMesh.update([...model.nodes.values()], (id) =>
      this.selection.getState(id)
    );

    const elemArr = [...model.elements.values()];
    this.beamGroup.prepare(elemArr.length);
    let i = 0;
    for (const element of elemArr) {
      const nodeA = model.nodes.get(element.nodeIDs[0]);
      const nodeB = model.nodes.get(element.nodeIDs[1]);
      if (!nodeA || !nodeB) continue;
      this.beamGroup.setBeam(
        i,
        nodeA.pos.x,
        nodeA.pos.z,
        nodeB.pos.x,
        nodeB.pos.z
      );
      this.beamGroup.setBeamState(i, this.selection.getState(element.id));
      i++;
    }

    this.beamGroup.submit(i);
  }

  private renderSupports(): void {
    this.supportMesh.update(collectSupportInstances(this.model));
  }

  setSupportSize(size: number): void {
    this.supportMesh.setSize(size);
    this.viewport.requestRender();
  }

  /** Set the font size for a label channel (default 0). */
  setLabelSize(px: number, channel = 0): void {
    this.labels.setChannelFontSizePx(channel, px);
  }

  setChannelVisible(channel: number, visible: boolean): void {
    this.labels.setChannelVisible(channel, visible);
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
    tolerance: number
  ): HitResult | undefined {
    const candidates = this.spatialIndex.searchNearest(
      worldX,
      worldZ,
      tolerance
    );
    return hitTestPrecise(
      this.model,
      candidates,
      { x: worldX, z: worldZ },
      tolerance
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
    this.nodeLabels.dispose();
    this.labels.dispose();
    this.nodeMesh.destroy();
    this.beamGroup.destroy();
    this.supportMesh.destroy();
  }
}
