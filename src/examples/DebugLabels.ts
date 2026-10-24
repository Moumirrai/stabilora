import type { LabelLayer } from '../viewport/rendering/labels/LabelLayer';
import type { LabelOptions } from '../viewport/rendering/labels/labelSystem';

export interface DebugLabels {
  setResult(text: string): void;
  setStaticText(text: string): void;
  dispose(): void;
}

/**
 * Example label usage: a retained static label on channel 0 and a streamed
 * label on channel 1, so each can have its own font size.
 */
export function createDebugLabels(labels: LabelLayer): DebugLabels {
  const system = labels.system;

  const staticId = system.addStatic({
    text: 'static label',
    anchor: { x: 0, y: 0 },
    channel: 0,
    color: [1, 0.9, 0.0, 0.8],
    alignX: 'left',
    alignY: 'bottom',
    offsetEm: { x: 1, y: -0.5 },
  });

  const dynamicLabel: LabelOptions = {
    text: '',
    anchor: { x: 0, y: 4000 },
    channel: 1,
    color: [0.55, 0.9, 1, 1],
    alignX: 'left',
    alignY: 'bottom',
    offsetEm: { x: 1, y: -0.5 },
  };

  function setResult(text: string): void {
    dynamicLabel.text = text;
    system.beginStream();
    system.pushStream(dynamicLabel);
    system.endStream();
    labels.requestRender();
  }

  function setStaticText(text: string): void {
    system.updateStatic(staticId, { text });
    labels.requestRender();
  }

  setResult('no result');

  let disposed = false;
  return {
    setResult,
    setStaticText,
    dispose(): void {
      if (disposed) return;
      disposed = true;
      system.removeStatic(staticId);
      system.setChannelFontSizePx(1, null);
    },
  };
}
