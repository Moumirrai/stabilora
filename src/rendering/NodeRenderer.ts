import Konva from 'konva';
import type { Node } from '../stores/model/model.types';
import type StageManager from '../viewport/StageManager';

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
            strokeScaleEnabled: false,
        });
        this.targetLayer.add(circle);
    }
}

export default NodeRenderer;