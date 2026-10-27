import { Dof, type BCData } from '@stabilora/arcora';
import type { GlyphInstance } from '../../viewport/rendering/glyphs/instance';
import type { GlyphName } from '../../viewport/rendering/glyphs/supportGlyphs';
import {
  classifySupport,
  SPRING_GLYPHS,
  SUPPORT_KINDS,
  type GlyphSpec,
} from './supportKinds';
import { angleAwayFromElements, type Point2 } from './supportOrientation';

// DOFs that can carry a spring; also the order their glyphs are drawn in.
const SPRING_DOFS = [Dof.Ux, Dof.Uy, Dof.Rz] as const;

export interface SupportModel {
  nodes: ReadonlyMap<string, { pos: Point2 }>;
  elements: ReadonlyMap<string, { nodeIDs: readonly [string, string] }>;
  boundaryConditions: ReadonlyMap<string, BCData>;
}

// Fixed DOFs pick one glyph; springs add one per unconstrained sprung DOF.
export function collectSupportInstances(
  model: SupportModel
): GlyphInstance<GlyphName>[] {
  const neighbors = neighborsOfSupportedNodes(model);
  const out: GlyphInstance<GlyphName>[] = [];

  for (const bc of model.boundaryConditions.values()) {
    const node = model.nodes.get(bc.nodeId);
    if (!node) continue;

    const fixed = (dof: Dof) => bc.dirichlet?.[dof] !== undefined;
    const kind = classifySupport(fixed(Dof.Ux), fixed(Dof.Uy), fixed(Dof.Rz));
    const place = (spec: GlyphSpec) =>
      out.push({
        x: node.pos.x,
        z: node.pos.z,
        angle: glyphAngle(
          spec,
          bc.rotation,
          node.pos,
          neighbors.get(bc.nodeId)
        ),
        glyph: spec.glyph,
      });

    if (kind) place(SUPPORT_KINDS[kind]);
    for (const dof of SPRING_DOFS) {
      if (!fixed(dof) && bc.spring?.[dof] !== undefined)
        place(SPRING_GLYPHS[dof]);
    }
  }

  return out;
}

function glyphAngle(
  spec: GlyphSpec,
  bcRotation: number,
  nodePos: Point2,
  neighbors: readonly Point2[] = []
): number {
  if (spec.orientation === 'elements') {
    const automatic = angleAwayFromElements(nodePos, neighbors);
    if (automatic !== null) return automatic + spec.baseAngle;
  }
  return bcRotation + spec.baseAngle;
}

function neighborsOfSupportedNodes(model: SupportModel): Map<string, Point2[]> {
  const map = new Map<string, Point2[]>();
  const supported = new Set(model.boundaryConditions.keys());

  for (const element of model.elements.values()) {
    const [a, b] = element.nodeIDs;
    for (const [nodeId, otherId] of [
      [a, b],
      [b, a],
    ]) {
      if (!supported.has(nodeId)) continue;
      const other = model.nodes.get(otherId);
      if (!other) continue;
      const list = map.get(nodeId);
      if (list) list.push(other.pos);
      else map.set(nodeId, [other.pos]);
    }
  }
  return map;
}
