import type { Model } from "src/stores/model/model.types";
import type Viewport from "../viewport";
import type Konva from "konva";

export default interface IRenderer {
  draw(model: Model, viewport: Viewport, layer: Konva.Layer): void;
  update(model: Model,viewport: Viewport, layer: Konva.Layer): void;
  reset(): void;
}