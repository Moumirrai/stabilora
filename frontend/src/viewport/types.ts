export interface Point {
  x: number;
  y: number;
}

export interface Line {
  id: string;
  start: Point;
  end: Point;
  center: Point;
  length: number;
  angle: number;
}

export interface SnapConfig {
  enabled: boolean;
  endPointSnap: boolean;
  endPointSnapDistance: number;
  axisLock: boolean;
  centerSnap: boolean;
  centerSnapDistance: number;
  gridSnap: boolean;
  gridSize: number;
  orthogonalSnap: boolean;
  orthogonalSnapDistance: number;
}
