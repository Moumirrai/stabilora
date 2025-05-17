import Konva from 'konva';
import type { Node } from '../../stores/model/model.types';
import type Viewport from '../viewport';
import { selectedNodeStore } from '../../stores/ui/store';

class NodeRenderer {
  private targetLayer: Konva.Layer;
  private stageManager: Viewport;
  private nodeShapes: Map<string | number, Konva.Circle> = new Map(); // Cache for node shapes

  private nodeRadius = 5;
  private nodeColor = '#ffffff';

  constructor(targetLayer: Konva.Layer, stageManager: Viewport) {
    this.targetLayer = targetLayer;
    this.stageManager = stageManager;
  }

  public updateNode(node: Node): void {
    const stage = this.stageManager.getStage();
    if (!stage) return;
    const scale = stage.scaleX();
    // find the existing node circle from the cache
    const nodeCircle = this.nodeShapes.get(node.id);
    if (!nodeCircle) {
      console.warn(`Node circle for node ${node.id} not found in cache`);
      return;
    }
    nodeCircle.radius(this.nodeRadius / scale); // adjust radius for zoom
  }

  public drawNode(node: Node): void {
    const scale = this.stageManager.getStage()?.scaleX() || 1;
    const circle = new Konva.Circle({
      x: node.dx,
      y: node.dy,
      radius: this.nodeRadius / scale, // adjust radius for zoom
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
      this.targetLayer.batchDraw();
    });
    circle.on('mouseout', () => {
      circle.fill(this.nodeColor);
      this.targetLayer.batchDraw();
    });
    circle.on('contextmenu', (e) => {
      e.evt.preventDefault();
      const screenPos = circle.getAbsolutePosition();
      selectedNodeStore.set({ node: node, screenPosition: screenPos });
    });
    this.targetLayer.add(circle);
  }

  public reset(): void {
    this.nodeShapes.clear(); // clear the cache
  }

  public updateAllNodes(): void {
    const stage = this.stageManager.getStage();
    if (!stage) return;
    const scale = stage.scaleX();
    this.nodeShapes.forEach((nodeCircle) => {
      nodeCircle.radius(this.nodeRadius / scale);
    });
  }
}

export default NodeRenderer;
