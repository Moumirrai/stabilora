import { Application, Graphics } from 'pixi.js';
import type { ApplicationOptions } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { renderSceneGraphToPixi } from './renderers/pixi/PixiRenderer';
import { renderSceneGraphToSvg, createSvgElement } from './renderers/svg/SvgRenderer';
import type { SceneGraph } from './scene/SceneGraph';
import { MyCustomPlugin } from './viewportPlugins/ZoomPlugin';
import { GridPlugin } from './viewportPlugins/GridPlugin';

export class EukliaRuntime {
  app!: Application;
  viewport!: Viewport;
  scene: SceneGraph;
  container: HTMLElement;

  constructor(scene: SceneGraph, container: HTMLElement) {
    this.scene = scene;
    this.container = container;
  }

  async init() {
    this.container.addEventListener('mousedown', (event) => {
      if (event.button === 1) { // Middle mouse button
        event.preventDefault();
      }
    });
    this.container.addEventListener('wheel', (event) => {
      event.preventDefault();
    }, { passive: false });
    const appOptions: Partial<ApplicationOptions> = {
      resizeTo: this.container,
      antialias: true,
      backgroundColor: 0x171717,
      resolution: window.devicePixelRatio || 1,
    };

    console.log(window.devicePixelRatio)

    this.app = new Application();
    await this.app.init(appOptions);
    this.container.appendChild(this.app.canvas);

    this.viewport = new Viewport({
      screenWidth: this.container.clientWidth,
      screenHeight: this.container.clientHeight,
      worldWidth: 10000,
      worldHeight: 10000,
      events: this.app.renderer.events,
    });

    this.viewport.drag({
      mouseButtons: 'middle',
    }).pinch().wheel({
      smooth: 8,
    });
    this.viewport.plugins.add('doubleClickToFit', new MyCustomPlugin(this.viewport, {
      doubleClickDelay: 300,
    }));
    this.viewport.plugins.add('grid', new GridPlugin(this.viewport, {}));
    this.app.stage.addChild(this.viewport);

    renderSceneGraphToPixi(this.scene, this.viewport);
    console.log("EukliaRuntime initialized and scene rendered.");

    // @ts-ignore - Assigning to globalThis for debugging purposes
    globalThis.__PIXI_APP__ = this.app;

    const svgElement = createSvgElement(800, 600);
    document.body.appendChild(svgElement);
    renderSceneGraphToSvg(this.scene, svgElement);
  }


  updateScene(scene: SceneGraph) {
    if (!this.viewport) {
      console.warn("Cannot update scene: Runtime not initialized.");
      return;
    }
    this.scene = scene;
    renderSceneGraphToPixi(scene, this.viewport);
  }

  destroy() {
    if (this.app) {
      this.app.destroy(true, { children: true });
      this.app = null as any;
      this.viewport = null as any;
    }
  }
}