import Konva from 'konva';
import LayerManager from './LayerManager';
import Grid from './background/SquareGrid';
import DotGrid from './background/DotGrid';
import Ruler from './Ruler';
import { ref } from 'vue';

class StageManager {
  private stage: Konva.Stage | null = null;
  public layerManager: LayerManager;
  private ruler: Ruler | null = null;
  private zoomSpeed = 0.36;
  private maxZoom = 45_000;
  private minZoom = 0.002;
  // @ts-expect-error
  private grid: Grid | DotGrid | null = null;

  private resizeObserver: ResizeObserver | null = null;

  public readonly pointerPositionRef = ref({ x: 0, y: 0 });

  constructor(container: HTMLDivElement) {
    this.stage = new Konva.Stage({
      container: container,
      width: window.innerWidth,
      height: window.innerHeight,
      draggable: false,
    });

    // center the canvas at (0, 0)
    this.stage.position({
      x: container.clientWidth / 2,
      y: container.clientHeight / 2,
    });

    this.layerManager = new LayerManager(this.stage);

    this.initUILayer();
    this.addUIComponents();

    this.setupResizeHandling(container);
  }

  private setupResizeHandling(container: HTMLDivElement) {
    this.cleanup();
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === container) {
          this.handleResize(container);
        }
      }
    });

    this.resizeObserver.observe(container);

    // fallback
    //window.addEventListener('resize', () => this.handleResize(container));
  }

  private addUIComponents() {
    if (!this.stage || !this.layerManager.uiLayer) return;
    this.ruler = new Ruler(this.layerManager.uiLayer, this.stage);
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

  public emitRedraw() {
    if (!this.stage) return;
    this.stage.fire('redraw');
  }

  public emitRedrawAll() {
    if (!this.stage) return;
    this.stage.fire('redrawAll');
  }

  private initUILayer() {
    if (!this.stage) return;

    // Function to update UI layer position and scale to counter stage transformations
    const updateUILayer = () => {
      if (!this.layerManager.uiLayer || !this.stage) return;

      // Apply inverse transformation to cancel out stage transforms
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

    // Update UI layer on any stage transformation
    this.stage.on('dragmove', updateUILayer);
    this.stage.on('dragend', updateUILayer);
    this.stage.on('redraw', updateUILayer);
    this.stage.on('redrawAll', updateUILayer);

    // Initial update
    updateUILayer();
  }

  public cleanup() {
    // Clean up event listeners when component is destroyed
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    window.removeEventListener('resize', () => this.handleResize);
  }

  getStage(): Konva.Stage | null {
    return this.stage;
  }

  getLayerManager(): LayerManager {
    return this.layerManager;
  }

  addGrid() {
    if (!this.stage || !this.layerManager) return;
    //this.grid = new Grid(this.getLayerManager().baseLayer, this.stage);
    this.grid = new DotGrid(this.getLayerManager().baseLayer, this.stage);
  }

  setupEventHandlers() {
    if (!this.stage) return;

    this.stage.on('mousedown', (e) => {
      if (e.evt.button === 1) {
        e.evt.preventDefault();
        this.stage?.draggable(true);
        this.stage?.startDrag();
      }
    });

    this.stage.on('mouseup', (e) => {
      if (e.evt.button === 1) {
        this.stage?.draggable(false);
      }
    });

    this.stage.on('mousemove', (_) => {
      this.handleCursorPos();
    });

    this.stage.on('wheel', (e) => {
      e.evt.preventDefault();
      this.handleZoom(e);
    });

    this.stage.on('dblclick', (e) => {
      if (e.evt.button === 1) {
        this.handleDoubleClick();
      }
    });
  }

  private handleCursorPos() {
    if (!this.stage) return;
    const pointer = this.stage.getPointerPosition();
    if (pointer) {
      const scale = this.stage.scaleX();
      const stagePos = this.stage.position();
      this.pointerPositionRef.value = {
        x: (pointer.x - stagePos.x) / scale,
        y: (pointer.y - stagePos.y) / scale,
      };
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

    const scaleBy = 1 + this.zoomSpeed;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

    if (newScale < this.minZoom || newScale > this.maxZoom) {
      return;
    }

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    const tween = new Konva.Tween({
      node: this.stage, // or your layer
      scaleX: newScale,
      scaleY: newScale,
      x: newPos.x,
      y: newPos.y,
      duration: 0.1, // in seconds
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

  private handleDoubleClick() {
    if (!this.stage) return;

    const layer = this.layerManager.geometryLayer;
    if (!layer) return;

    const box = layer.getClientRect({ relativeTo: this.stage });

    if (box.x === 0 && box.y === 0 && box.width === 0 && box.height === 0) {
      box.width = 1000;
      box.height = 1000;
    }

    const scaleX = this.stage.width() / box.width;
    const scaleY = this.stage.height() / box.height;
    const newScale = Math.min(scaleX, scaleY);

    const newPos = {
      x: -box.x * newScale,
      y: -box.y * newScale,
    };

    // Replace GSAP with Konva's animation
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

}

export default StageManager;
