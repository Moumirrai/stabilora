import type { ViewportPointerEvent } from '../viewport/ViewportEngine';
import { BaseTool, type ToolContext, type ToolDragEvent } from './Tool';

export class HandTool extends BaseTool {
  static readonly ID = 'hand';

  private last: { x: number; y: number } | null = null;

  constructor() {
    super(HandTool.ID, 'Hand');
  }

  onActivate(ctx: ToolContext): void {
    this.setIdle(ctx);
  }

  onDragStart({ button, event: e }: ToolDragEvent, ctx: ToolContext): void {
    if (button !== 0 || this.modified(e)) return;
    this.last = { ...e.screen };
    ctx.scene.viewport.setCursor('grabbing');
  }

  onDragMove({ event: e }: ToolDragEvent, ctx: ToolContext): void {
    if (!this.last) return;
    ctx.scene.viewport.camera.panBy(
      e.screen.x - this.last.x,
      e.screen.y - this.last.y,
      true
    );
    this.last = { ...e.screen };
  }

  onDragEnd(_e: ToolDragEvent, ctx: ToolContext): void {
    this.last = null;
    this.setIdle(ctx);
  }

  onPointerCancel(_e: ViewportPointerEvent, ctx: ToolContext): void {
    this.cancel(ctx);
  }

  cancel(ctx: ToolContext): void {
    this.last = null;
    this.setIdle(ctx);
  }

  private setIdle(ctx: ToolContext): void {
    ctx.scene.viewport.setCursor('grab');
  }

  private modified(e: ViewportPointerEvent): boolean {
    return e.ctrlKey || e.shiftKey || e.metaKey;
  }
}
