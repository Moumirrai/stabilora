import type { Model } from 'src/stores/model/model.types';
import type Viewport from '../viewport';
import type Konva from 'konva';
import type { RenderingConfig } from './store/RenderingConfig';

export default interface IRenderer {
  draw(
    model: Model,
    viewport: Viewport,
    layer: Konva.Layer,
    config: RenderingConfig,
    selection: string[]
  ): void;
  update(
    model: Model,
    viewport: Viewport,
    layer: Konva.Layer,
    config: RenderingConfig,
    selection: string[]
  ): void;
  reset(): void;
}
