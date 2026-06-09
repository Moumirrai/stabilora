import { Application, Container, Graphics } from 'pixi.js';
import { CameraController, type CameraConfig } from './CameraController';
import { DotGridMesh } from './rendering/primitives/DotGridMesh';
import type { CameraState } from './CameraController';
import { ViewportUniforms } from './rendering/primitives/ViewportUniforms';

export class ViewportEngine {
  public app: Application;

  // main world container (modelspace, grid)
  public worldContainer: Container;
  // static locked container (labels, gui)
  public screenContainer: Container;

  public camera: CameraController;
  public cameraUnsubscriber: () => void;

  public grid: DotGridMesh;

  private container: HTMLDivElement;
  private resizeObserver: ResizeObserver;
  private prevWidth = 0;
  private prevHeight = 0;

  public viewportUniforms = new ViewportUniforms();

  private renderPending = false;

  private constructor(
    app: Application,
    container: HTMLDivElement,
    cameraConfig?: CameraConfig
  ) {
    this.app = app;
    this.container = container;
    this.prevWidth = this.container.clientWidth;
    this.prevHeight = this.container.clientHeight;

    // setup world container (modelspace, grid)
    this.worldContainer = new Container();
    this.worldContainer.label = 'worldLayer';
    this.app.stage.addChild(this.worldContainer);

    // setup screen container (labels, gui)
    this.screenContainer = new Container();
    this.screenContainer.label = 'screenLayer';
    this.app.stage.addChild(this.screenContainer);

    // initialize camera
    this.camera = new CameraController(
      this.worldContainer,
      this.app.canvas as HTMLCanvasElement,
      cameraConfig
    );

    this.cameraUnsubscriber = this.camera.onUpdate.subscribe(
      this.handleCameraUpdate
    );

    // --- DEBUG SHAPES FOR CAMERA TESTING ---
    const offsetCircle = new Graphics().circle(200, 200, 50).fill(0x0000ff);
    this.worldContainer.addChild(offsetCircle);

    this.grid = new DotGridMesh(
      this.camera.cameraUniforms,
      this.viewportUniforms
    );
    this.worldContainer.addChildAt(this.grid, 0);

    // Initialize uniforms
    this.viewportUniforms.uniforms.uStageSize = [
      this.app.screen.width,
      this.app.screen.height,
    ];
    this.viewportUniforms.uniforms.uResolution = this.app.renderer.resolution;

    const initialRect = this.getViewportRect();
    this.grid.position.set(initialRect.x, initialRect.y);
    this.grid.scale.set(initialRect.width, initialRect.height);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);
  }

  private handleCameraUpdate = (state: CameraState): void => {
    const rect = this.getViewportRect();
    this.grid.position.set(rect.x, rect.y);
    this.grid.scale.set(rect.width, rect.height);
    this.requestRender();
  };

  private render(): void {
    this.app.renderer.render(this.app.stage);
  }

  public requestRender(): void {
    if (this.renderPending) return;

    this.renderPending = true;
    requestAnimationFrame(() => {
      this.renderPending = false;
      this.render();
    });
  }

  /**
   * Initialize webgl context asynchronously as required by Pixi v8.
   */
  public static async create(
    container: HTMLDivElement,
    cameraConfig?: CameraConfig
  ): Promise<ViewportEngine> {
    const app = new Application();

    await app.init({
      resizeTo: container,
      backgroundAlpha: 0,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      autoStart: false, // do not run continuous game-like render loop, render manually reactively
      preference: 'webgl', // Force WebGL for GLSL shader support
    });

    container.appendChild(app.canvas);

    const engine = new ViewportEngine(app, container, cameraConfig);
    // Initial render
    engine.render();
    return engine;
  }

  private handleResize(): void {
    const oldCenterWorld = this.camera.screenToWorld(
      this.prevWidth / 2,
      this.prevHeight / 2
    );

    const newWidth = this.container.clientWidth;
    const newHeight = this.container.clientHeight;

    // Ensure PIXI renderer / app.screen reflect the new size
    this.app.renderer.resize(newWidth, newHeight);

    const currentScreen = this.camera.worldToScreen(
      oldCenterWorld.x,
      oldCenterWorld.y
    );

    const desiredScreen = { x: newWidth / 2, y: newHeight / 2 };

    const dx = desiredScreen.x - currentScreen.x;
    const dy = desiredScreen.y - currentScreen.y;

    this.camera.panBy(dx, dy, true);

    this.prevWidth = newWidth;
    this.prevHeight = newHeight;

    this.viewportUniforms.uniforms.uStageSize = [
      this.app.screen.width,
      this.app.screen.height,
    ];

    this.render();
  }

  /**
   * Get current boundaries of the visible screen mapped to world coordinates.
   */
  public getViewportRect() {
    // top-left of the screen in world coordinates
    const topLeft = this.camera.screenToWorld(0, 0);
    // bottom-right of the screen
    const bottomRight = this.camera.screenToWorld(
      this.app.screen.width,
      this.app.screen.height
    );
    return {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
    };
  }

  public destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.cameraUnsubscriber) {
      this.cameraUnsubscriber();
    }
    this.camera.destroy();

    // destroy the app, children, and WebGL context
    this.app.destroy(true, { children: true });
  }
}
