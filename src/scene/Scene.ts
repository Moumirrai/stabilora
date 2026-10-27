import {
  Model,
  ModelRepository,
  Solver,
  type SolveResult,
  type TransactionChanges,
} from '@stabilora/arcora';
import { SpatialIndex } from '../spatial/SpatialIndex';
import { hitTestPrecise, type HitResult } from '../spatial/hitTest';
import { NodeMesh } from '../viewport/rendering/primitives/NodeMesh';
import { InstancedBeamLineGroup } from '../viewport/rendering/primitives/InstancedBeamLineGroup';
import { SupportMesh } from '../viewport/rendering/primitives/SupportMesh';
import { ReactionMesh } from '../viewport/rendering/primitives/ReactionMesh';
import type { ViewportEngine } from '../viewport/ViewportEngine';
import {
  LabelLayer,
  type LabelLayerOptions,
} from '../viewport/rendering/labels/LabelLayer';
import { NodeLabels } from './NodeLabels';
import { REACTION_LABEL_CHANNEL, ReactionLabels } from './ReactionLabels';
import { SelectionController } from './SelectionController';
import { InteractionController } from './InteractionController';
import { ToolManager } from '../tools/ToolManager';
import { SelectMoveTool } from '../tools/SelectMoveTool';
import { HandTool } from '../tools/HandTool';
import { collectSupportInstances } from './supports/collectSupports';
import {
  collectReactionInstances,
  type ReactionDatum,
} from './supports/collectReactions';

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
  private readonly reactionMesh: ReactionMesh;
  readonly selection = new SelectionController();

  readonly labels: LabelLayer;
  readonly nodeLabels: NodeLabels;
  readonly reactionLabels: ReactionLabels;

  private reactionData: ReactionDatum[] = [];
  private reactionsVisible = true;

  readonly viewport: ViewportEngine;
  private unsubOnChange: () => void;
  private unsubSelection: () => void;
  readonly interaction: InteractionController;
  readonly tools: ToolManager;

  lastSolveMs = 0;
  private solveScheduled = false;
  private solveFrame = 0;

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
    this.reactionMesh = new ReactionMesh(viewport.camera.cameraUniforms);
    this.reactionMesh.visible = false;

    viewport.worldContainer.addChild(this.beamGroup);
    viewport.worldContainer.addChild(this.supportMesh);
    viewport.worldContainer.addChild(this.reactionMesh);
    viewport.worldContainer.addChild(this.nodeMesh);

    this.nodeLabels = new NodeLabels(this.model, this.labels);
    this.reactionLabels = new ReactionLabels(this.labels, viewport);
    this.unsubOnChange = this.repository.onChange(
      (changes: TransactionChanges) => {
        this.spatialIndex.sync(changes, this.model);
        this.nodeLabels.sync(changes);
        this.renderSync();
        // solve last so a solver failure can never block the visual update
        this.scheduleSolve();
      }
    );
    this.nodeLabels.syncAll();

    this.unsubSelection = this.selection.onChange(() => this.renderSelection());

    this.interaction = new InteractionController(this, viewport);
    this.tools = new ToolManager(this, viewport, this.interaction);
    this.tools.register(new SelectMoveTool());
    this.tools.register(new HandTool());
    this.tools.setActive(SelectMoveTool.ID);
    this.interaction.onMiddleDoubleClick.subscribe(() => this.fitInView());
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
    const instances = collectSupportInstances(this.model);
    this.supportMesh.update(instances);
    this.supportMesh.visible = instances.length > 0;
  }

  private renderReactions(res: SolveResult): void {
    this.reactionData = collectReactionInstances(
      this.model,
      this.solver.dofIndex,
      res.reactions
    );
    this.reactionMesh.update(this.reactionData);
    this.reactionMesh.visible =
      this.reactionsVisible && this.reactionData.length > 0;
    if (this.reactionsVisible) {
      this.reactionLabels.update(this.reactionData);
    }
    this.viewport.requestRender();
  }

  private clearReactions(): void {
    this.reactionData = [];
    this.reactionMesh.update([]);
    this.reactionMesh.visible = false;
    this.reactionLabels.clear();
    this.viewport.requestRender();
  }

  setSupportSize(size: number): void {
    this.supportMesh.setSize(size);
    this.viewport.requestRender();
  }

  setReactionSize(size: number): void {
    this.reactionMesh.setSize(size);
    this.reactionLabels.setReactionSizePx(size);
  }

  setReactionsVisible(visible: boolean): void {
    this.reactionsVisible = visible;
    this.reactionMesh.visible = visible && this.reactionData.length > 0;
    this.setChannelVisible(REACTION_LABEL_CHANNEL, visible);
    if (visible) this.reactionLabels.update(this.reactionData);
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
  }

  redo(): void {
    this.repository.redo();
  }

  // rate limit solves to one per frame
  scheduleSolve(): void {
    if (this.solveScheduled) return;
    this.solveScheduled = true;
    this.solveFrame = requestAnimationFrame(() => {
      this.solveScheduled = false;
      this.solveFrame = 0;
      this.solve();
    });
  }

  // debug solve first load case only
  solve(): SolveResult | null {
    const loadCaseId = this.model.loadCases.keys().next().value;
    if (!loadCaseId) {
      this.clearReactions();
      return null;
    }
    try {
      const startTime = performance.now();
      const res = this.solver.solve(loadCaseId);
      this.lastSolveMs = performance.now() - startTime;
      console.log(`Solve took ${this.lastSolveMs.toFixed(2)} ms`);
      this.renderReactions(res);
      return res;
    } catch (err) {
      console.error('Solve failed', err);
      this.clearReactions();
      return null;
    }
  }

  destroy(): void {
    if (this.solveScheduled) cancelAnimationFrame(this.solveFrame);
    this.solveScheduled = false;
    this.tools.destroy();
    this.interaction.destroy();
    this.unsubSelection();
    this.unsubOnChange();
    this.nodeLabels.dispose();
    this.reactionLabels.dispose();
    this.labels.dispose();
    this.nodeMesh.destroy();
    this.beamGroup.destroy();
    this.supportMesh.destroy();
    this.reactionMesh.destroy();
    this.solver.destroy();
  }
}
