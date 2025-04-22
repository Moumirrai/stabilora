import Konva from 'konva';
import { get, type Unsubscriber } from 'svelte/store';
import { modelStore } from '../stores/model/store';
import type { Model } from '../stores/model/model.types';
import type ViewportManager from '../viewport/ViewportManager';
import NodeRenderer from './NodeRenderer';
import ElementRenderer from './ElementRenderer';

class ModelRenderer {
    private stageManager: ViewportManager;
    private targetLayer: Konva.Layer;
    private storeUnsubscriber: Unsubscriber | null = null;
    private nodeRenderer: NodeRenderer;
    private elementRenderer: ElementRenderer;


    constructor(stageManager: ViewportManager) {
        this.stageManager = stageManager;
        const layer = stageManager.getLayerManager().geometryLayer;
        this.targetLayer = layer;
        //layer.toggleHitCanvas();
        this.nodeRenderer = new NodeRenderer(this.targetLayer, this.stageManager);
        this.elementRenderer = new ElementRenderer(this.targetLayer, this.stageManager);
    }

    public initialize(): void {
        this.storeUnsubscriber = modelStore.subscribe(model => {
            this.drawModel(model);
        });
        const stage = this.stageManager.getStage();
        if (!stage) return;
        stage.on('redraw redrawAll dragend', () => {
            this.updateView(get(modelStore));
        })
        stage.on('dblclick', (e) => { //handle fitInView on double click
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
        const margin = maxSide * 0.05; //add margin of 5% to each side
        rect.x -= margin;
        rect.y -= margin;
        rect.width += margin * 2;
        rect.height += margin * 2;
        this.stageManager.zoomToRect(rect, duration)
    }

    private updateView(model: Model): void {
        model.elements.forEach(element => {
            this.elementRenderer.updateElement(element);
        });
        model.nodes.forEach(node => {
            this.nodeRenderer.updateNode(node);
        });
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
    }
}

export default ModelRenderer;