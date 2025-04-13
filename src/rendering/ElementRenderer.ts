import Konva from 'konva';
import type { Element } from '../stores/model/model.types';

class ElementRenderer {
    private targetLayer: Konva.Layer;

    private elementColor = '#f14c4c';
    private elementStrokeWidth = 2;

    constructor(targetLayer: Konva.Layer) {
        this.targetLayer = targetLayer;
    }

    public drawElement(element: Element): void {
        const line = new Konva.Line({
            points: [element.nodeA.dx, element.nodeA.dy, element.nodeB.dx, element.nodeB.dy],
            stroke: this.elementColor,
            strokeWidth: this.elementStrokeWidth,
            strokeScaleEnabled: false,
            id: `element-${element.id}`,
        });
        this.targetLayer.add(line);
    }
}

export default ElementRenderer;