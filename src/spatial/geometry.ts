export interface Vec2 {
  x: number;
  z: number;
}

export function distancePoint(p: Vec2, q: Vec2): number {
  const dx = p.x - q.x;
  const dz = p.z - q.z;
  return Math.hypot(dx, dz);
}

export function testPoint(p: Vec2, target: Vec2, tolerance: number): boolean {
  return distancePoint(p, target) <= tolerance;
}

export function distancePointSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) return distancePoint(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / lenSq));
  return distancePoint(p, { x: a.x + t * dx, z: a.z + t * dz });
}

export function testLineSegment(p: Vec2, a: Vec2, b: Vec2, tolerance: number): boolean {
  return distancePointSegment(p, a, b) <= tolerance;
}
