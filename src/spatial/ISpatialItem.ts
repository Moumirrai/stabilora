export enum SpatialItemType {
  Node = 'node',
  Element = 'element',
}

export interface SpatialItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  id: string;
  type: SpatialItemType;
}
