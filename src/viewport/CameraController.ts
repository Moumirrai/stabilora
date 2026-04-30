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
      minZoom: config.minZoom ?? 0.002,
      maxZoom: config.maxZoom ?? 1000,
      zoomSpeed: config.zoomSpeed ?? 0.25,
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
    // start loop in case initial position needs smoothing
    this.startAnimationLoop();
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

  private auxClickHandler = (e: MouseEvent) => {
    if (e.button === 1 && e.detail === 2) {
      this.zoomToRect(
        0,
        0,
        this.canvas.width,
        this.canvas.height,
        this.canvas.width,
        this.canvas.height
      );
    }
  };

  private setupEvents(): void {
    // prevent default context menu to allow custom right click logic

    this.canvas.addEventListener('auxclick', this.auxClickHandler);

    this.canvas.addEventListener(
      'pointerdown',
      this.onPointerDown as EventListener
    );

    window.addEventListener('pointermove', this.onPointerMove as EventListener);
    window.addEventListener('pointerup', this.onPointerUp as EventListener);
    this.canvas.addEventListener('wheel', this.onWheel as EventListener, {
      passive: false,
    });
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.canvas.removeEventListener('auxclick', this.auxClickHandler);
    this.canvas.removeEventListener(
      'pointerdown',
      this.onPointerDown as EventListener
    );
    window.removeEventListener(
      'pointermove',
      this.onPointerMove as EventListener
    );
    window.removeEventListener('pointerup', this.onPointerUp as EventListener);
    this.canvas.removeEventListener('wheel', this.onWheel as EventListener);
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

  private onPointerDown = (e: PointerEvent): void => {
    // middle mouse button (1) panning
    if (this.config.panEnabled && e.button === 1) {
      e.preventDefault();
      this.isPanning = true;
      this.lastPanPosition = { x: e.clientX, y: e.clientY };
      this.canvas.style.cursor = 'grabbing';
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
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

      //this.startAnimationLoop();
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (this.isPanning && e.button === 1) {
      this.isPanning = false;
      this.canvas.style.cursor = 'default';
    }
  };

  private onWheel = (e: WheelEvent): void => {
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
    let scaleDelta = this.config.zoomSpeed;
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
  public zoomToRect(
    x: number,
    y: number,
    width: number,
    height: number,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    const scaleX = canvasWidth / width;
    const scaleY = canvasHeight / height;
    let newScale = Math.min(scaleX, scaleY);

    // clamp zoom
    newScale = Math.max(
      this.config.minZoom,
      Math.min(newScale, this.config.maxZoom)
    );

    const boxCenterX = x + width / 2;
    const boxCenterY = y + height / 2;

    const canvasCenterX = canvasWidth / 2;
    const canvasCenterY = canvasHeight / 2;

    this.targetScale = newScale;
    this.targetPosition = {
      x: canvasCenterX - boxCenterX * newScale,
      y: canvasCenterY - boxCenterY * newScale,
    };

    this.startAnimationLoop();
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
    this.targetPosition.x += dx;
    this.targetPosition.y += dy;
    if (instant) {
      this.worldContainer.position.x += dx;
      this.worldContainer.position.y += dy;
      this.onUpdate.emit(this.getState());
    } else {
      this.startAnimationLoop();
    }
  }

  public panTo(x: number, y: number, instant: boolean = false): void {
    if (instant) {
      this.worldContainer.position.set(x, y);
      this.onUpdate.emit(this.getState());
    } else {
      this.targetPosition.x = x;
      this.targetPosition.y = y;
      this.startAnimationLoop();
    }
  }
}
