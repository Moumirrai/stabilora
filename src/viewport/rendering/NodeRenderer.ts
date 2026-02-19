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
  private cullingBufferMultiplier = 1; // multiplier for viewport size for culling buffer

  constructor() {}

  public update(
    model: Model,
    viewport: Viewport,
    layer: Konva.Layer,
    config: RenderingConfig,
    selection: string[]
  ): void {
    const stage = viewport.getStage();
    if (!stage) return;
    const scale = stage.scaleX();
    const vx = -stage.x() / scale;
    const vy = -stage.y() / scale;
    const vwidth = stage.width() / scale;
    const vheight = stage.height() / scale;
    const cullX = vx - this.cullingBufferMultiplier * vwidth;
    const cullY = vy - this.cullingBufferMultiplier * vheight;
    const cullWidth = vwidth + 2 * this.cullingBufferMultiplier * vwidth;
    const cullHeight = vheight + 2 * this.cullingBufferMultiplier * vheight;
    const visibleNodeIds = new Set<string | number>();
    for (const node of model.nodes) {
      if (
        node.dx >= cullX &&
        node.dx <= cullX + cullWidth &&
        node.dy >= cullY &&
        node.dy <= cullY + cullHeight
      ) {
        visibleNodeIds.add(node.id);
        let circle = this.nodeShapes.get(node.id);
        if (!circle) {
          circle = new Konva.Circle({
            x: node.dx,
            y: node.dy,
            radius: (config.node.scale * this.nodeRadius) / scale,
            fill: this.nodeColor,
            draggable: false,
            id: `node-${node.id}`,
            hitStrokeWidth: this.nodeRadius * 2 - 1,
            strokeScaleEnabled: false,
            selectable: true,
            perfectDrawEnabled: false,
            listening: true,
          });
          if (selection.includes(`node-${node.id}`)) {
            circle.stroke('red'); //todo control color from config
            circle.strokeWidth(2);
          }
          circle.on('mouseover', () => {
            circle!.fill('red');
            layer.batchDraw();
          });
          circle.on('mouseout', () => {
            circle!.fill(this.nodeColor);
            layer.batchDraw();
          });
          circle.on('contextmenu', (e) => {
            e.evt.preventDefault();
            const screenPos = circle!.getAbsolutePosition();
            selectedNodeStore.set({ node: node, screenPosition: screenPos });
          });
          this.nodeShapes.set(node.id, circle);
          layer.add(circle);
        } else {
          circle.x(node.dx);
          circle.y(node.dy);
          circle.radius((config.node.scale * this.nodeRadius) / scale);
        }
      }
    }
    for (const [id, circle] of this.nodeShapes) {
      if (!visibleNodeIds.has(id)) {
        circle.remove();
        this.nodeShapes.delete(id);
      }
    }
  }

  public draw(
    model: Model,
    viewport: Viewport,
    layer: Konva.Layer,
    config: RenderingConfig,
    selection: string[]
  ): void {
    const stage = viewport.getStage();
    if (!stage) return;
    const scale = stage.scaleX();
    const vx = -stage.x() / scale;
    const vy = -stage.y() / scale;
    const vwidth = stage.width() / scale;
    const vheight = stage.height() / scale;
    const cullX = vx - this.cullingBufferMultiplier * vwidth;
    const cullY = vy - this.cullingBufferMultiplier * vheight;
    const cullWidth = vwidth + 2 * this.cullingBufferMultiplier * vwidth;
    const cullHeight = vheight + 2 * this.cullingBufferMultiplier * vheight;
    for (const node of model.nodes) {
      if (
        node.dx >= cullX &&
        node.dx <= cullX + cullWidth &&
        node.dy >= cullY &&
        node.dy <= cullY + cullHeight
      ) {
        const circle = new Konva.Circle({
          x: node.dx,
          y: node.dy,
          radius: (config.node.scale * this.nodeRadius) / scale, // adjust radius for zoom
          fill: this.nodeColor,
          draggable: false,
          id: `node-${node.id}`,
          hitStrokeWidth: this.nodeRadius * 2 - 1,
          strokeScaleEnabled: false,
          selectable: true,
          perfectDrawEnabled: false,
          listening: true,
        });
        if (selection.includes(`node-${node.id}`)) {
          circle.stroke('red');
          circle.strokeWidth(2);
        }
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
  }

  public reset(): void {
    this.nodeShapes.clear(); // clear the cache
  }
}

export default NodeRenderer;
