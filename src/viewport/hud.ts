import Konva from 'konva';
import Viewport from './viewport';
import { Ruler } from './hud/Ruler';
import { FpsCounter } from './hud/FpsCounter';

class Hud {
  private readonly hudStage: Konva.Stage;
  private readonly hudLayer: Konva.Layer;
  private readonly fpsLayer: Konva.Layer;
  private readonly viewportManager: Viewport;
  private readonly hudContainer: HTMLDivElement;
  private mainStage: Konva.Stage | null;
  private resizeObserver: ResizeObserver | null = null;

  private ruler: Ruler | null = null;
  private fpsCounter: FpsCounter | null = null;

  private readonly mainStageEventNs = '.hudManagerUpdate';

  constructor(
    hudContainerElement: HTMLDivElement,
    viewportManagerInstance: Viewport
  ) {
    this.hudContainer = hudContainerElement;
    this.viewportManager = viewportManagerInstance;
    this.mainStage = this.viewportManager.getStage();

    if (!this.mainStage) {
      throw new Error('Hud requires a Viewport with an initialized stage.');
    }

    const initialWidth = this.hudContainer.clientWidth;
    const initialHeight = this.hudContainer.clientHeight;

    this.hudStage = new Konva.Stage({
      container: this.hudContainer,
      width: initialWidth,
      height: initialHeight,
      listening: false,
    });

    // layer for less frequently updated elements like rulers
    this.hudLayer = new Konva.Layer({
      perfectDrawEnabled: false,
      listening: false,
    });
    this.hudStage.add(this.hudLayer);

    // dedicated layer for frequently updated FPS counter
    this.fpsLayer = new Konva.Layer({
      perfectDrawEnabled: false,
      listening: false,
    });
    this.hudStage.add(this.fpsLayer);

    this.ruler = new Ruler(this.viewportManager, this.hudLayer, this.hudStage);
    this.fpsCounter = new FpsCounter(this.fpsLayer, this.hudStage);

    this.setupResizeHandling(this.hudContainer);
    this.setupMainStageListeners();
  }

  private setupResizeHandling(container: HTMLDivElement): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.handleResize(container);
    });
    this.resizeObserver.observe(container);
  }

  private setupMainStageListeners(): void {
    if (!this.mainStage) return;

    const redrawEvents = `dragend${this.mainStageEventNs} redrawAll${this.mainStageEventNs} zoomend${this.mainStageEventNs}`;
    this.mainStage.on(redrawEvents, () => {
      this.ruler?.update();
    });

    const updateEvents = `dragmove${this.mainStageEventNs} zoomed${this.mainStageEventNs}`;
    //const updateEvents = `zoomed${this.mainStageEventNs}`;
    this.mainStage.on(updateEvents, () => {
      this.ruler?.update();
    });

    const testEvents = `dragstart${this.mainStageEventNs}`;
    this.mainStage.on(testEvents, () => {
      //this.ruler?.update();
      console.log('test');
    });
  }

  private handleResize(container: HTMLDivElement): void {
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;
    this.hudStage.width(newWidth);
    this.hudStage.height(newHeight);

    this.ruler?.resize(newWidth, newHeight);
    this.fpsCounter?.resize(newWidth, newHeight);

    this.hudLayer.batchDraw();
  }

  public getHudStage(): Konva.Stage {
    return this.hudStage;
  }

  public getHudLayer(): Konva.Layer {
    return this.hudLayer;
  }

  public getFpsLayer(): Konva.Layer {
    return this.fpsLayer;
  }

  public destroy(): void {
    this.resizeObserver?.disconnect();

    this.mainStage?.off(this.mainStageEventNs);

    this.ruler?.destroy();
    this.fpsCounter?.destroy();
    this.hudStage.destroy();

    this.mainStage = null;
    this.resizeObserver = null;
    this.ruler = null;
    this.fpsCounter = null;
  }
}

export default Hud;
