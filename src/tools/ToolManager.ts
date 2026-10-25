import type { Scene } from '../scene/Scene';
import type { ViewportEngine } from '../viewport/ViewportEngine';
import type { InteractionController } from '../scene/InteractionController';
import { EventEmitter } from '../utils/EventEmitter';
import type { Tool, ToolContext } from './Tool';
import { SelectMoveTool } from './SelectMoveTool';

export class ToolManager {
  private viewport: ViewportEngine;
  private ctx: ToolContext;
  private tools = new Map<string, Tool>();
  private unsubs: Array<() => void> = [];
  private emitter = new EventEmitter<void>();

  readonly onChanged = this.emitter;

  activeToolId: string | null = null;
  private readonly defaultId = SelectMoveTool.ID;

  constructor(
    scene: Scene,
    viewport: ViewportEngine,
    controller: InteractionController
  ) {
    this.viewport = viewport;
    this.ctx = { scene };

    window.addEventListener('keydown', this.onKeyDown);
    this.unsubs.push(
      () => window.removeEventListener('keydown', this.onKeyDown),
      controller.onPointerMove.subscribe((e) =>
        this.active?.onPointerMove(e, this.ctx)
      ),
      controller.onPointerLeave.subscribe((e) =>
        this.active?.onPointerLeave(e, this.ctx)
      ),
      controller.onLeftDown.subscribe((e) =>
        this.active?.onLeftDown(e, this.ctx)
      ),
      controller.onLeftUp.subscribe((e) => this.active?.onLeftUp(e, this.ctx)),
      controller.onLeftClick.subscribe((e) =>
        this.active?.onLeftClick(e, this.ctx)
      ),
      controller.onRightDown.subscribe((e) =>
        this.active?.onRightDown(e, this.ctx)
      ),
      controller.onRightUp.subscribe((e) =>
        this.active?.onRightUp(e, this.ctx)
      ),
      controller.onRightClick.subscribe((e) =>
        this.active?.onRightClick(e, this.ctx)
      ),
      controller.onDragStart.subscribe((e) =>
        this.active?.onDragStart(e, this.ctx)
      ),
      controller.onDragMove.subscribe((e) =>
        this.active?.onDragMove(e, this.ctx)
      ),
      controller.onDragEnd.subscribe((e) =>
        this.active?.onDragEnd(e, this.ctx)
      ),
      controller.onPointerCancel.subscribe((e) => {
        this.active?.onPointerCancel(e, this.ctx);
      }),
      scene.selection.onChange(() => this.refresh()),
      scene.repository.onChange(() => this.refresh())
    );
  }

  get active(): Tool | undefined {
    const tool =
      this.activeToolId !== null
        ? this.tools.get(this.activeToolId)
        : undefined;
    if (tool && tool.enabled) return tool;
    // Fall back to the default tool
    const fallback = this.tools.get(this.defaultId);
    return fallback && fallback.enabled ? fallback : undefined;
  }

  get all(): Tool[] {
    return [...this.tools.values()];
  }

  register(tool: Tool): void {
    this.tools.set(tool.id, tool);
    tool.updateEnabled(this.ctx);
    this.emitter.emit();
  }

  setActive(id: string): boolean {
    const tool = this.tools.get(id);
    if (!tool || !tool.enabled) return false;
    if (this.activeToolId !== id) {
      this.active?.onDeactivate();
      this.activeToolId = id;
      // we reset cursor so we don't accidentally inherit some stale state
      this.viewport.setCursor('');
      this.active?.onActivate(this.ctx);
      this.emitter.emit();
    }
    return true;
  }

  setEnabled(id: string, enabled: boolean): void {
    const tool = this.tools.get(id);
    if (!tool || tool.enabled === enabled) return;
    tool.enabled = enabled;
    this.emitter.emit();
  }

  refresh(): void {
    const before = this.stateKey();
    for (const tool of this.tools.values()) tool.updateEnabled(this.ctx);
    if (this.stateKey() !== before) this.emitter.emit();
  }

  private stateKey(): string {
    return `${this.activeToolId}|${[...this.tools.values()].map((t) => (t.enabled ? 1 : 0)).join('')}`;
  }

  destroy(): void {
    for (const unsub of this.unsubs) unsub();
    this.unsubs = [];
    this.active?.onDeactivate();
    this.tools.clear();
    this.activeToolId = null;
    this.viewport.setCursor('');
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape' || e.defaultPrevented) return; // other inputs consume their own Esc
    this.active?.cancel(this.ctx);
    this.setActive(this.defaultId);
  };
}
