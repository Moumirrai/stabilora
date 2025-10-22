import Konva from 'konva';
import type { Stage } from 'konva/lib/Stage';
import type { Layer } from 'konva/lib/Layer';
import type { Vector2d } from 'konva/lib/types';
import type Viewport from './viewport';
import { spatialIndex, modelStore } from '../stores/model/store';
import { get } from 'svelte/store';
import { SpatialItemType } from '../stores/model/ISpatialItem';
type Point = { x: number; y: number };
type Rect = { minX: number; minY: number; maxX: number; maxY: number };

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

  private fadeOutTween: Konva.Tween | null = null;
  private fadeOutDuration = 100; // ms

  constructor(layer: Layer, uiLayer: Layer, stageManager: Viewport) {
    this.layer = layer;
    this.stage = stageManager.getStage()!;
    this.guiLayer = uiLayer;

    this.stage.on('mousedown.selection', this.handleMouseDown);
    this.stage.on('mousemove.selection', this.handleMouseMove);
    this.stage.on('mouseup.selection', this.handleMouseUp);

    this.stage.on('redraw redrawAll', () => {
      //console.log('Redrawing selection...');
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
    this.finishFadeOutAnimation();
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

  private finishFadeOutAnimation() {
    if (this.fadeOutTween) {
      this.fadeOutTween.finish();
      this.fadeOutTween = null;
    }
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
    // Use relative pointer position for screen coordinates
    this.selectionBoxStartPos = this.stage.getRelativePointerPosition();

    if (!e.evt.shiftKey) {
      this.clearSelection();
    }
  };

  private handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!this.isSelecting || !this.selectionBoxStartPos) {
      return;
    }

    // Use relative pointer position for screen coordinates
    const currentPos = this.stage.getRelativePointerPosition();
    if (!currentPos) return;

    const dx = Math.abs(currentPos.x - this.selectionBoxStartPos.x);
    const dy = Math.abs(currentPos.y - this.selectionBoxStartPos.y);

    if (dx > this.dragThreshold || dy > this.dragThreshold) {
      if (!this.selectionBox) {
        this.selectionBox = new Konva.Rect({
          fill: '#ffcc0018',
          stroke: '#ffcc00',
          strokeWidth: 1,
          visible: true,
          listening: false,
          strokeScaleEnabled: false,
        });
        this.guiLayer.add(this.selectionBox);
      }

      const x = Math.min(this.selectionBoxStartPos.x, currentPos.x);
      const y = Math.min(this.selectionBoxStartPos.y, currentPos.y);
      const width = Math.abs(currentPos.x - this.selectionBoxStartPos.x);
      const height = Math.abs(currentPos.y - this.selectionBoxStartPos.y);

      const intersectSelect = this.selectionBoxStartPos.x < currentPos.x;

      let dash: Array<number> | undefined = undefined;
      if (!intersectSelect) {
        dash = [5, 5];
      }

      //console.log(`Selection box: x=${x}, y=${y}, width=${width}, height=${height}`);

      this.selectionBox.setAttrs({ x, y, width, height, dash });
      this.guiLayer.batchDraw();

      const rect = {
        minX: Math.min(this.selectionBoxStartPos.x, currentPos.x),
        minY: Math.min(this.selectionBoxStartPos.y, currentPos.y),
        maxX: Math.max(this.selectionBoxStartPos.x, currentPos.x),
        maxY: Math.max(this.selectionBoxStartPos.y, currentPos.y),
      };
      //console.log('Selection rect:', rect);
      let result = spatialIndex.search(rect);
      result = result.filter((item) => item.type == SpatialItemType.Element);
      //check line intersection for each element
      const model = get(modelStore);
      let test = [];
      for (const item of result) {
        const element = model.elements.find((el) => el.id === item.id);
        if (!element) continue;
        const x1 = element.nodeA.dx;
        const y1 = element.nodeA.dy;
        const x2 = element.nodeB.dx;
        const y2 = element.nodeB.dy;

        if (this.lineIntersectsBox(x1, y1, x2, y2, rect)) {
          test.push(item);
        }

        //check if line intersect with selection box
      }
      //console.log(test);
    }
  };

  // Helper: Check if two lines (p1-p2 and q1-q2) intersect

  // Helper: Check if two lines (p1-p2 and q1-q2) intersect
  private linesIntersect = (
    p1: Point,
    p2: Point,
    q1: Point,
    q2: Point
  ): boolean => {
    function ccw(a: Point, b: Point, c: Point): boolean {
      return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
    }
    return (
      ccw(p1, q1, q2) !== ccw(p2, q1, q2) && ccw(p1, p2, q1) !== ccw(p1, p2, q2)
    );
  };

  // Helper: Check if a line (x1,y1)-(x2,y2) intersects with a box
  private lineIntersectsBox = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    rect: Rect
  ): boolean => {
    // Box corners
    const topLeft: Point = { x: rect.minX, y: rect.minY };
    const topRight: Point = { x: rect.maxX, y: rect.minY };
    const bottomLeft: Point = { x: rect.minX, y: rect.maxY };
    const bottomRight: Point = { x: rect.maxX, y: rect.maxY };

    // Box edges
    const edges: [Point, Point][] = [
      [topLeft, topRight],
      [topRight, bottomRight],
      [bottomRight, bottomLeft],
      [bottomLeft, topLeft],
    ];

    // Check intersection with any edge
    for (const [p1, p2] of edges) {
      if (this.linesIntersect({ x: x1, y: y1 }, { x: x2, y: y2 }, p1, p2)) {
        return true;
      }
    }

    // Also check if the line is completely inside the box
    function pointInRect(x: number, y: number, r: Rect): boolean {
      return x >= r.minX && x <= r.maxX && y >= r.minY && y <= r.maxY;
    }
    if (pointInRect(x1, y1, rect) && pointInRect(x2, y2, rect)) {
      return true;
    }

    return false;
  };

  private handleMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!this.isSelecting) {
      return;
    }

    this.isSelecting = false;
    let changed = false;

    if (this.selectionBox) {
      const boxRect = this.selectionBox.getClientRect();

      console.log(boxRect);

      // Convert screen coordinates to world coordinates for intersection testing
      const transform = this.stage.getAbsoluteTransform().copy().invert();
      const worldBoxRect = {
        x: (boxRect.x - this.stage.x()) / this.stage.scaleX(),
        y: (boxRect.y - this.stage.y()) / this.stage.scaleY(),
        width: boxRect.width / this.stage.scaleX(),
        height: boxRect.height / this.stage.scaleY(),
      };

      const shapesInBox = this.layer.find((node: Konva.Node) => {
        if (!this.filter(node)) {
          return false;
        }
        return Konva.Util.haveIntersection(worldBoxRect, node.getClientRect());
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

      /* this.selectionBox.destroy();
      this.selectionBox = null;
      this.guiLayer.batchDraw(); */
      this.startFadeOutAnimation();
    }

    this.selectionBoxStartPos = null;

    if (changed) {
      this.layer.batchDraw();
    }
  };

  private startFadeOutAnimation() {
    if (!this.selectionBox) return;

    this.fadeOutTween = new Konva.Tween({
      node: this.selectionBox,
      duration: this.fadeOutDuration / 1000, // Konva uses seconds
      opacity: 0,
      onFinish: () => {
        if (this.selectionBox) {
          this.selectionBox.destroy();
          this.selectionBox = null;
        }
        this.fadeOutTween = null;
        this.guiLayer.batchDraw();
      },
    });

    this.fadeOutTween.play();
  }
}

export default Selection;
