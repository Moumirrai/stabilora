import Konva from 'konva';
import type { Element } from '../stores/model/model.types';
import type StageManager from 'src/viewport/StageManager';

class ElementRenderer {
    private targetLayer: Konva.Layer;
    private stageManager: StageManager;

    private elementColor = '#fff';
    private bottomFiberColor = '#fff';
    private bottomFiberHighScaleOpacity = 0.5;
    private elementStrokeWidth = 2;
    private offsetDistance = 5;
    private dashPattern = [8, 8];

    constructor(targetLayer: Konva.Layer, stageManager: StageManager) {
        this.targetLayer = targetLayer;
        this.stageManager = stageManager;
    }

    public drawElement(element: Element): void {
        const stage = this.stageManager.getStage();
        if (!stage) return;
        const scale = stage.scaleX();

        const x1 = element.nodeA.dx;
        const y1 = element.nodeA.dy;
        const x2 = element.nodeB.dx;
        const y2 = element.nodeB.dy;

        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);

        const perpDx = -dy / length;
        const perpDy = dx / length;

        const offsetX1 = x1 + perpDx * this.offsetDistance / scale;
        const offsetY1 = y1 + perpDy * this.offsetDistance / scale;
        const offsetX2 = x2 + perpDx * this.offsetDistance / scale;
        const offsetY2 = y2 + perpDy * this.offsetDistance / scale;

        const elementGroup = new Konva.Group({
            id: `element-${element.id}`,
            selectable: true,
        });

        const solidLine = new Konva.Line({
            points: [x1, y1, x2, y2],
            stroke: this.elementColor,
            strokeWidth: this.elementStrokeWidth,
            strokeScaleEnabled: false,
        });

        const dashedLine = new Konva.Line({
            points: [offsetX1, offsetY1, offsetX2, offsetY2],
            stroke: this.bottomFiberColor,
            strokeWidth: scale > 100 ? this.elementStrokeWidth / 2 : this.elementStrokeWidth,
            strokeScaleEnabled: false,
            dash: this.dashPattern,
            opacity: scale > 100 ? this.bottomFiberHighScaleOpacity : 1,
            dashEnabled: scale <= 100,
        });

        elementGroup.add(solidLine);
        elementGroup.add(dashedLine);

        this.targetLayer.add(elementGroup);
    }
}

export default ElementRenderer;