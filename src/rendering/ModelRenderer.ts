import Konva from 'konva';
import { get, type Unsubscriber } from 'svelte/store';
import { modelStore } from '../stores/model/store';
import type { Model } from '../stores/model/model.types';
import type StageManager from '../viewport/StageManager';
import NodeRenderer from './NodeRenderer';
import ElementRenderer from './ElementRenderer';

class ModelRenderer {
    private stageManager: StageManager;
    private targetLayer: Konva.Layer;
    private storeUnsubscriber: Unsubscriber | null = null;
    private nodeRenderer: NodeRenderer;
    private elementRenderer: ElementRenderer;


    constructor(stageManager: StageManager) {
        this.stageManager = stageManager;
        const layer = stageManager.getLayerManager().geometryLayer;
        this.targetLayer = layer;
        this.nodeRenderer = new NodeRenderer(this.targetLayer, this.stageManager);
        this.elementRenderer = new ElementRenderer(this.targetLayer, this.stageManager);
    }

    public initialize(): void {
        this.storeUnsubscriber = modelStore.subscribe(model => {
            this.drawModel(model);
        });
        const stage = this.stageManager.getStage();
        if (!stage) return;
        stage.on('redrawAll redraw', () => {
            this.drawModel(get(modelStore));
        })
        stage.on('dblclick', (e) => {
            console.log(stage.scaleX());
            //middle mouse button only
            if (e.evt.button === 1) {
                this.fitInView(300);
            }
        });
        this.fitInView(0);
    }

    public fitInView(duration: number): void {
        const stage = this.stageManager.getStage();
        if (!stage) return;
        const rect = this.targetLayer.getClientRect({ relativeTo: stage })
        if (rect.width === 0 && rect.height === 0) { //TODO: rework this
            rect.x = -2000;
            rect.y = -2000;
            rect.width = 4000;
            rect.height = 4000;
        }
        const maxSide = Math.max(rect.width, rect.height);
        const margin = maxSide * 0.05; //margin of 5%
        rect.x -= margin;
        rect.y -= margin;
        rect.width += margin * 2;
        rect.height += margin * 2;
        this.stageManager.zoomToRect(rect, duration)
    }

    private drawModel(model: Model): void {
        this.targetLayer.destroyChildren();
        
        model.elements.forEach(element => {
            this.elementRenderer.drawElement(element);
        });

        model.nodes.forEach(node => {
            this.nodeRenderer.drawNode(node);
        });

        this.targetLayer.draw();
    }

    public destroy(): void {
        if (this.storeUnsubscriber) {
            this.storeUnsubscriber();
            this.storeUnsubscriber = null;
        }
        // Potentially add destroy methods to NodeRenderer/ElementRenderer if needed
    }
}

export default ModelRenderer;