export interface Point2 {
  x: number;
  z: number;
}

export function bodyAngleToward(dx: number, dz: number): number {
  return Math.atan2(-dx, dz);
}

// Wall orientation: body extends away from connected elements; if balanced,
// uses the element axis. Returns null when no direction is defined.
export function angleAwayFromElements(
  node: Point2,
  neighbors: readonly Point2[]
): number | null {
  let sumX = 0;
  let sumZ = 0;
  let sumCos2 = 0;
  let sumSin2 = 0;
  let count = 0;

  for (const neighbor of neighbors) {
    const dx = neighbor.x - node.x;
    const dz = neighbor.z - node.z;
    const length = Math.hypot(dx, dz);
    if (length === 0) continue;

    const ux = dx / length;
    const uz = dz / length;
    sumX += ux;
    sumZ += uz;
    // Doubling the angle folds a direction and its opposite onto each other.
    sumCos2 += ux * ux - uz * uz;
    sumSin2 += 2 * ux * uz;
    count++;
  }

  if (count === 0) return null;

  // Below this the elements pull in opposing directions and "away from them"
  // is ill-defined; above it they clearly lie on one side of the node.
  const ONE_SIDED = 0.3;
  const sumLength = Math.hypot(sumX, sumZ);
  if (sumLength / count > ONE_SIDED) {
    return bodyAngleToward(-sumX / sumLength, -sumZ / sumLength);
  }

  const axisStrength = Math.hypot(sumCos2, sumSin2) / count;
  if (axisStrength < 1e-6) return null;

  const axis = 0.5 * Math.atan2(sumSin2, sumCos2);
  return bodyAngleToward(Math.cos(axis), Math.sin(axis));
}
