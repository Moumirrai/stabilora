import { Container } from 'pixi.js';
import { CameraUniforms } from './rendering/primitives/CameraUniforms';
import { EventEmitter } from '../utils/EventEmitter';

export interface CameraConfig {
  minZoom?: number;
  maxZoom?: number;
  zoomSpeed?: number;
  panEnabled?: boolean;
  zoomEnabled?: boolean;
}

type BBox = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

type ZoomOpts = {
  instant?: boolean;
  marginPercent?: number;
};

export type CameraState = {
  scale: number;
  position: { x: number; y: number };
};

export class CameraController {
  private worldContainer: Container;
  private canvas: HTMLCanvasElement;

  public targetScale: number = 1;
  public targetPosition = { x: 0, y: 0 };

  public config: Required<CameraConfig>;

  private isPanning = false;
  private lastPanPosition = { x: 0, y: 0 };
  private lerpFactor = 0.4; // smoothing factor for zoom

  private animationFrameId: number | null = null;

  public onUpdate = new EventEmitter<CameraState>();
  public cameraUniforms = new CameraUniforms();

  constructor(
    worldContainer: Container,
    canvas: HTMLCanvasElement,
    config: CameraConfig = {}
  ) {
    this.worldContainer = worldContainer;
    this.canvas = canvas;

    this.config = {
      minZoom: config.minZoom ?? 0.001,
      maxZoom: config.maxZoom ?? 200,
      zoomSpeed: config.zoomSpeed ?? 1,
      panEnabled: config.panEnabled ?? true,
      zoomEnabled: config.zoomEnabled ?? true,
    };

    const scale = this.worldContainer.scale.x;
    const position = this.worldContainer.position;

    this.cameraUniforms.uniforms.uCameraScale = scale;
    this.cameraUniforms.uniforms.uCameraPosition = [position.x, position.y];
    this.targetScale = scale;
    this.targetPosition = {
      x: position.x,
      y: position.y,
    };

    this.setupEvents();
  }

  private startAnimationLoop(): void {
    if (this.animationFrameId === null) {
      this.animationFrameId = requestAnimationFrame(this.update);
    }
  }

  public getState(): CameraState {
    const pos = this.worldContainer.position;
    return {
      scale: this.worldContainer.scale.x,
      position: { x: pos.x, y: pos.y },
    };
  }

  private setupEvents(): void {
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('wheel', this.handleWheel);
    if (this.isPanning) {
      window.removeEventListener(
        'pointermove',
        this.handlePointerMove as EventListener
      );
      window.removeEventListener(
        'pointerup',
        this.handlePointerUp as EventListener
      );
      this.isPanning = false;
    }
  }

  private update = (): void => {
    // clear the ID so we can request a new frame if needed
    this.animationFrameId = null;

    const currentScale = this.worldContainer.scale.x;
    const currentPos = this.worldContainer.position;

    // fast escape if we are already at the target
    const diffScale = Math.abs(this.targetScale - currentScale);
    const diffX = Math.abs(this.targetPosition.x - currentPos.x);
    const diffY = Math.abs(this.targetPosition.y - currentPos.y);

    if (diffScale < 0.0001 && diffX < 0.1 && diffY < 0.1) {
      // snap to exact position
      if (diffScale > 0 || diffX > 0 || diffY > 0) {
        this.worldContainer.scale.set(this.targetScale);
        this.worldContainer.position.set(
          this.targetPosition.x,
          this.targetPosition.y
        );
        this.cameraUniforms.uniforms.uCameraScale = this.targetScale;
        this.cameraUniforms.uniforms.uCameraPosition = [
          this.targetPosition.x,
          this.targetPosition.y,
        ];
        this.onUpdate.emit(this.getState());
      }
      return; // stop requesting frames
    }

    // lerp towards target position
    const nextScale =
      currentScale + (this.targetScale - currentScale) * this.lerpFactor;
    const nextX =
      currentPos.x + (this.targetPosition.x - currentPos.x) * this.lerpFactor;
    const nextY =
      currentPos.y + (this.targetPosition.y - currentPos.y) * this.lerpFactor;

    this.worldContainer.scale.set(nextScale);
    this.worldContainer.position.set(nextX, nextY);
    this.cameraUniforms.uniforms.uCameraScale = nextScale;
    this.cameraUniforms.uniforms.uCameraPosition = [nextX, nextY];

    this.onUpdate.emit(this.getState());

    // request next frame to continue animation
    this.animationFrameId = requestAnimationFrame(this.update);
  };

  public handlePointerDown = (e: PointerEvent): void => {
    if (this.config.panEnabled && e.button === 1) {
      e.preventDefault();
      this.isPanning = true;
      this.lastPanPosition = { x: e.clientX, y: e.clientY };
      this.canvas.style.cursor = 'grabbing';
      window.addEventListener(
        'pointermove',
        this.handlePointerMove as EventListener
      );
      window.addEventListener(
        'pointerup',
        this.handlePointerUp as EventListener
      );
    }
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (this.isPanning) {
      const dx = e.clientX - this.lastPanPosition.x;
      const dy = e.clientY - this.lastPanPosition.y;

      this.targetPosition.x += dx;
      this.targetPosition.y += dy;

      // apply immediately for responsive panning (bypasses lerp delay for panning)
      this.worldContainer.position.x += dx;
      this.worldContainer.position.y += dy;

      this.cameraUniforms.uniforms.uCameraPosition = [
        this.targetPosition.x,
        this.targetPosition.y,
      ];

      this.lastPanPosition = { x: e.clientX, y: e.clientY };
      this.onUpdate.emit(this.getState());
    }
  };

  private handlePointerUp = (e: PointerEvent): void => {
    if (this.isPanning && e.button === 1) {
      this.isPanning = false;
      this.canvas.style.cursor = 'default';
      window.removeEventListener(
        'pointermove',
        this.handlePointerMove as EventListener
      );
      window.removeEventListener(
        'pointerup',
        this.handlePointerUp as EventListener
      );
    }
  };

  public handleWheel = (e: WheelEvent): void => {
    if (!this.config.zoomEnabled) return;
    e.preventDefault();

    const oldScale = this.targetScale;

    // get pointer position relative to canvas
    const rect = this.canvas.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

    // convert to world coordinates
    const mousePointTo = {
      x: (pointerX - this.targetPosition.x) / oldScale,
      y: (pointerY - this.targetPosition.y) / oldScale,
    };

    // calculate new scale
    const direction = e.deltaY > 0 ? -1 : 1;
    let scaleDelta = Math.abs(e.deltaY) * this.config.zoomSpeed * 0.002;

    if (e.ctrlKey) scaleDelta *= 0.3; // finer zoom with ctrl

    const scaleBy = 1 + scaleDelta;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

    // clamp zoom
    if (newScale < this.config.minZoom || newScale > this.config.maxZoom) {
      return;
    }

    // adjust target position so the cursor remains over the same world point
    this.targetScale = newScale;
    this.targetPosition = {
      x: pointerX - mousePointTo.x * newScale,
      y: pointerY - mousePointTo.y * newScale,
    };

    this.startAnimationLoop();
  };

  /**
   * zooms to a specific rectangular area in world coordinates
   */

  public zoomToRect(bbox: BBox, opts?: ZoomOpts): void {
    const canvasWidth = this.canvas.clientWidth;
    const canvasHeight = this.canvas.clientHeight;

    const margin = opts?.marginPercent ?? 0;

    if (margin !== 0) {
      const width = bbox.maxX - bbox.minX;
      const height = bbox.maxY - bbox.minY;
      const b = structuredClone(bbox);
      bbox.minX = b.minX - width * margin;
      bbox.minY = b.minY - height * margin;
      bbox.maxX = b.maxX + width * margin;
      bbox.maxY = b.maxY + height * margin;
    }

    const width = Math.max(bbox.maxX - bbox.minX, 1);
    const height = Math.max(bbox.maxY - bbox.minY, 1);

    const scaleX = canvasWidth / width;
    const scaleY = canvasHeight / height;
    let newScale = Math.min(scaleX, scaleY);

    newScale = Math.max(
      this.config.minZoom,
      Math.min(newScale, this.config.maxZoom)
    );

    const boxCenterX = (bbox.minX + bbox.maxX) * 0.5;
    const boxCenterY = (bbox.minY + bbox.maxY) * 0.5;

    const canvasCenterX = canvasWidth * 0.5;
    const canvasCenterY = canvasHeight * 0.5;

    this.targetScale = newScale;
    this.targetPosition = {
      x: canvasCenterX - boxCenterX * newScale,
      y: canvasCenterY - boxCenterY * newScale,
    };

    if (opts?.instant) {
      this.worldContainer.scale.set(this.targetScale, this.targetScale);
      this.worldContainer.position.set(
        this.targetPosition.x,
        this.targetPosition.y
      );
      this.cameraUniforms.uniforms.uCameraPosition = [
        this.targetPosition.x,
        this.targetPosition.y,
      ];
      this.cameraUniforms.uniforms.uCameraScale = this.targetScale;
      this.onUpdate.emit(this.getState());
    } else {
      this.startAnimationLoop();
    }
  }

  /**
   * converts screen (canvas) coordinates to world coordinates
   */
  public screenToWorld(
    screenX: number,
    screenY: number
  ): { x: number; y: number } {
    const scale = this.worldContainer.scale.x;
    const pos = this.worldContainer.position;
    return {
      x: (screenX - pos.x) / scale,
      y: (screenY - pos.y) / scale,
    };
  }
  /**
   * converts world coordinates to screen (canvas) coordinates
   */
  public worldToScreen(
    worldX: number,
    worldY: number
  ): { x: number; y: number } {
    const scale = this.worldContainer.scale.x;
    const pos = this.worldContainer.position;
    return {
      x: worldX * scale + pos.x,
      y: worldY * scale + pos.y,
    };
  }

  public panBy(dx: number, dy: number, instant: boolean = false): void {
    this.panTo(this.targetPosition.x + dx, this.targetPosition.y + dy, instant);
  }

  public panTo(x: number, y: number, instant: boolean = false): void {
    if (instant) {
      this.targetPosition.x = x;
      this.targetPosition.y = y;
      this.worldContainer.position.set(x, y);
      this.cameraUniforms.uniforms.uCameraPosition = [x, y];
      this.onUpdate.emit(this.getState());
    } else {
      this.targetPosition.x = x;
      this.targetPosition.y = y;
      this.startAnimationLoop();
    }
  }
}
