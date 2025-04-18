import Konva from 'konva';
import type { Node } from '../stores/model/model.types';
import type StageManager from '../viewport/StageManager';
import { selectedNodeStore } from "../stores/ui/store"

class NodeRenderer {
    private targetLayer: Konva.Layer;
    private stageManager: StageManager;

    private nodeRadius = 5;
    private nodeColor = '#ffffff';

    constructor(targetLayer: Konva.Layer, stageManager: StageManager) {
        this.targetLayer = targetLayer;
        this.stageManager = stageManager;
    }

    public drawNode(node: Node): void {
        const scale = this.stageManager.getStage()?.scaleX() || 1;
        const circle = new Konva.Circle({
            x: node.dx,
            y: node.dy,
            radius: this.nodeRadius / scale, // Adjust radius for zoom
            fill: this.nodeColor,
            draggable: false,
            id: `node-${node.id}`,
            hitStrokeWidth: this.nodeRadius * 4 - 1, // this is more like radius, width is same as diameter of the circle so we get 2x diameter and substract 1 for safety
            strokeScaleEnabled: false,
            selectable: true,
        });
        circle.on('mouseover', () => {
            circle.fill('red');
            this.targetLayer.draw();
        });
        circle.on('mouseout', () => {
            circle.fill(this.nodeColor);
            this.targetLayer.draw();
        });
        circle.on('contextmenu', (e) => {
            // Prevent default context menu
            e.evt.preventDefault();
            const screenPos = circle.getAbsolutePosition();
            // Set the initial position when clicked
            selectedNodeStore.set({ node: node, screenPosition: screenPos });
            this.targetLayer.batchDraw();
        });
        this.targetLayer.add(circle);
    }
}

export default NodeRenderer;