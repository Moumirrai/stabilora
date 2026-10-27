import { Dof } from '@stabilora/arcora';
import type { ViewportEngine } from '../viewport/ViewportEngine';
import type { LabelLayer } from '../viewport/rendering/labels/LabelLayer';
import {
  MOMENT_OUTER,
  REACTION_TIP,
} from '../viewport/rendering/glyphs/reactionGlyphs';
import {
  DEFAULT_REACTION_COLOR,
  DEFAULT_REACTION_SIZE,
} from '../viewport/rendering/primitives/reactionStyle';
import type { ReactionDatum } from './supports/collectReactions';

export const REACTION_LABEL_CHANNEL = 2;

const SQRT1_2 = Math.SQRT1_2;
const LABEL_MARGIN_PX = 10;

function formatReaction(value: number, dof: Dof): string {
  const a = Math.abs(value);
  if (dof === Dof.Rz) {
    if (a >= 1000) return `${(a / 1000).toFixed(1)} kNm`;
    return `${a.toFixed(1)} Nm`;
  }
  if (a >= 1000) return `${(a / 1000).toFixed(1)} kN`;
  if (a >= 10) return `${a.toFixed(0)} N`;
  return `${a.toFixed(1)} N`;
}

export class ReactionLabels {
  private readonly labels: LabelLayer;
  private readonly viewport: ViewportEngine;
  private readonly unsubscribe: () => void;
  private data: readonly ReactionDatum[] = [];
  private reactionSizePx = DEFAULT_REACTION_SIZE;
  private readonly color: [number, number, number, number] = [
    DEFAULT_REACTION_COLOR[0],
    DEFAULT_REACTION_COLOR[1],
    DEFAULT_REACTION_COLOR[2],
    1,
  ];
  private streamActive = false;
  private disposed = false;
  private dirty = true;
  private lastScale = -1;

  constructor(labels: LabelLayer, viewport: ViewportEngine) {
    this.labels = labels;
    this.viewport = viewport;
    this.unsubscribe = viewport.onBeforeRender.subscribe(
      this.handleBeforeRender
    );
  }

  update(data: readonly ReactionDatum[]): void {
    if (data.length === 0) {
      this.clear();
      return;
    }
    this.data = data;
    this.dirty = true;
    this.labels.requestRender();
  }

  setReactionSizePx(px: number): void {
    if (!(px > 0) || px === this.reactionSizePx) return;
    this.reactionSizePx = px;
    this.dirty = true;
    this.labels.requestRender();
  }

  clear(): void {
    this.data = [];
    this.dirty = true;
    this.flushEmpty();
    this.labels.requestRender();
  }

  private handleBeforeRender = (): void => {
    this.push();
  };

  private push(): void {
    if (this.disposed) return;
    const scale = this.viewport.camera.getState().scale || 1;
    if (!this.dirty && scale === this.lastScale) return;
    if (this.data.length === 0) {
      this.flushEmpty();
      this.dirty = false;
      this.lastScale = scale;
      return;
    }
    const marginWorld = LABEL_MARGIN_PX / scale;
    const system = this.labels.system;
    system.beginStream();
    for (const d of this.data) {
      if (d.dof === Dof.Rz) {
        const m = (MOMENT_OUTER * this.reactionSizePx) / scale + marginWorld;
        const east = d.glyph === 'reactionMomentCcw';
        const sx = east ? 1 : -1;
        system.pushStream({
          text: formatReaction(d.value, d.dof),
          anchor: { x: d.x + sx * m * SQRT1_2, y: d.z - m * SQRT1_2 },
          color: this.color,
          rotation: 0,
          channel: REACTION_LABEL_CHANNEL,
          alignX: east ? 'left' : 'right',
          alignY: 'middle',
        });
        continue;
      }
      const bx = -Math.sin(d.angle);
      const bz = Math.cos(d.angle);
      const t = (REACTION_TIP * this.reactionSizePx) / scale + marginWorld;
      const horizontal = Math.abs(bx) >= Math.abs(bz);
      system.pushStream({
        text: formatReaction(d.value, d.dof),
        anchor: { x: d.x + bx * t, y: d.z + bz * t },
        color: this.color,
        rotation: 0,
        channel: REACTION_LABEL_CHANNEL,
        alignX: horizontal ? (bx >= 0 ? 'left' : 'right') : 'center',
        alignY: horizontal ? 'middle' : bz >= 0 ? 'top' : 'bottom',
      });
    }
    system.endStream();
    system.prepareRender();
    this.streamActive = true;
    this.dirty = false;
    this.lastScale = scale;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.unsubscribe();
    this.data = [];
    this.flushEmpty();
    this.labels.requestRender();
  }

  private flushEmpty(): void {
    if (!this.streamActive) return;
    const system = this.labels.system;
    system.beginStream();
    system.endStream();
    system.prepareRender();
    this.streamActive = false;
  }
}
