import { Dof, type BCData, type DofIndex } from '@stabilora/arcora';
import type { GlyphInstance } from '../../viewport/rendering/glyphs/instance';
import type { ReactionGlyphName } from '../../viewport/rendering/glyphs/reactionGlyphs';
import { bodyAngleToward, type Point2 } from './supportOrientation';

export interface ReactionModel {
  nodes: ReadonlyMap<string, { pos: Point2 }>;
  boundaryConditions: ReadonlyMap<string, BCData>;
}

export type DofIndexLike = Pick<DofIndex, 'indexlOf'>;

export interface ReactionDatum extends GlyphInstance<ReactionGlyphName> {
  value: number;
  dof: Dof;
  nodeId: string;
}

const FORCE_DOFS = [Dof.Ux, Dof.Uy] as const;

function isFiniteReaction(v: number, eps: number): boolean {
  return Number.isFinite(v) && Math.abs(v) > eps;
}

function reactionDirection(value: number, axis: Point2): number {
  return bodyAngleToward(-value * axis.x, -value * axis.z);
}

export function collectReactionInstances(
  model: ReactionModel,
  dofIndex: DofIndexLike | null,
  reactions: ReadonlyArray<number> | Float64Array | null | undefined,
  forceEpsilon = 1e-6,
  momentEpsilon = 1e-6
): ReactionDatum[] {
  if (!dofIndex || !reactions || reactions.length === 0) return [];
  const out: ReactionDatum[] = [];

  for (const bc of model.boundaryConditions.values()) {
    const node = model.nodes.get(bc.nodeId);
    if (!node) continue;
    if (bc.dirichlet === undefined) continue;

    const rot = bc.rotation;
    const localX: Point2 = { x: Math.cos(rot), z: Math.sin(rot) };
    const localY: Point2 = { x: -Math.sin(rot), z: Math.cos(rot) };

    for (const dof of FORCE_DOFS) {
      if (bc.dirichlet[dof] === undefined) continue;
      const value = reactions[dofIndex.indexlOf(bc.nodeId, dof)] ?? 0;
      if (!isFiniteReaction(value, forceEpsilon)) continue;
      const axis = dof === Dof.Ux ? localX : localY;
      out.push({
        x: node.pos.x,
        z: node.pos.z,
        angle: reactionDirection(value, axis),
        glyph: 'reactionArrow',
        value,
        dof,
        nodeId: bc.nodeId,
      });
    }

    if (bc.dirichlet[Dof.Rz] !== undefined) {
      const value = reactions[dofIndex.indexlOf(bc.nodeId, Dof.Rz)] ?? 0;
      if (!isFiniteReaction(value, momentEpsilon)) continue;
      out.push({
        x: node.pos.x,
        z: node.pos.z,
        angle: 0,
        glyph: value >= 0 ? 'reactionMomentCcw' : 'reactionMomentCw',
        value,
        dof: Dof.Rz,
        nodeId: bc.nodeId,
      });
    }
  }

  return out;
}
