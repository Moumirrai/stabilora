import { Application, Container, Graphics } from 'pixi.js';
import { CameraController, type CameraConfig } from './CameraController';

export class ViewportEngine {
  public app: Application;

  // main world container (modelspace, grid)
  public worldContainer: Container;

  // static locked container (labels, gui)
  public screenContainer: Container;

  public camera: CameraController;

  private container: HTMLDivElement;
  //private resizeObserver: ResizeObserver;

  private constructor(
    app: Application,
    container: HTMLDivElement,
    cameraConfig?: CameraConfig
  ) {
    this.app = app;
    this.container = container;

    // setup world container (modelspace, grid)
    this.worldContainer = new Container();
    this.worldContainer.label = 'worldLayer';
    this.app.stage.addChild(this.worldContainer);

    // --- DEBUG SHAPES FOR CAMERA TESTING ---
    const originSquare = new Graphics().rect(-50, -50, 100, 100).fill(0xff0000);
    const offsetCircle = new Graphics().circle(200, 200, 50).fill(0x0000ff);
    this.worldContainer.addChild(originSquare);
    this.worldContainer.addChild(offsetCircle);
    // ---------------------------------------

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

    // camera callback event to rerender
    this.camera.onUpdate = () => {
      this.render();
    };

    // responsive resizing, uncomment when centering logic is implemented
    //this.resizeObserver = new ResizeObserver(() => this.handleResize());
    //this.resizeObserver.observe(this.container);
  }

  public render(): void {
    console.log(this.getViewportRect());
    this.app.renderer.render(this.app.stage);
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
      autoStart: false, // do not run continuous game loop, render manually reactively
    });

    container.appendChild(app.canvas);

    const engine = new ViewportEngine(app, container, cameraConfig);
    // Initial render
    engine.render();
    return engine;
  }

  private handleResize(): void {
    //TODO: implement centering
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
    /* if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    } */
    this.camera.destroy();

    // destroy the app, children, and WebGL context
    this.app.destroy(true, { children: true });
  }
}
