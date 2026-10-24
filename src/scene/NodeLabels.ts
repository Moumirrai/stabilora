import type { Model, TransactionChanges } from '@stabilora/arcora';
import type { LabelLayer } from '../viewport/rendering/labels/LabelLayer';

export const NODE_LABEL_CHANNEL = 1; // node-name labels

function labelId(nodeId: string): string {
  return `node:${nodeId}`;
}

/**
 * Static node-name labels (`text` is always `node.name`), synced
 * incrementally from the repository change stream: added/changed sync one
 * label, removed deletes one. `syncAll` is init/repair only; edits go
 * through `sync`.
 */
export class NodeLabels {
  private readonly model: Model;
  private readonly labels: LabelLayer;
  private readonly tracked = new Set<string>(); // labeled node ids
  private disposed = false;

  constructor(model: Model, labels: LabelLayer) {
    this.model = model;
    this.labels = labels;
  }

  sync(changes: TransactionChanges): void {
    // scoped to changed ids; edits go through here
    if (this.disposed) return;
    let dirty = false;
    for (const [, change] of changes.added) {
      if (change.kind !== 'node') continue;
      if (this.syncNode(change.id)) dirty = true;
    }
    for (const [, change] of changes.changed) {
      if (change.kind !== 'node') continue;
      if (this.syncNode(change.id)) dirty = true;
    }
    for (const [, change] of changes.removed) {
      if (change.kind !== 'node') continue;
      if (this.tracked.delete(change.id)) {
        this.labels.system.removeStatic(labelId(change.id));
        dirty = true;
      }
    }
    if (dirty) this.labels.requestRender();
  }

  syncAll(): void {
    // full reconcile; init + repair only
    if (this.disposed) return;
    let dirty = false;
    for (const node of this.model.nodes.values()) {
      if (this.syncNode(node.id)) dirty = true;
    }
    for (const nodeId of [...this.tracked]) {
      if (!this.model.nodes.has(nodeId)) {
        this.tracked.delete(nodeId);
        this.labels.system.removeStatic(labelId(nodeId));
        dirty = true;
      }
    }
    if (dirty) this.labels.requestRender();
  }

  private syncNode(nodeId: string): boolean {
    // true when the static layer may have changed
    const node = this.model.nodes.get(nodeId);
    const name = node?.name;
    if (!node || name === undefined || name === '') {
      if (this.tracked.delete(nodeId)) {
        this.labels.system.removeStatic(labelId(nodeId));
        return true;
      }
      return false;
    }
    const pos = node.pos;
    this.labels.system.addStatic({
      id: labelId(nodeId),
      text: name,
      anchor: { x: pos.x, y: pos.z },
      channel: NODE_LABEL_CHANNEL,
      alignX: 'left',
      alignY: 'bottom',
      offsetEm: { x: 0.8, y: -0.4 },
    });
    this.tracked.add(nodeId);
    return true;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const nodeId of this.tracked) {
      this.labels.system.removeStatic(labelId(nodeId));
    }
    this.tracked.clear();
    this.labels.requestRender();
  }
}
