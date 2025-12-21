import Konva from 'konva';
import { get, type Readable, type Unsubscriber } from 'svelte/store';
import { modelStore } from '../../stores/model/store';
import type { Model } from '../../stores/model/model.types';
import type Viewport from '../viewport';
import NodeRenderer from './NodeRenderer';
import ElementRenderer from './ElementRenderer';
import SupportRenderer from './SupportRenderer';
import type IRenderer from './IRenderer';

class ModelRenderer {
  private readonly renderers: IRenderer[] = [];
  private readonly stageManager: Viewport;
  private readonly store: Readable<Model>;
  private storeUnsubscriber: Unsubscriber | null = null;
  private readonly targetLayer: Konva.Layer;

  constructor(
    stageManager: Viewport,
    store: Readable<Model> = modelStore,
    layer: Konva.Layer = stageManager.getLayerManager().geometryLayer
  ) {
    this.stageManager = stageManager;
    this.store = store;
    this.targetLayer = layer;
    this.renderers = [
      new SupportRenderer(),
      new NodeRenderer(),
      new ElementRenderer(),
    ];
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
    const viewport = this.stageManager;
    const layer = this.targetLayer;
    this.renderers.forEach(renderer => renderer.update(model, viewport, layer));
    this.targetLayer.batchDraw();
  }

  private drawModel(model: Model): void {
    this.targetLayer.destroyChildren();
    const viewport = this.stageManager;
    const layer = this.targetLayer;
    this.renderers.forEach(renderer => {
      renderer.reset();
      renderer.draw(model, viewport, layer);
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
