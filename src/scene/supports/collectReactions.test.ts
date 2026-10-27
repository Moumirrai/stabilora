import { describe, expect, it, vi } from 'vitest';

vi.mock('@stabilora/arcora', () => ({
  Dof: { Ux: 0, Uy: 1, Rz: 2 },
}));

import {
  collectReactionInstances,
  type DofIndexLike,
} from './collectReactions';

function model(): {
  nodes: Map<string, { pos: { x: number; z: number } }>;
  boundaryConditions: Map<
    string,
    { nodeId: string; rotation: number; dirichlet: Record<number, number> }
  >;
} {
  return {
    nodes: new Map([
      ['a', { pos: { x: 0, z: 0 } }],
      ['b', { pos: { x: 1000, z: 0 } }],
    ]),
    boundaryConditions: new Map([
      [
        'a',
        {
          nodeId: 'a',
          rotation: 0,
          dirichlet: { 0: 0, 1: 0, 2: 0 },
        },
      ],
    ]),
  };
}

function dofIndex(order: string[]): DofIndexLike {
  return {
    indexlOf: (nodeId: string, axis: number) =>
      order.indexOf(nodeId) * 3 + axis,
  };
}

describe('collectReactionInstances', () => {
  it('returns empty without a dof index or reactions', () => {
    expect(
      collectReactionInstances(model(), null, new Float64Array(6))
    ).toEqual([]);
    expect(
      collectReactionInstances(model(), dofIndex(['a']), new Float64Array(0))
    ).toEqual([]);
  });

  it('emits force arrows pointing opposite the reaction', () => {
    const reactions = new Float64Array([10, -5, 0, 0, 0, 0]);
    const out = collectReactionInstances(model(), dofIndex(['a']), reactions);
    expect(out).toHaveLength(2);
    expect(out[0].glyph).toBe('reactionArrow');
    expect(out[0].angle).toBeCloseTo(Math.PI / 2);
    expect(out[0].value).toBe(10);
    expect(out[1].glyph).toBe('reactionArrow');
    expect(out[1].angle).toBeCloseTo(0);
    expect(out[1].value).toBe(-5);
  });

  it('skips free and zero DOFs', () => {
    const m = model();
    m.boundaryConditions.set('b', {
      nodeId: 'b',
      rotation: 0,
      dirichlet: { 1: 0 },
    });
    const reactions = new Float64Array([0, 0, 0, 42, 0, 7]);
    const out = collectReactionInstances(m, dofIndex(['a', 'b']), reactions);
    expect(out).toEqual([]);
  });

  it('emits centered moment arrows, CW when negative', () => {
    const reactions = new Float64Array([0, 0, 12, 0, 0, -3]);
    const m = model();
    m.boundaryConditions.set('b', {
      nodeId: 'b',
      rotation: 0,
      dirichlet: { 2: 0 },
    });
    const out = collectReactionInstances(m, dofIndex(['a', 'b']), reactions);
    expect(out).toHaveLength(2);
    expect(out[0].glyph).toBe('reactionMomentCcw');
    expect(out[0].angle).toBe(0);
    expect(out[0].x).toBe(0);
    expect(out[0].z).toBe(0);
    expect(out[1].glyph).toBe('reactionMomentCw');
    expect(out[1].angle).toBe(0);
    expect(out[1].x).toBe(1000);
    expect(out[1].z).toBe(0);
  });

  it('skips boundary conditions on missing nodes', () => {
    const m = model();
    m.boundaryConditions.set('zz', {
      nodeId: 'zz',
      rotation: 0,
      dirichlet: { 0: 0 },
    });
    const reactions = new Float64Array(9).fill(5);
    const out = collectReactionInstances(m, dofIndex(['a', 'zz']), reactions);
    expect(out.every((d) => d.nodeId !== 'zz')).toBe(true);
  });
});
