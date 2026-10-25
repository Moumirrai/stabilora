import type { HitResult } from '../spatial/hitTest';
import type { Scene } from '../scene/Scene';
import type { ViewportPointerEvent } from '../viewport/ViewportEngine';

export interface ToolContext {
  scene: Scene;
}

export interface ToolPointerEvent {
  hit: HitResult | undefined;
  event: ViewportPointerEvent;
}

export interface ToolDragEvent {
  hit: HitResult | undefined;
  event: ViewportPointerEvent;
  button: number;
  origin: { screen: { x: number; y: number }; world: { x: number; y: number } };
}

export interface Tool {
  readonly id: string;
  readonly label: string;
  enabled: boolean;
  updateEnabled(ctx: ToolContext): void;
  onActivate(ctx: ToolContext): void;
  onDeactivate(): void;
  onPointerMove(e: ToolPointerEvent, ctx: ToolContext): void;
  onPointerLeave(e: ViewportPointerEvent, ctx: ToolContext): void;
  onLeftDown(e: ToolPointerEvent, ctx: ToolContext): void;
  onLeftUp(e: ToolPointerEvent, ctx: ToolContext): void;
  onLeftClick(e: ToolPointerEvent, ctx: ToolContext): void;
  onRightDown(e: ToolPointerEvent, ctx: ToolContext): void;
  onRightUp(e: ToolPointerEvent, ctx: ToolContext): void;
  onRightClick(e: ToolPointerEvent, ctx: ToolContext): void;
  onDragStart(e: ToolDragEvent, ctx: ToolContext): void;
  onDragMove(e: ToolDragEvent, ctx: ToolContext): void;
  onDragEnd(e: ToolDragEvent, ctx: ToolContext): void;
  onPointerCancel(e: ViewportPointerEvent, ctx: ToolContext): void;
  cancel(ctx: ToolContext): void;
}

export class BaseTool implements Tool {
  readonly id: string;
  readonly label: string;
  enabled = true;

  constructor(id: string, label: string) {
    this.id = id;
    this.label = label;
  }

  updateEnabled(_ctx: ToolContext): void {}
  onActivate(_ctx: ToolContext): void {}
  onDeactivate(): void {}
  onPointerMove(_e: ToolPointerEvent, _ctx: ToolContext): void {}
  onPointerLeave(_e: ViewportPointerEvent, _ctx: ToolContext): void {}
  onLeftDown(_e: ToolPointerEvent, _ctx: ToolContext): void {}
  onLeftUp(_e: ToolPointerEvent, _ctx: ToolContext): void {}
  onLeftClick(_e: ToolPointerEvent, _ctx: ToolContext): void {}
  onRightDown(_e: ToolPointerEvent, _ctx: ToolContext): void {}
  onRightUp(_e: ToolPointerEvent, _ctx: ToolContext): void {}
  onRightClick(_e: ToolPointerEvent, _ctx: ToolContext): void {}
  onDragStart(_e: ToolDragEvent, _ctx: ToolContext): void {}
  onDragMove(_e: ToolDragEvent, _ctx: ToolContext): void {}
  onDragEnd(_e: ToolDragEvent, _ctx: ToolContext): void {}
  onPointerCancel(_e: ViewportPointerEvent, _ctx: ToolContext): void {}
  cancel(_ctx: ToolContext): void {}
}
