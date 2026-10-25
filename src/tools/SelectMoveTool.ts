import type { Node } from '@stabilora/arcora';
import { Transaction, UpdateNodeOperation } from '@stabilora/arcora';
import { SpatialItemType } from '../spatial/ISpatialItem';
import type { HitResult } from '../spatial/hitTest';
import type { Scene } from '../scene/Scene';
import type { ViewportPointerEvent } from '../viewport/ViewportEngine';
import {
  BaseTool,
  type ToolContext,
  type ToolDragEvent,
  type ToolPointerEvent,
} from './Tool';

type Drag = {
  nodeId: string;
  startPos: { x: number; z: number };
  position: { x: number; z: number } | null;
};

export class SelectMoveTool extends BaseTool {
  static readonly ID = 'select-move';

  private drag: Drag | null = null;

  constructor() {
    super(SelectMoveTool.ID, 'Select / Move');
  }

  onActivate(ctx: ToolContext): void {
    ctx.scene.viewport.setCursor('');
  }

  onPointerMove({ hit }: ToolPointerEvent, ctx: ToolContext): void {
    if (this.drag) return; // keep 'grabbing' for the whole drag
    ctx.scene.selection.setHovered(hit?.entity ?? null);
    ctx.scene.viewport.setCursor(
      hit?.type === SpatialItemType.Node ? 'move' : ''
    );
  }

  onPointerLeave(_e: ViewportPointerEvent, ctx: ToolContext): void {
    if (!this.drag) ctx.scene.selection.setHovered(null);
  }

  onLeftClick({ hit, event: e }: ToolPointerEvent, ctx: ToolContext): void {
    this.applySelection(ctx.scene, e, hit);
  }

  onDragStart(
    { hit, event: e, button, origin }: ToolDragEvent,
    ctx: ToolContext
  ): void {
    if (button !== 0 || this.modified(e)) return;
    if (hit?.type !== SpatialItemType.Node) return;
    const node = hit.entity as Node;
    const { scene } = ctx;
    if (!scene.selection.isSelected(node.id)) scene.selection.selectOnly(node);
    this.drag = {
      nodeId: node.id,
      startPos: { x: node.pos.x, z: node.pos.z },
      position: null,
    };
    scene.viewport.setCursor('grabbing');
    this.move(scene, origin, e);
  }

  onDragMove({ origin, event: e }: ToolDragEvent, ctx: ToolContext): void {
    if (!this.drag) return;
    this.move(ctx.scene, origin, e);
  }

  onDragEnd({ hit }: ToolDragEvent, ctx: ToolContext): void {
    const drag = this.drag;
    this.drag = null;
    const { scene } = ctx;
    if (!drag?.position) {
      scene.viewport.setCursor(
        hit?.type === SpatialItemType.Node ? 'move' : ''
      );
      return;
    }
    this.applyMove(scene, drag.nodeId, drag.startPos); // restore so commit snapshots the true original
    this.commitMove(scene, drag.nodeId, drag.position);
    scene.viewport.setCursor(hit?.type === SpatialItemType.Node ? 'move' : '');
  }

  onPointerCancel(_e: ViewportPointerEvent, ctx: ToolContext): void {
    this.cancel(ctx);
  }

  cancel(ctx: ToolContext): void {
    const drag = this.drag;
    this.drag = null;
    if (drag?.position) this.applyMove(ctx.scene, drag.nodeId, drag.startPos); // undo history untouched
    ctx.scene.viewport.setCursor('');
  }

  private move(
    scene: Scene,
    origin: { world: { x: number; y: number } },
    e: ViewportPointerEvent
  ): void {
    if (!this.drag) return;
    this.drag.position = {
      x: this.drag.startPos.x + (e.world.x - origin.world.x),
      z: this.drag.startPos.z + (e.world.y - origin.world.y),
    };
    this.applyMove(scene, this.drag.nodeId, this.drag.position);
  }

  private applyMove(
    scene: Scene,
    id: string,
    pos: { x: number; z: number }
  ): void {
    const txn = this.moveTransaction(scene, id, pos);
    if (txn) scene.repository.apply(txn); // live, no undo entry
  }

  private commitMove(
    scene: Scene,
    id: string,
    pos: { x: number; z: number }
  ): void {
    const txn = this.moveTransaction(scene, id, pos);
    if (txn) scene.repository.commit(txn);
  }

  private moveTransaction(
    scene: Scene,
    id: string,
    pos: { x: number; z: number }
  ): Transaction | null {
    const node = scene.model.nodes.get(id);
    if (!node) return null;
    const data = node.toData();
    data.coords = { x: pos.x, z: pos.z }; // full data, partial would wipe name/prescribedDisplacement
    const txn = new Transaction('Move node');
    txn.addCommand(new UpdateNodeOperation(data));
    return txn;
  }

  private modified(e: ViewportPointerEvent): boolean {
    return e.ctrlKey || e.shiftKey || e.metaKey;
  }

  private applySelection(
    scene: Scene,
    e: ViewportPointerEvent,
    hit: HitResult | undefined
  ): void {
    const selection = scene.selection;
    if (!hit) {
      if (!this.modified(e)) selection.clearSelection();
    } else if (e.ctrlKey || e.metaKey) {
      selection.selectAdd(hit.entity);
    } else if (e.shiftKey) {
      selection.selectRemove(hit.entity);
    } else {
      selection.selectOnly(hit.entity);
    }
  }
}
