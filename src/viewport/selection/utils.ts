export type Point = { x: number; y: number };
export type Rect = { minX: number; minY: number; maxX: number; maxY: number };

export function linesIntersect(
  p1: Point,
  p2: Point,
  q1: Point,
  q2: Point
): boolean {
  function ccw(a: Point, b: Point, c: Point): boolean {
    return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
  }
  return (
    ccw(p1, q1, q2) !== ccw(p2, q1, q2) && ccw(p1, p2, q1) !== ccw(p1, p2, q2)
  );
}

export function lineIntersectsBox(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rect: Rect
): boolean {
  // Box corners
  const topLeft: Point = { x: rect.minX, y: rect.minY };
  const topRight: Point = { x: rect.maxX, y: rect.minY };
  const bottomLeft: Point = { x: rect.minX, y: rect.maxY };
  const bottomRight: Point = { x: rect.maxX, y: rect.maxY };

  // Box edges
  const edges: [Point, Point][] = [
    [topLeft, topRight],
    [topRight, bottomRight],
    [bottomRight, bottomLeft],
    [bottomLeft, topLeft],
  ];

  // Check intersection with any edge
  for (const [p1, p2] of edges) {
    if (linesIntersect({ x: x1, y: y1 }, { x: x2, y: y2 }, p1, p2)) {
      return true;
    }
  }

  // Also check if the line is completely inside the box
  function pointInRect(x: number, y: number, r: Rect): boolean {
    return x >= r.minX && x <= r.maxX && y >= r.minY && y <= r.maxY;
  }
  if (pointInRect(x1, y1, rect) && pointInRect(x2, y2, rect)) {
    return true;
  }

  return false;
}
