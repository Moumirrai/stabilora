import Konva from 'konva';
import Viewport from '../viewport';

export class Ruler {
  private viewportManager: Viewport;
  private mainStage: Konva.Stage;
  private hudLayer: Konva.Layer;
  private hudStage: Konva.Stage; // needed for dimensions

  private readonly rulerThickness = 20; // width of the ruler

  private horizontalRulerShape: Konva.Shape;
  private verticalRulerShape: Konva.Shape;

  private tickColor: string = '#666';
  private tickLabelColor: string = '#333';

  // parameters calculated by updateRulerParams and used by sceneFunc methods
  private rulerParams: {
    scale: number;
    mainStagePos: { x: number; y: number };
    tickInterval: number;
    majorTickIntervalWorld: number;
    precision: number;
    hudWidth: number;
    hudHeight: number;
  } | null = null;

  private isDragging: boolean = false;
  private readonly dragRenderMarginFactor = 2.0;

  constructor(
    viewportManager: Viewport,
    hudLayer: Konva.Layer,
    hudStage: Konva.Stage
  ) {
    this.viewportManager = viewportManager;
    this.mainStage = viewportManager.getStage()!;
    this.hudLayer = hudLayer;
    this.hudStage = hudStage;

    const initialWidth = this.hudStage.width();
    const initialHeight = this.hudStage.height();

    //create horizontal and vertical rulers
    this.horizontalRulerShape = new Konva.Shape({
      x: 0,
      y: 0,
      width: initialWidth, // update on resize
      height: this.rulerThickness,
      sceneFunc: this.drawHorizontalRuler.bind(this),
      perfectDrawEnabled: false,
      listening: false,
    });

    this.verticalRulerShape = new Konva.Shape({
      x: 0,
      y: 0,
      width: this.rulerThickness,
      height: initialHeight, // update on resize
      sceneFunc: this.drawVerticalRuler.bind(this),
      perfectDrawEnabled: false,
      listening: false,
    });

    this.hudLayer.add(this.horizontalRulerShape, this.verticalRulerShape);

    // initial calculation
    this.update();
  }

  /**
   * Calculates ruler parameters based on the main stage's current state
   * and triggers a redraw of the HUD layer (which executes the sceneFuncs).
   */
  public update(): void {
    if (!this.mainStage) {
      console.error('Cannot update rulers: Main stage not available.');
      return;
    }

    const scale = this.mainStage.scaleX();
    const currentMainStagePos = this.mainStage.position();
    const hudWidth = this.hudStage.width();
    const hudHeight = this.hudStage.height();

    if (
      scale <= 0 ||
      !Number.isFinite(scale) ||
      hudWidth <= 0 ||
      hudHeight <= 0
    ) {
      console.warn('Cannot redraw rulers with invalid scale or dimensions:', {
        scale,
        hudWidth,
        hudHeight,
      });
      this.rulerParams = null;
      this.hudLayer.batchDraw();
      return;
    }

    // calculate tick properties
    const tickInterval = this.calculateTickInterval(scale);
    const precision = this.getPrecision(tickInterval);
    const majorTickIntervalWorld = 5 * tickInterval; // major ticks every 5 minor ticks
    const majorTickIntervalScreen = majorTickIntervalWorld * scale;

    // prevent excessive drawing if major ticks are too close together visually
    const minPixelSpacingMajor = 5; // minimum pixels between major ticks
    if (majorTickIntervalScreen < minPixelSpacingMajor) {
      // skip updating/redrawing at extreme zooms
      return;
    }

    // store parameters for sceneFunc
    this.rulerParams = {
      scale: scale,
      mainStagePos: { ...currentMainStagePos }, // clone position
      tickInterval: tickInterval,
      majorTickIntervalWorld: majorTickIntervalWorld,
      precision: precision,
      hudWidth: hudWidth,
      hudHeight: hudHeight,
    };

    this.hudLayer.batchDraw();
  }

  public resize(newWidth: number, newHeight: number): void {
    // update ruler shape dimensions to match stage
    this.horizontalRulerShape.width(newWidth);
    this.verticalRulerShape.height(newHeight);
    this.update();
  }

  private drawHorizontalRuler(
    context: Konva.Context,
    shape: Konva.Shape
  ): void {
    if (!this.rulerParams) return;

    const {
      scale,
      mainStagePos,
      tickInterval,
      majorTickIntervalWorld,
      precision,
      hudWidth,
    } = this.rulerParams;
    const rulerHeight = shape.height();

    context.beginPath();

    // calculate visible world coordinate range
    const viewMinWorldX = -mainStagePos.x / scale;
    const viewMaxWorldX = (hudWidth - mainStagePos.x) / scale;
    const startMajorWorldX =
      Math.floor(viewMinWorldX / majorTickIntervalWorld) *
      majorTickIntervalWorld;
    const endMajorWorldX =
      Math.ceil(viewMaxWorldX / majorTickIntervalWorld) *
      majorTickIntervalWorld;

    // draw ticks and labels
    context.setAttr('strokeStyle', this.tickColor);
    context.setAttr('lineWidth', 0.5);
    context.setAttr('fillStyle', this.tickLabelColor);
    context.setAttr('font', '10px Arial');
    context.setAttr('textBaseline', 'top');
    context.setAttr('textAlign', 'left');

    const minorTickIntervalScreen = tickInterval * scale;
    const numMinorTicksPerMajor = 5;
    const majorTickLength = rulerHeight * 0.5;
    const minorTickLength = rulerHeight * 0.25;
    const minPixelSpacingMinor = 4;

    for (
      let worldX = startMajorWorldX;
      worldX <= endMajorWorldX;
      worldX += majorTickIntervalWorld
    ) {
      const screenXMajor = Math.round(worldX * scale + mainStagePos.x);

      context.moveTo(screenXMajor + 0.5, 0);
      context.lineTo(screenXMajor + 0.5, majorTickLength);
      context.fillText(
        worldX.toFixed(precision),
        screenXMajor + 5,
        majorTickLength + 2
      );

      if (minorTickIntervalScreen >= minPixelSpacingMinor) {
        for (let i = 1; i < numMinorTicksPerMajor; i++) {
          const screenXMinor = Math.round(
            screenXMajor + i * minorTickIntervalScreen
          );
          context.moveTo(screenXMinor + 0.5, 0);
          context.lineTo(screenXMinor + 0.5, minorTickLength);
        }
      }
    }
    context.stroke();
  }

  private drawVerticalRuler(context: Konva.Context, shape: Konva.Shape): void {
    if (!this.rulerParams) return;

    const {
      scale,
      mainStagePos,
      tickInterval,
      majorTickIntervalWorld,
      precision,
      hudHeight,
    } = this.rulerParams;
    const rulerWidth = shape.width();

    context.beginPath();

    // calculate world coordinate range
    const viewMinWorldY = -mainStagePos.y / scale;
    const viewMaxWorldY = (hudHeight - mainStagePos.y) / scale;
    const startMajorWorldY =
      Math.floor(viewMinWorldY / majorTickIntervalWorld) *
      majorTickIntervalWorld;
    const endMajorWorldY =
      Math.ceil(viewMaxWorldY / majorTickIntervalWorld) *
      majorTickIntervalWorld;

    // draw ticks and labels
    context.setAttr('strokeStyle', this.tickColor);
    context.setAttr('lineWidth', 0.5);
    context.setAttr('fillStyle', this.tickLabelColor);
    context.setAttr('font', '10px Arial');
    context.setAttr('textAlign', 'right');
    context.setAttr('textBaseline', 'middle');

    const minorTickIntervalScreen = tickInterval * scale;
    const numMinorTicksPerMajor = 5;
    const majorTickLength = rulerWidth * 0.5;
    const minorTickLength = rulerWidth * 0.25;
    const minPixelSpacingMinor = 4;

    for (
      let worldY = startMajorWorldY;
      worldY <= endMajorWorldY;
      worldY += majorTickIntervalWorld
    ) {
      const screenYMajor = Math.round(worldY * scale + mainStagePos.y);

      context.moveTo(0, screenYMajor + 0.5);
      context.lineTo(majorTickLength, screenYMajor + 0.5);

      context.save();
      context.translate(rulerWidth - 2, screenYMajor);
      context.rotate(-Math.PI / 2);
      context.fillText(worldY.toFixed(precision), 0, -12 + majorTickLength);
      context.restore();

      if (minorTickIntervalScreen >= minPixelSpacingMinor) {
        for (let i = 1; i < numMinorTicksPerMajor; i++) {
          const screenYMinor = Math.round(
            screenYMajor + i * minorTickIntervalScreen
          );
          context.moveTo(0, screenYMinor + 0.5);
          context.lineTo(minorTickLength, screenYMinor + 0.5);
        }
      }
    }
    context.stroke();
  }

  private calculateTickInterval(scale: number): number {
    const minPixelSpacingMajor = 50;
    const minPixelSpacingAny = 8;
    const ticksPerMajor = 5;
    const targetWorldUnitsPerTick =
      minPixelSpacingMajor / ticksPerMajor / scale;
    const intervals = [
      0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50,
      100, 200, 500, 1000, 2000, 5000, 10000,
    ];

    let bestInterval = intervals[intervals.length - 1];
    for (const interval of intervals) {
      if (targetWorldUnitsPerTick <= interval) {
        bestInterval = interval;
        break;
      }
    }

    let currentIndex = intervals.indexOf(bestInterval);
    while (
      bestInterval * scale < minPixelSpacingAny &&
      currentIndex < intervals.length - 1
    ) {
      currentIndex++;
      bestInterval = intervals[currentIndex];
    }
    return bestInterval;
  }

  private getPrecision(interval: number): number {
    if (!Number.isFinite(interval) || interval === 0) return 0;
    const s = interval.toString();
    const dotIndex = s.indexOf('.');
    if (dotIndex === -1) {
      const eIndex = s.toLowerCase().indexOf('e');
      return eIndex > 0 ? Math.max(0, -parseInt(s.slice(eIndex + 1), 10)) : 0;
    } else {
      const eIndex = s.toLowerCase().indexOf('e');
      if (eIndex > 0) {
        const exponent = parseInt(s.slice(eIndex + 1), 10);
        const fractionalPart = s.slice(dotIndex + 1, eIndex);
        return Math.max(0, fractionalPart.length - exponent);
      } else {
        let fractionalPart = s.slice(dotIndex + 1);
        while (fractionalPart.endsWith('0')) {
          fractionalPart = fractionalPart.slice(0, -1);
        }
        return fractionalPart.length;
      }
    }
  }

  public destroy(): void {
    this.horizontalRulerShape?.destroy();
    this.verticalRulerShape?.destroy();
    this.rulerParams = null;
    // @ts-ignore
    this.horizontalRulerShape = null;
    // @ts-ignore
    this.verticalRulerShape = null;
    // @ts-ignore
    this.mainStage = null; // Remove reference
    // @ts-ignore
    this.hudLayer = null;
    // @ts-ignore
    this.hudStage = null;
  }
}
