import RBush from 'rbush';
import type {
  Model,
  TransactionChanges,
  RepositoryChange,
} from '@stabilora/arcora';
import { SpatialItemType, type SpatialItem } from './ISpatialItem';

export class SpatialIndex {
  private tree = new RBush<SpatialItem>();
  private byId = new Map<string, SpatialItem>();

  search(bbox: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }): SpatialItem[] {
    return this.tree.search(bbox);
  }

  boundingBox(): { minX: number; minY: number; maxX: number; maxY: number } {
    const d = (this.tree as RBush<SpatialItem> & { data?: any }).data; // i know its scuffed, but its the simplest way of getting bounding box out of rbush, sice its not exposed by default
    const bbox = d && {
      minX: d.minX,
      minY: d.minY,
      maxX: d.maxX,
      maxY: d.maxY,
    };
    return bbox;
  }

  searchNearest(x: number, y: number, tolerance: number): SpatialItem[] {
    return this.tree.search({
      minX: x - tolerance,
      minY: y - tolerance,
      maxX: x + tolerance,
      maxY: y + tolerance,
    });
  }

  getById(id: string): SpatialItem | undefined {
    return this.byId.get(id);
  }

  all(): SpatialItem[] {
    return this.tree.all();
  }

  sync(changes: TransactionChanges, model: Model): void {
    for (const [id, change] of changes.added) {
      this.insertChange(id, change, model);
    }

    for (const [, change] of changes.changed) {
      this.removeById(change.id);
      this.insertChange(change.id, change, model);
    }

    for (const [, change] of changes.removed) {
      this.removeById(change.id);
    }
  }

  clear(): void {
    this.tree.clear();
    this.byId.clear();
  }

  private insertChange(
    id: string,
    change: RepositoryChange,
    model: Model
  ): void {
    if (change.kind === 'node') {
      const node = model.nodes.get(id);
      if (!node) return;
      const item = makeNodeItem(node);
      this.tree.insert(item);
      this.byId.set(id, item);
    } else if (change.kind === 'element') {
      const element = model.elements.get(id);
      if (!element) return;
      const nodeA = model.nodes.get(element.nodeIDs[0]);
      const nodeB = model.nodes.get(element.nodeIDs[1]);
      if (!nodeA || !nodeB) return;
      const item = makeElementItem(element.id, nodeA.pos, nodeB.pos);
      this.tree.insert(item);
      this.byId.set(id, item);
    }
  }

  private removeById(id: string): void {
    const existing = this.byId.get(id);
    if (existing) {
      this.tree.remove(existing);
      this.byId.delete(id);
    }
  }
}

function makeNodeItem(node: {
  id: string;
  pos: { x: number; z: number };
}): SpatialItem {
  return {
    minX: node.pos.x,
    minY: node.pos.z,
    maxX: node.pos.x,
    maxY: node.pos.z,
    id: node.id,
    type: SpatialItemType.Node,
  };
}

function makeElementItem(
  _id: string,
  posA: { x: number; z: number },
  posB: { x: number; z: number }
): SpatialItem {
  return {
    minX: Math.min(posA.x, posB.x),
    minY: Math.min(posA.z, posB.z),
    maxX: Math.max(posA.x, posB.x),
    maxY: Math.max(posA.z, posB.z),
    id: _id,
    type: SpatialItemType.Element,
  };
}
