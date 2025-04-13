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

class StageManager {
  private stage: Konva.Stage | null = null;
  public layerManager: LayerManager;
  private resizeObserver: ResizeObserver | null = null;
  private config: Required<StageManagerConfig>;

  // namespaces for event listeners
  private readonly eventNs = '.stageManagerEvents';
  private readonly uiEventNs = '.uiLayerUpdate';

  constructor(container: HTMLDivElement, initialConfig: StageManagerConfig = {}) {

    this.config = {
      zoomEnabled: initialConfig.zoomEnabled ?? true,
      minZoom: initialConfig.minZoom ?? 0.002,
      maxZoom: initialConfig.maxZoom ?? 45_000,
      zoomSpeed: initialConfig.zoomSpeed ?? 0.36,
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

    this.stage.scale({ x: this.config.initialScale, y: this.config.initialScale });
    this.stage.position(this.config.initialPosition);

    this.initUILayer();
    this.setupResizeHandling(container);

    this.setupEventHandlers();

    this.emitRedrawAll();
  }

  public destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    window.removeEventListener('resize', () => this.handleResize);
    if (this.stage) {
      this.stage.off('mousedown');
      this.stage.off('mouseup');
      this.stage.off('wheel');
      this.stage.off('dragmove');
      this.stage.off('dragend');
      this.stage.off('redraw');
      this.stage.off('redrawAll');
      this.stage.destroy();
    }
  }

  public zoomToRect(box: IRect, animationDuration = 0.3) {
    if (!this.stage) return;

    const scaleX = this.stage.width() / box.width;
    const scaleY = this.stage.height() / box.height;
    const newScale = Math.min(scaleX, scaleY);

    if (newScale < this.config.minZoom || newScale > this.config.maxZoom) {
      console.warn("Target scale is out of bounds");
      return;
    }

    const newPos = {
      x: -box.x * newScale,
      y: -box.y * newScale,
    };

    if (animationDuration <= 0) {
      this.stage.position(newPos);
      this.stage.scale({ x: newScale, y: newScale });
      this.emitRedrawAll();
      return;
    }

    const tween = new Konva.Tween({
      node: this.stage,
      duration: 0.3,
      easing: Konva.Easings.EaseInOut,
      scaleX: newScale,
      scaleY: newScale,
      x: newPos.x,
      y: newPos.y,
      onUpdate: () => {
        this.emitRedraw();
      },
      onFinish: () => {
        // Only trigger full redraw once animation is complete
        this.emitRedrawAll();
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

  private initUILayer(): void {
    if (!this.stage) return;
    const updateUILayer = () => {
      if (!this.layerManager.uiLayer || !this.stage) return;
      const scale = 1 / this.stage.scaleX();
      const stagePos = this.stage.position();
      this.layerManager.uiLayer.scale({ x: scale, y: scale });
      this.layerManager.uiLayer.position({
        x: -stagePos.x * scale,
        y: -stagePos.y * scale
      });
      this.layerManager.uiLayer.moveToTop();
      this.layerManager.uiLayer.batchDraw();
    };
    this.stage.off(this.uiEventNs);
    this.stage.on(`dragmove${this.uiEventNs} redraw${this.uiEventNs} redrawAll${this.uiEventNs}`, updateUILayer);
    updateUILayer();
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

    const oldScale = this.stage.scaleX();
    const pointer = this.stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - this.stage.x()) / oldScale,
      y: (pointer.y - this.stage.y()) / oldScale,
    };

    let direction = e.evt.deltaY > 0 ? -1 : 1;
    if (e.evt.ctrlKey) {
      direction = -direction;
    }

    const scaleBy = 1 + this.config.zoomSpeed;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

    if (newScale < this.config.minZoom || newScale > this.config.maxZoom) {
      return;
    }

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    const tween = new Konva.Tween({
      node: this.stage,
      scaleX: newScale,
      scaleY: newScale,
      x: newPos.x,
      y: newPos.y,
      duration: 0.1,
      easing: Konva.Easings.EaseOut,
      onUpdate: () => {
        this.emitRedraw();
      },
      onFinish: () => {
        this.emitRedrawAll();
      }
    });

    tween.play();
  }
}

export default StageManager;