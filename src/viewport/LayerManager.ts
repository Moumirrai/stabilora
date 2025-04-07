import Konva from 'konva';

class LayerManager {
  public baseLayer: Konva.Layer;
  public geometryLayer: Konva.Layer;

  public staticLayer: Konva.Layer;

  constructor(private stage: Konva.Stage) {
    this.baseLayer = this.createLayer('base', 1, false, true);
    this.geometryLayer = this.createLayer('gemoetry', 2, false, true);
    this.staticLayer = this.createLayer('static', 3, false, false);
  }

  private createLayer(
    name: string,
    zIndex: number,
    hidden: boolean,
    listening: boolean
  ): Konva.Layer {
    const layer = new Konva.Layer();
    layer.zIndex(zIndex);
    layer.name(name);
    layer.visible(!hidden);
    layer.listening(listening);
    this.stage.add(layer);
    return layer;
  }
}

export default LayerManager;
