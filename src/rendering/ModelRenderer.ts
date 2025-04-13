import Konva from 'konva';
import type { Unsubscriber } from 'svelte/store';
import { modelStore } from '../stores/model/store'; // Adjust path if needed
import type { Model, Node, Element } from '../stores/model/model.types'; // Adjust path if needed
import type StageManager from '../viewport/StageManager'; // Adjust path if needed

class ModelRenderer {
    private stageManager: StageManager;
    private targetLayer: Konva.Layer;
    private storeUnsubscriber: Unsubscriber | null = null;

    private nodeRadius = 5;
    private nodeColor = '#ffffff'; 

    private elementColor = '#f14c4c';
    private elementStrokeWidth = 2;

    constructor(stageManager: StageManager) {
        this.stageManager = stageManager;
        const layer = stageManager.getLayerManager().geometryLayer;
        this.targetLayer = layer;
    }

    public initialize(): void {
        this.storeUnsubscriber = modelStore.subscribe(model => {
            this.drawModel(model);
        });
    }

    private drawModel(model: Model): void {
        this.targetLayer.destroyChildren();

        model.nodes.forEach(node => {
            this.drawNode(node);
        });

        model.elements.forEach(element => {
            this.drawElement(element);
        });

        this.targetLayer.batchDraw();
    }

    private drawNode(node: Node): void {
        const circle = new Konva.Circle({
            x: node.dx,
            y: node.dy,
            radius: this.nodeRadius / (this.stageManager.getStage()?.scaleX() || 1), // Adjust radius for zoom
            fill: this.nodeColor,
            draggable: false,
            id: `node-${node.id}`,
            scaleX: 1 / (this.stageManager.getStage()?.scaleX() || 1),
            scaleY: 1 / (this.stageManager.getStage()?.scaleY() || 1),
            strokeScaleEnabled: false,
        });
        this.targetLayer.add(circle);
    }

    private drawElement(element: Element): void {
        const line = new Konva.Line({
            points: [element.nodeA.dx, element.nodeA.dy, element.nodeB.dx, element.nodeB.dy],
            stroke: this.elementColor,
            strokeWidth: this.elementStrokeWidth,
            strokeScaleEnabled: false,
            id: `element-${element.id}`,
        });
        this.targetLayer.add(line);
    }

    public destroy(): void {
        if (this.storeUnsubscriber) {
            this.storeUnsubscriber();
            this.storeUnsubscriber = null;
        }
    }
}

export default ModelRenderer;