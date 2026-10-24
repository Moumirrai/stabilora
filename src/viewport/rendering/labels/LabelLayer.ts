import type { ViewportEngine } from '../../ViewportEngine';
import { loadLabelAssets, type LabelAssets } from './labelAssets';
import { LabelSystem, type LabelSystemOptions } from './labelSystem';

export type LabelLayerOptions = LabelSystemOptions;

/**
 * MSDF label stack owned by one scene: label system, meshes and frame prep.
 */
export class LabelLayer {
  readonly system: LabelSystem;

  private readonly viewport: ViewportEngine;
  private readonly unsubscribeRender: () => void;
  private disposed = false;

  // Single hardcoded font; loads once and caches in `labelAssets.ts`.
  static async create(
    viewport: ViewportEngine,
    options: LabelLayerOptions = {}
  ): Promise<LabelLayer> {
    const assets = await loadLabelAssets();
    return new LabelLayer(viewport, assets, options);
  }

  private constructor(
    viewport: ViewportEngine,
    assets: LabelAssets,
    options: LabelLayerOptions = {}
  ) {
    this.viewport = viewport;
    this.system = new LabelSystem(
      assets.atlasData,
      assets.atlasTexture,
      viewport.camera.cameraUniforms,
      viewport.viewportUniforms,
      options
    );
    viewport.screenContainer.addChild(
      this.system.staticMesh,
      this.system.streamMesh
    );
    this.unsubscribeRender = viewport.onBeforeRender.subscribe(
      this.handleBeforeRender
    );
    viewport.requestRender();
  }

  private handleBeforeRender = (): void => {
    this.system.prepareRender();
  };

  /** Font size for one size channel (0..31); null follows channel 0 again. */
  setChannelFontSizePx(channel: number, px: number | null): void {
    this.system.setChannelFontSizePx(channel, px);
    this.viewport.requestRender();
  }

  requestRender(): void {
    this.viewport.requestRender();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.unsubscribeRender();
    this.system.dispose();
  }
}
