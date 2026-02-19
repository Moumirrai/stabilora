import Konva from 'konva';
import { get, type Readable, type Unsubscriber } from 'svelte/store';
import { modelStore } from '../../stores/model/store';
import type { Model } from '../../stores/model/model.types';
import type Viewport from '../viewport';
import NodeRenderer from './NodeRenderer';
import ElementRenderer from './ElementRenderer';
import SupportRenderer from './SupportRenderer';
import type IRenderer from './IRenderer';
import {
  renderingConfigStore,
  type RenderingConfig,
} from './store/RenderingConfig';
import { selectionStore } from '../../stores/app/store';
import type { IRect } from 'konva/lib/types';

class ModelRenderer {
  private readonly renderers: IRenderer[] = [];
  private readonly stageManager: Viewport;
  private readonly store: Readable<Model>;
  private storeUnsubscriber: Unsubscriber | null = null;
  private configUnsubscriber: Unsubscriber | null = null;
  private readonly targetLayer: Konva.Layer;
  private currentConfig: RenderingConfig;

  constructor(
    stageManager: Viewport,
    store: Readable<Model> = modelStore,
    layer: Konva.Layer = stageManager.getLayerManager().geometryLayer
  ) {
    this.stageManager = stageManager;
    this.store = store;
    this.targetLayer = layer;
    this.currentConfig = get(renderingConfigStore); // Initial config
    this.renderers = [
      new SupportRenderer(),
      new ElementRenderer(),
      new NodeRenderer(),
    ];
  }

  public initialize(): void {
    this.storeUnsubscriber = this.store.subscribe((model) => {
      this.drawModel(model);
    });
    this.configUnsubscriber = renderingConfigStore.subscribe((config) => {
      this.currentConfig = config;
      const model = get(this.store);
      if (config.isDirty) {
        this.drawModel(model);
      } else {
        this.updateView(model);
      }
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
    const selection = get(selectionStore);
    this.renderers.forEach((renderer) =>
      renderer.update(model, viewport, layer, this.currentConfig, selection)
    );
    this.targetLayer.batchDraw();
  }

  private drawModel(model: Model): void {
    this.targetLayer.destroyChildren();
    const viewport = this.stageManager;
    const layer = this.targetLayer;
    const selection = get(selectionStore);
    this.renderers.forEach((renderer) => {
      renderer.reset();
      renderer.draw(model, viewport, layer, this.currentConfig, selection);
    });
    //from nodes in model, get min and max x and y, create IRect
    const nodes = model.nodes;
    if (nodes.length === 0) {
      // Handle empty case, perhaps set a default rect or skip
      return;
    }
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const node of nodes) {
      minX = Math.min(minX, node.dx);
      maxX = Math.max(maxX, node.dx);
      minY = Math.min(minY, node.dy);
      maxY = Math.max(maxY, node.dy);
    }
    const rect: IRect = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };

    viewport.customBoundingBox = rect;

    this.targetLayer.batchDraw();
    this.stageManager.emitRedrawAll(); //TODO: check if necessary if we already called batchDraw
  }

  public destroy(): void {
    if (this.storeUnsubscriber) {
      this.storeUnsubscriber();
      this.storeUnsubscriber = null;
    }
    if (this.configUnsubscriber) {
      this.configUnsubscriber();
      this.configUnsubscriber = null;
    }
  }
}

export default ModelRenderer;
