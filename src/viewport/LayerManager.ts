import Konva from 'konva';

class LayerManager {
  public baseLayer: Konva.Layer;
  public geometryLayer: Konva.Layer;
  public temporaryLayer: Konva.Layer;

  constructor(private stage: Konva.Stage) {
    this.baseLayer = this.createLayer('base', false, false);
    this.geometryLayer = this.createLayer('gemoetry', false, true);
    this.temporaryLayer = this.createLayer('temporary', false, false);
  }

  private createLayer(
    name: string,
    hidden: boolean,
    listening: boolean
  ): Konva.Layer {
    const layer = new Konva.Layer();
    layer.name(name);
    layer.visible(!hidden);
    layer.listening(listening);
    this.stage.add(layer);
    return layer;
  }
}

export default LayerManager;
