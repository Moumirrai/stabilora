import Konva from 'konva';
import { get, type Readable, type Unsubscriber } from 'svelte/store';
import { modelStore } from '../../stores/model/store';
import type { Model } from '../../stores/model/model.types';
import type Viewport from '../viewport';
import NodeRenderer from './NodeRenderer';
import ElementRenderer from './ElementRenderer';

class ModelRenderer {
  private readonly stageManager: Viewport;
  private readonly targetLayer: Konva.Layer;
  private readonly store: Readable<Model>;
  private storeUnsubscriber: Unsubscriber | null = null;
  private nodeRenderer: NodeRenderer;
  private elementRenderer: ElementRenderer;

  constructor(
    stageManager: Viewport,
    store: Readable<Model> = modelStore,
    layer: Konva.Layer = stageManager.getLayerManager().geometryLayer
  ) {
    this.stageManager = stageManager;
    this.store = store;
    this.targetLayer = layer;
    this.nodeRenderer = new NodeRenderer(this.targetLayer, this.stageManager);
    this.elementRenderer = new ElementRenderer(
      this.targetLayer,
      this.stageManager
    );
  }

  public initialize(): void {
    this.storeUnsubscriber = this.store.subscribe((model) => {
      this.drawModel(model);
    });
    const stage = this.stageManager.getStage();
    if (!stage) return;
    stage.on('redraw redrawAll dragend', () => {
      this.updateView(get(this.store));
    });
  }

  private updateView(model: Model): void {
    model.elements.forEach((element) => {
      this.elementRenderer.updateElement(element);
    });
    this.nodeRenderer.updateAllNodes();
    this.targetLayer.batchDraw();
    /*model.nodes.forEach((node) => {
      this.nodeRenderer.updateNode(node);
    });*/
  }

  private drawModel(model: Model): void {
    this.targetLayer.destroyChildren();
    this.nodeRenderer.reset();
    model.elements.forEach((element) => {
      this.elementRenderer.drawElement(element);
    });

    model.nodes.forEach((node) => {
      this.nodeRenderer.drawNode(node);
    });

    this.targetLayer.batchDraw();
  }

  public destroy(): void {
    if (this.storeUnsubscriber) {
      this.storeUnsubscriber();
      this.storeUnsubscriber = null;
    }
  }
}

export default ModelRenderer;
