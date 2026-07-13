import type { Model } from '@stabilora/arcora';
import { SpatialItemType, type SpatialItem } from './ISpatialItem';
import { distancePoint, distancePointSegment, type Vec2 } from './geometry';

type NodeType = NonNullable<ReturnType<Model['nodes']['get']>>;
type ElementType = NonNullable<ReturnType<Model['elements']['get']>>;

export type HitResult =
  | { type: SpatialItemType.Node; node: NodeType }
  | { type: SpatialItemType.Element; element: ElementType };

function hitNode(
  model: Model,
  items: SpatialItem[],
  point: Vec2,
  tol: number
): HitResult | undefined {
  let best: NodeType | undefined;
  let bestDist = tol;
  for (const item of items) {
    const node = model.nodes.get(item.id);
    if (!node) continue;
    const dist = distancePoint(point, node.pos);
    if (dist <= bestDist) {
      best = node;
      bestDist = dist;
    }
  }
  return best ? { type: SpatialItemType.Node, node: best } : undefined;
}

function hitElement(
  model: Model,
  items: SpatialItem[],
  point: Vec2,
  tol: number
): HitResult | undefined {
  let best: ElementType | undefined;
  let bestDist = tol;
  for (const item of items) {
    const element = model.elements.get(item.id);
    if (!element) continue;
    const a = model.nodes.get(element.nodeIDs[0]);
    const b = model.nodes.get(element.nodeIDs[1]);
    if (!a || !b) continue;
    const dist = distancePointSegment(point, a.pos, b.pos);
    if (dist <= bestDist) {
      best = element;
      bestDist = dist;
    }
  }
  return best ? { type: SpatialItemType.Element, element: best } : undefined;
}

export function hitTestPrecise(
  model: Model,
  candidates: SpatialItem[],
  point: Vec2,
  tolerance: number
): HitResult | undefined {
  const nodes: SpatialItem[] = [];
  const elements: SpatialItem[] = [];

  for (const item of candidates) {
    if (item.type === SpatialItemType.Node)
      nodes.push(item); //nodes take priority over elements
    else if (item.type === SpatialItemType.Element) elements.push(item);
  }

  const nodeHit = hitNode(model, nodes, point, tolerance);
  if (nodeHit) return nodeHit;

  return hitElement(model, elements, point, tolerance);
}
