import Konva from 'konva';
//import { IRect } from 'konva/lib/types';
import gsap from 'gsap';
import LayerManager from './LayerManager';
import Grid from './Grid';
import { ref } from 'vue';

class StageManager {
  private stage: Konva.Stage | null = null;
  private layerManager: LayerManager;
  private zoomSpeed = 0.16;
  private maxZoom = 45_000;
  private minZoom = 0.002;
  // @ts-expect-error
  private grid: Grid | null = null;

  public readonly pointerPositionRef = ref({ x: 0, y: 0 });

  constructor(container: HTMLDivElement) {
    /*  this.stage = new Konva.Stage({
       container: container,
       width: container.clientWidth,
       height: container.clientHeight,
       draggable: false,
     }); */
    this.stage = new Konva.Stage({
      container: container,
      width: window.innerWidth,
      height: window.innerHeight,
      draggable: false,
    });

    // Center the canvas at (0, 0)
    this.stage.position({
      x: container.clientWidth / 2,
      y: container.clientHeight / 2,
    });

    this.layerManager = new LayerManager(this.stage);
  }

  public emitRedraw() {
    if (!this.stage) return;
    this.stage.fire('redraw');
  }

  getStage(): Konva.Stage | null {
    return this.stage;
  }

  getLayerManager(): LayerManager {
    return this.layerManager;
  }

  addGrid() {
    if (!this.stage || !this.layerManager) return;
    this.grid = new Grid(this.getLayerManager().staticLayer, this.stage);
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
      console.log(this.pointerPositionRef.value);
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

    this.stage.scale({ x: newScale, y: newScale });
    console.log(this.stage.scaleX());

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    this.stage.position(newPos);

    this.updateLineThickness();
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

    console.log(box);
    console.log(newPos);

    gsap.to(this.stage, {
      scaleX: newScale,
      scaleY: newScale,
      x: newPos.x,
      y: newPos.y,
      duration: 0.3,
      ease: 'power2.inOut',
      onComplete: () => {
        this.updateLineThickness();
        this.emitRedraw();
      },
    });

    this.updateLineThickness();
  }

  private updateLineThickness() {
    if (!this.stage) return;
    const scale = this.stage.scaleX();
    const layers = [
      this.getLayerManager()
        .geometryLayer /* this.getLayerManager().forcesLayer, this.getLayerManager().resultsLayer */,
    ];
    layers.forEach((layer) => {
      if (!layer) return;
      layer.getChildren().forEach((shape) => {
        if (shape instanceof Konva.Line) {
          shape.strokeWidth(2 / scale);
        }
      });
      layer.batchDraw();
    });
  }
}

export default StageManager;
