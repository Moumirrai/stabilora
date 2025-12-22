import Konva from 'konva';
import type { Model, Node } from '../../stores/model/model.types';
import type Viewport from '../viewport';
import { selectedNodeStore } from '../../stores/app/store';
import type IRenderer from './IRenderer';
import type { RenderingConfig } from './store/RenderingConfig';

class NodeRenderer implements IRenderer {
  private nodeShapes: Map<string | number, Konva.Circle> = new Map(); // Cache for node shapes

  private nodeRadius = 5;
  private nodeColor = '#ffffff';

  constructor() {
  }

  public update(_: Model, viewport: Viewport, layer: Konva.Layer, config: RenderingConfig): void {
    const stage = viewport.getStage();
    if (!stage) return;
    const scale = stage.scaleX();
    // find the existing node circle from the cache
    for (const node of this.nodeShapes.values()) {
      node.radius(config.node.scale * this.nodeRadius / scale); // adjust radius for zoom
    }
  }

  public draw(model: Model, viewport: Viewport, layer: Konva.Layer, config: RenderingConfig): void {
    const scale = viewport.getStage()?.scaleX() || 1;
    for (const node of model.nodes) {
      const circle = new Konva.Circle({
        x: node.dx,
        y: node.dy,
        radius: config.node.scale * this.nodeRadius / scale, // adjust radius for zoom
        fill: this.nodeColor,
        draggable: false,
        id: `node-${node.id}`,
        hitStrokeWidth: this.nodeRadius * 2 - 1,
        strokeScaleEnabled: false,
        selectable: true,
        perfectDrawEnabled: false,
        listening: true,
      });
      // Add to cache
      this.nodeShapes.set(node.id, circle);
      circle.on('mouseover', () => {
        circle.fill('red');
        layer.batchDraw();
      });
      circle.on('mouseout', () => {
        circle.fill(this.nodeColor);
        layer.batchDraw();
      });
      circle.on('contextmenu', (e) => {
        e.evt.preventDefault();
        const screenPos = circle.getAbsolutePosition();
        selectedNodeStore.set({ node: node, screenPosition: screenPos });
      });
      layer.add(circle);
    }
  }

  public reset(): void {
    this.nodeShapes.clear(); // clear the cache
  }

}

export default NodeRenderer;
