import Konva from 'konva';
import type { Element } from '../../stores/model/model.types';
import type Viewport from '../viewport';

// Liang-Barsky line clipping algorithm
function clipLineSegment(
  line: [number, number, number, number],
  viewport: Konva.RectConfig
): [number, number, number, number] | null {
  let [x1, y1, x2, y2] = line;
  const { x: xmin, y: ymin, width, height } = viewport;
  if (
    xmin === undefined ||
    ymin === undefined ||
    width === undefined ||
    height === undefined
  ) {
    console.warn('Invalid viewport rectangle:', viewport);
    return null;
  }
  const xmax = xmin + width;
  const ymax = ymin + height;

  const dx = x2 - x1;
  const dy = y2 - y1;
  let t0 = 0;
  let t1 = 1;
  const p: number[] = [-dx, dx, -dy, dy];
  const q: number[] = [x1 - xmin, xmax - x1, y1 - ymin, ymax - y1];

  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) {
        return null; // Parallel line outside
      }
    } else {
      const r = q[i] / p[i];
      if (p[i] < 0) {
        if (r > t1) return null;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return null;
        if (r < t1) t1 = r;
      }
    }
  }

  if (t0 > t1) {
    return null; // Line is completely outside
  }

  const clippedX1 = x1 + t0 * dx;
  const clippedY1 = y1 + t0 * dy;
  const clippedX2 = x1 + t1 * dx;
  const clippedY2 = y1 + t1 * dy;

  return [clippedX1, clippedY1, clippedX2, clippedY2];
}

class ElementRenderer {
  private targetLayer: Konva.Layer;
  private stageManager: Viewport;

  private elementColor = '#fff';
  private bottomFiberColor = '#fff';
  private elementStrokeWidth = 2;
  private offsetDistance = 5; // distance between the solid and dashed line
  private cullingBufferMultiplier = 1; // multiplier for viewport size for culling buffer
  private dashPattern(scale: number): number[] {
    return [10 / scale, 10 / scale]; // dash pattern for the dashed line
  }

  constructor(targetLayer: Konva.Layer, stageManager: Viewport) {
    this.targetLayer = targetLayer;
    this.stageManager = stageManager;
  }

  /**
   * Updates an existing element's representation or draws it if it doesn't exist.
   * Handles visibility and clipping based on the current viewport.
   */
  public updateElement(element: Element): void {
    const stage = this.stageManager.getStage();
    if (!stage) return;
    const scale = stage.scaleX();

    const elementGroup = this.targetLayer.findOne(
      `#element-${element.id}`
    ) as Konva.Group;
    if (!elementGroup) {
      const newElementGroup = this.drawElement(element);
      if (!newElementGroup) {
        console.warn(`Element ${element.id} could not be drawn.`);
        return;
      }
      return;
    }
    this.updateElementVisibilityAndClipping(element, elementGroup, scale);
  }

  /**
   * Updates the visibility and applies clipping to the lines within an element group.
   */
  private updateElementVisibilityAndClipping(
    element: Element,
    elementGroup: Konva.Group,
    scale: number
  ): void {
    let viewportRect = this.stageManager.getViewportRect();

    const x1 = element.nodeA.dx;
    const y1 = element.nodeA.dy;
    const x2 = element.nodeB.dx;
    const y2 = element.nodeB.dy;

    // visibility check using bounding box
    const elementBounds = {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
    };
    // expand the viewport for culling checks, so that its not noticeable when panning
    const bufferedViewport = {
      x: viewportRect.x - this.cullingBufferMultiplier * viewportRect.width,
      y: viewportRect.y - this.cullingBufferMultiplier * viewportRect.height,
      width:
        viewportRect.width +
        2 * this.cullingBufferMultiplier * viewportRect.width,
      height:
        viewportRect.height +
        2 * this.cullingBufferMultiplier * viewportRect.height,
    };
    const isVisible = Konva.Util.haveIntersection(
      elementBounds,
      bufferedViewport
    );
    elementGroup.visible(isVisible);
    if (!isVisible) return; // if the bounding box isn't visible, no need to clip/update children

    const children = elementGroup.getChildren();
    if (children.length < 2) return; // expecting solid and dashed lines
    const solidLine = children[0] as Konva.Line;
    const dashedLine = children[1] as Konva.Line;

    // calculate line vector
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);

    // Handle zero-length elements
    if (length < 1e-6) {
      solidLine.visible(false);
      dashedLine.visible(false);
      return;
    }

    const clippedSolidPoints = clipLineSegment(
      [x1, y1, x2, y2],
      bufferedViewport
    );

    if (clippedSolidPoints) {
      solidLine.points(clippedSolidPoints);
      solidLine.strokeWidth(this.elementStrokeWidth / scale);
      solidLine.visible(true);

      // calculate dashed line
      const perpDx = -dy / length; // normalized perpendicular vector
      const perpDy = dx / length;
      const offsetDist = this.offsetDistance / scale; // offset distance adjusted for scale

      const [csx1, csy1, csx2, csy2] = clippedSolidPoints;

      // calculate offset points for the dashed line based on clipped solid points
      const cdx1 = csx1 + perpDx * offsetDist;
      const cdy1 = csy1 + perpDy * offsetDist;
      const cdx2 = csx2 + perpDx * offsetDist;
      const cdy2 = csy2 + perpDy * offsetDist;

      dashedLine.points([cdx1, cdy1, cdx2, cdy2]);
      dashedLine.dash(this.dashPattern(scale));
      dashedLine.visible(true);
      dashedLine.strokeWidth(this.elementStrokeWidth / scale);
      // ensure dash style is enabled
      dashedLine.dashEnabled(true);
    } else {
      // solid line is completely outside the buffered viewport
      solidLine.visible(false);
      dashedLine.visible(false);
    }
  }

  /**
   * Draws a new element representation (solid and dashed line) on the layer.
   * Performs initial visibility check and clipping.
   */
  public drawElement(element: Element): Konva.Group | null {
    const stage = this.stageManager.getStage();
    if (!stage) return null;
    const scale = stage.scaleX();
    const viewportRect = this.stageManager.getViewportRect(); // get initial viewport

    const x1 = element.nodeA.dx;
    const y1 = element.nodeA.dy;
    const x2 = element.nodeB.dx;
    const y2 = element.nodeB.dy;

    const elementBounds = {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
    };
    const bufferedViewport = {
      x: viewportRect.x - this.cullingBufferMultiplier * viewportRect.width,
      y: viewportRect.y - this.cullingBufferMultiplier * viewportRect.height,
      width:
        viewportRect.width +
        2 * this.cullingBufferMultiplier * viewportRect.width,
      height:
        viewportRect.height +
        2 * this.cullingBufferMultiplier * viewportRect.height,
    };
    const isInitiallyVisible = Konva.Util.haveIntersection(
      elementBounds,
      bufferedViewport
    );

    const elementGroup = new Konva.Group({
      id: `element-${element.id}`,
      visible: isInitiallyVisible,
      listening: false, //TODO: remove after fixing hit shape
    });

    // solid line clipping
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    let solidPoints: number[] = [];
    let dashedPoints: number[] = [];
    let areLinesDrawable = false; // flag if lines are non zero length and initially clipped

    if (length > 1e-6) {
      // clip solid line
      const clippedSolid = clipLineSegment([x1, y1, x2, y2], viewportRect);

      if (clippedSolid) {
        solidPoints = clippedSolid;
        areLinesDrawable = true; // at least the solid line is drawable

        // calculate dashed line
        const perpDx = -dy / length;
        const perpDy = dx / length;
        const offsetDist = this.offsetDistance / scale;
        const [csx1, csy1, csx2, csy2] = clippedSolid;
        const cdx1 = csx1 + perpDx * offsetDist;
        const cdy1 = csy1 + perpDy * offsetDist;
        const cdx2 = csx2 + perpDx * offsetDist;
        const cdy2 = csy2 + perpDy * offsetDist;
        dashedPoints = [cdx1, cdy1, cdx2, cdy2];
      }
    }

    // create konva lines
    const solidLine = new Konva.Line({
      points: solidPoints,
      stroke: this.elementColor,
      strokeWidth: this.elementStrokeWidth / scale,
      //strokeScaleEnabled: false,
      perfectDrawEnabled: false,
      listening: false,
      visible: areLinesDrawable && isInitiallyVisible, // visible only if drawable and group is visible
    });

    const dashedLine = new Konva.Line({
      points: dashedPoints,
      stroke: this.bottomFiberColor,
      strokeWidth: this.elementStrokeWidth / scale,
      //strokeScaleEnabled: false,
      dash: this.dashPattern(scale),
      dashEnabled: areLinesDrawable, // enable dash only if line has length
      perfectDrawEnabled: false,
      visible: areLinesDrawable && isInitiallyVisible, // visible only if drawable and group is visible
    });

    elementGroup.add(solidLine);
    elementGroup.add(dashedLine);

    this.targetLayer.add(elementGroup);
    return elementGroup; // return the created group so we dont have to query it
  }
}

export default ElementRenderer;
