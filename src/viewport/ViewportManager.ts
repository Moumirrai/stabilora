import Konva from 'konva';
import LayerManager from './LayerManager';
import type { IRect } from 'konva/lib/types';

export interface StageManagerConfig {
  zoomEnabled?: boolean;
  minZoom?: number;
  maxZoom?: number;
  zoomSpeed?: number;
  zoomDuration?: number; // Duration for zoom animation
  panEnabled?: boolean; // Middle mouse button panning
  initialPosition?: { x: number; y: number };
  initialScale?: number;
}

class ViewportManager {
  private stage: Konva.Stage | null = null;
  public layerManager: LayerManager;
  private resizeObserver: ResizeObserver | null = null;
  private config: Required<StageManagerConfig>;
  private zoomTween: Konva.Tween | null = null;
  private zooming: boolean = false; // Flag to indicate if zooming is in progress

  // namespaces for event listeners
  private readonly eventNs = '.stageManagerEvents';
  private readonly uiEventNs = '.uiLayerUpdate';

  constructor(container: HTMLDivElement, initialConfig: StageManagerConfig = {}) {

    this.config = {
      zoomEnabled: initialConfig.zoomEnabled ?? true,
      minZoom: initialConfig.minZoom ?? 0.002,
      maxZoom: initialConfig.maxZoom ?? 1_000,
      zoomSpeed: initialConfig.zoomSpeed ?? 0.46,
      zoomDuration: initialConfig.zoomDuration ?? 0.1,
      panEnabled: initialConfig.panEnabled ?? true,
      initialPosition: initialConfig.initialPosition ?? { x: container.clientWidth / 2, y: container.clientHeight / 2 },
      initialScale: initialConfig.initialScale ?? 1,
    };


    this.stage = new Konva.Stage({
      container: container,
      width: container.clientWidth,
      height: container.clientHeight,
      draggable: false,
    });

    this.layerManager = new LayerManager(this.stage);
    //this.selectionManager = new SelectionManager(this.layerManager.geometryLayer, this.layerManager.uiLayer, this);

    this.stage.scale({ x: this.config.initialScale, y: this.config.initialScale });
    this.stage.position(this.config.initialPosition);

    this.setupResizeHandling(container);

    this.setupEventHandlers();

    this.emitRedrawAll();
  }

  public destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    window.removeEventListener('resize', () => this.handleResize);
    if (this.stage) {
      this.stage.off(this.eventNs);
      this.stage.off(this.uiEventNs);
      this.stage.destroy();
      this.stage = null;
    }
  }

  public zoomToRect(box: IRect, animationDuration: number = 0.3) {
    if (!this.stage) return;

    const stageWidth = this.stage.width();
    const stageHeight = this.stage.height();

    const scaleX = stageWidth / box.width;
    const scaleY = stageHeight / box.height;
    const newScale = Math.min(scaleX, scaleY);

    if (newScale < this.config.minZoom || newScale > this.config.maxZoom) {
      console.warn("Target scale is out of bounds");
      return;
    }

    const boxCenterX = box.x + box.width / 2;
    const boxCenterY = box.y + box.height / 2;

    const stageCenterX = stageWidth / 2;
    const stageCenterY = stageHeight / 2;

    const newPos = {
      x: stageCenterX - boxCenterX * newScale,
      y: stageCenterY - boxCenterY * newScale,
    };

    if (animationDuration <= 0) {
      this.stage.position(newPos);
      this.stage.scale({ x: newScale, y: newScale });
      this.emitRedrawAll();
      return;
    }

    const tween = new Konva.Tween({
      node: this.stage,
      duration: animationDuration,
      easing: Konva.Easings.EaseInOut,
      scaleX: newScale,
      scaleY: newScale,
      x: newPos.x,
      y: newPos.y,
      onUpdate: () => {
        this.emitRedraw();
        this.stage?.fire('zoomend');
      },
      onFinish: () => {
        // Only trigger full redraw once animation is complete
        this.emitRedrawAll();
        this.emitZoomed();
        this.stage?.fire('zoomed');
      }
    });

    tween.play();
  }

  public setPanEnabled(enabled: boolean): void {
    if (this.config.panEnabled === enabled) return;
    this.config.panEnabled = enabled;
    if (!enabled && this.stage?.isDragging()) {
      this.stage.stopDrag(); // Stop dragging if disabling pan while dragging
      this.stage.draggable(false);
    }
    this.setupEventHandlers(); // Re-apply event handlers
  }

  public setZoomEnabled(enabled: boolean): void {
    if (this.config.zoomEnabled === enabled) return;
    this.config.zoomEnabled = enabled;
    this.setupEventHandlers(); // Re-apply event handlers
  }

  public setZoomSpeed(speed: number): void {
    if (speed > 0) {
      this.config.zoomSpeed = speed;
    }
  }

  public setMinZoom(minZoom: number): void {
    if (minZoom > 0 && minZoom <= this.config.maxZoom) {
      this.config.minZoom = minZoom;
      // Optionally clamp current zoom if it's now below the new min
      if (this.stage && this.stage.scaleX() < minZoom) {
        this.stage.scale({ x: minZoom, y: minZoom });
        this.emitRedrawAll();
      }
    }
  }

  public setMaxZoom(maxZoom: number): void {
    if (maxZoom > 0 && maxZoom >= this.config.minZoom) {
      this.config.maxZoom = maxZoom;
      // Optionally clamp current zoom if it's now above the new max
      if (this.stage && this.stage.scaleX() > maxZoom) {
        this.stage.scale({ x: maxZoom, y: maxZoom });
        this.emitRedrawAll();
      }
    }
  }

  public setZoomDuration(duration: number): void {
    if (duration >= 0) {
      this.config.zoomDuration = duration;
    }
  }

  public emitRedraw() {
    if (!this.stage) return;
    this.stage.fire('redraw');
  }

  public emitRedrawAll() {
    if (!this.stage) return;
    this.stage.fire('redrawAll');
  }

  public emitZoomed() {
    if (!this.stage) return;
    this.stage.fire('zoomed');
  }

  public emitPanned() {
    if (!this.stage) return;
    this.stage.fire('panned');
  }

  private setupResizeHandling(container: HTMLDivElement) {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === container) {
          this.handleResize(container);
        }
      }
    });

    this.resizeObserver.observe(container);
  }

  private handleResize(container: HTMLDivElement) {
    if (!this.stage) return;

    // Store current viewport center in world coordinates
    const oldWidth = this.stage.width();
    const oldHeight = this.stage.height();
    const oldScale = this.stage.scaleX();
    const oldPosition = this.stage.position();

    // Calculate current center point in world coordinates
    const centerX = (oldWidth / 2 - oldPosition.x) / oldScale;
    const centerY = (oldHeight / 2 - oldPosition.y) / oldScale;

    // Update stage size to match container
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;
    this.stage.width(newWidth);
    this.stage.height(newHeight);

    // Calculate new position to maintain the same center point
    const newPositionX = newWidth / 2 - centerX * oldScale;
    const newPositionY = newHeight / 2 - centerY * oldScale;
    this.stage.position({
      x: newPositionX,
      y: newPositionY
    });

    // Redraw everything
    this.emitRedrawAll();
  }

  getViewportRect(): IRect {
    const stage = this.stage;
    if (!stage) {
      throw new Error("Stage is not initialized");
    }
    const scale = stage.scaleX(); // assume uniform scaling
    const position = stage.position(); // stage's top-left position relative to the container
    const width = stage.width();
    const height = stage.height();

    return {
      x: -position.x / scale,
      y: -position.y / scale,
      width: width / scale,
      height: height / scale
    };
  }

  getStage(): Konva.Stage | null {
    return this.stage;
  }

  getLayerManager(): LayerManager {
    return this.layerManager;
  }

  private setupEventHandlers(): void {
    if (!this.stage) return;

    // --- Clear existing listeners first ---
    this.stage.off(this.eventNs);
    // ---

    // --- Panning ---
    if (this.config.panEnabled) {
      this.stage.on(`mousedown${this.eventNs}`, (e) => {
        if (e.evt.button === 1) {
          e.evt.preventDefault();
          this.stage?.draggable(true);
        }
      });
      this.stage.on(`mouseup${this.eventNs}`, (e) => {
        if (e.evt.button === 1) {
          if (this.stage?.isDragging()) this.emitRedrawAll();
          this.stage?.draggable(false);
        }
      });
      this.stage.on(`mouseleave${this.eventNs}`, (e) => {
        if (this.stage?.isDragging()) {
          this.emitRedrawAll();
          this.stage?.draggable(false);
        }
      });
    } else {
      // Ensure draggable is false if pan is disabled
      this.stage.draggable(false);
    }

    // --- Zooming ---
    if (this.config.zoomEnabled) {
      this.stage.on(`wheel${this.eventNs}`, (e) => {
        e.evt.preventDefault();
        this.handleZoom(e);
      });
    }
  }

  private handleZoom(e: any) {
    if (!this.stage) return;

    if (this.zoomTween && this.zooming) {
      this.zoomTween.finish();
      this.zoomTween = null;
      this.zooming = false;
    }

    const oldScale = this.stage.scaleX()
    const pointer = this.stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - this.stage.x()) / oldScale,
      y: (pointer.y - this.stage.y()) / oldScale,
    };

    let direction = e.evt.deltaY > 0 ? -1 : 1;

    let scaleDelta = this.config.zoomSpeed
    if (e.evt.ctrlKey) {
      scaleDelta *= 0.3;
    }

    let scaleBy = 1 + scaleDelta;


    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

    if (newScale < this.config.minZoom || newScale > this.config.maxZoom) {
      return;
    }

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    this.zoomTween = new Konva.Tween({
      node: this.stage,
      scaleX: newScale,
      scaleY: newScale,
      x: newPos.x,
      y: newPos.y,
      duration: this.config.zoomDuration,
      easing: Konva.Easings.EaseOut,
      onUpdate: () => {
        this.emitRedraw();
        this.emitZoomed();
      },
      onFinish: () => {
        this.emitRedrawAll();
        this.emitZoomed();
        this.stage?.fire('zoomend');
        this.zooming = false;
      }
    });

    this.zooming = true;

    this.zoomTween.play();
  }
}

export default ViewportManager;