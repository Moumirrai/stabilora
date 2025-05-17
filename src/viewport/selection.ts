import Konva from 'konva';
import type { Stage } from 'konva/lib/Stage';
import type { Layer } from 'konva/lib/Layer';
import type { Vector2d } from 'konva/lib/types';
import type Viewport from './viewport';

class Selection {
  private readonly stage: Stage;
  private layer: Layer;
  private guiLayer: Layer;

  public selection: Array<string> = [];

  public selectionBox: Konva.Rect | null = null;
  private selectionBoxStartPos: Vector2d | null = null;
  private isSelecting = false;
  private dragThreshold = 5; // minimum pixels to move before starting selection box

  private filter: (item: Konva.Node) => boolean = (item) =>
    item.attrs.selectable;

  private selectionShadowColor = 'red';
  private selectionShadowBlur = 10;
  private selectionShadowOpacity = 1;

  constructor(layer: Layer, uiLayer: Layer, stageManager: Viewport) {
    this.layer = layer;
    this.stage = stageManager.getStage()!;
    this.guiLayer = uiLayer;

    this.stage.on('mousedown.selection', this.handleMouseDown);
    this.stage.on('mousemove.selection', this.handleMouseMove);
    this.stage.on('mouseup.selection', this.handleMouseUp);

    this.stage.on('redraw redrawAll', () => {
      console.log('Redrawing selection...');
      for (const id of this.selection) {
        const node = this.layer.findOne(`#${id}`);
        if (!node) continue;
        this.applySelectionStyle(node);
      }
      this.layer.batchDraw();
    });
  }

  public destroy() {
    this.stage.off('mousedown.selection');
    this.stage.off('mousemove.selection');
    this.stage.off('mouseup.selection');
    this.clearSelection();
    this.selectionBox?.destroy();
    this.selectionBox = null;
  }

  public setFilter(filter: (item: Konva.Node) => boolean) {
    this.filter = filter;
  }

  private applySelectionStyle(node: Konva.Node) {
    const color = 'red';
    if (node instanceof Konva.Shape) {
      node.shadowColor(color);
      node.shadowBlur(50);
      node.shadowOpacity(1);
    } else if (node instanceof Konva.Group) {
      node.getChildren().forEach((child) => {
        if (child instanceof Konva.Shape) {
          child.shadowColor(color);
          child.shadowBlur(50);
          child.shadowOpacity(1);
        }
      });
    }
  }

  private removeSelectionStyle(node: Konva.Node) {
    //node.shadowEnabled(false);
  }

  public clearSelection() {
    this.selection.forEach((id) => {
      const node = this.layer.findOne(`#${id}`);
      if (node) {
        this.removeSelectionStyle(node);
      }
    });
    this.selection = [];
    console.log('Selection cleared');
    this.layer.batchDraw();
  }

  private handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button !== 0 || e.target !== this.stage) {
      return;
    }

    this.isSelecting = true;
    this.selectionBoxStartPos = this.stage.getPointerPosition();

    if (!e.evt.shiftKey) {
      this.clearSelection();
    }
  };

  private handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!this.isSelecting || !this.selectionBoxStartPos) {
      return;
    }

    const currentPos = this.stage.getPointerPosition();
    if (!currentPos) return;

    const dx = Math.abs(currentPos.x - this.selectionBoxStartPos.x);
    const dy = Math.abs(currentPos.y - this.selectionBoxStartPos.y);

    if (dx > this.dragThreshold || dy > this.dragThreshold) {
      if (!this.selectionBox) {
        this.selectionBox = new Konva.Rect({
          fill: 'rgba(0, 161, 255, 0.3)',
          stroke: 'rgba(0, 161, 255, 0.8)',
          strokeWidth: 1,
          visible: true,
          listening: false,
        });
        this.guiLayer.add(this.selectionBox);
      }

      const x = Math.min(this.selectionBoxStartPos.x, currentPos.x);
      const y = Math.min(this.selectionBoxStartPos.y, currentPos.y);
      const width = Math.abs(currentPos.x - this.selectionBoxStartPos.x);
      const height = Math.abs(currentPos.y - this.selectionBoxStartPos.y);

      this.selectionBox.setAttrs({ x, y, width, height });
      this.guiLayer.batchDraw();
    }
  };

  private handleMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!this.isSelecting) {
      return;
    }

    this.isSelecting = false;
    let changed = false;

    if (this.selectionBox) {
      const boxRect = this.selectionBox.getClientRect();

      const shapesInBox = this.layer.find((node: Konva.Node) => {
        if (!this.filter(node)) {
          return false;
        }
        return Konva.Util.haveIntersection(boxRect, node.getClientRect());
      });

      const shapeIdsInBox = new Set(shapesInBox.map((s) => s.id()));

      if (e.evt.shiftKey) {
        shapesInBox.forEach((shape) => {
          const shapeId = shape.id();
          if (!this.selection.includes(shapeId)) {
            this.selection.push(shapeId);
            this.applySelectionStyle(shape);
            changed = true;
          }
        });
      } else {
        const currentSelectionIds = new Set(this.selection);

        const toDeselectIds = [...currentSelectionIds].filter(
          (id) => !shapeIdsInBox.has(id)
        );
        toDeselectIds.forEach((id) => {
          const node = this.layer.findOne(`#${id}`); // find node by ID
          if (node) {
            this.removeSelectionStyle(node);
          }
        });

        const toSelectIds = [...shapeIdsInBox].filter(
          (id) => !currentSelectionIds.has(id)
        );
        toSelectIds.forEach((id) => {
          const node = this.layer.findOne(`#${id}`);
          if (node) {
            this.applySelectionStyle(node);
          }
        });

        if (toDeselectIds.length > 0 || toSelectIds.length > 0) {
          changed = true;
        }

        this.selection = Array.from(shapeIdsInBox);
      }

      console.log('Selected item IDs:', this.selection);

      this.selectionBox.destroy();
      this.selectionBox = null;
      this.guiLayer.batchDraw();
    }

    this.selectionBoxStartPos = null;

    if (changed) {
      this.layer.batchDraw();
    }
  };
}

export default Selection;
