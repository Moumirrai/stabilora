import { describe, expect, it, vi } from 'vitest';
import { GLYPH_DEFS } from '../../viewport/rendering/glyphs/supportGlyphs';

// arcora's root barrel loads its WASM solver on import; these unit tests only
// need the enum.
vi.mock('@stabilora/arcora', () => ({
  Dof: { Ux: 0, Uy: 1, Rz: 2 },
}));
import { collectSupportInstances, type SupportModel } from './collectSupports';
import { classifySupport, SUPPORT_KINDS } from './supportKinds';
import { angleAwayFromElements, bodyAngleToward } from './supportOrientation';

const DEG = Math.PI / 180;

// Direction the glyph body points after rotating by angle.
function body(angle: number): [number, number] {
  return [-Math.sin(angle), Math.cos(angle)];
}

describe('classifySupport', () => {
  it.each([
    [true, true, true, 'fixed'],
    [true, true, false, 'pin'],
    [false, true, true, 'slider'],
    [true, false, true, 'verticalSlider'],
    [false, true, false, 'roller'],
    [true, false, false, 'verticalRoller'],
    [false, false, true, 'rotationOnly'],
    [false, false, false, null],
  ])('ux=%s uy=%s rz=%s -> %s', (ux, uy, rz, kind) => {
    expect(classifySupport(ux, uy, rz)).toBe(kind);
  });

  it('every kind references an existing glyph', () => {
    for (const spec of Object.values(SUPPORT_KINDS)) {
      expect(GLYPH_DEFS).toHaveProperty(spec.glyph);
    }
  });
});

describe('angleAwayFromElements', () => {
  const node = { x: 0, z: 0 };

  it('beam end: body points away from the beam', () => {
    const angle = angleAwayFromElements(node, [{ x: -1000, z: 0 }])!;
    const [bx, bz] = body(angle);
    expect(bx).toBeCloseTo(1);
    expect(bz).toBeCloseTo(0);
  });

  it('vertical column end: body points away along the axis', () => {
    // Column goes up (negative z); the support hangs below.
    const angle = angleAwayFromElements(node, [{ x: 0, z: -3000 }])!;
    const [bx, bz] = body(angle);
    expect(bx).toBeCloseTo(0);
    expect(bz).toBeCloseTo(1);
  });

  it('corner: body bisects away from both elements', () => {
    const angle = angleAwayFromElements(node, [
      { x: -1000, z: 0 },
      { x: 0, z: -1000 },
    ])!;
    const [bx, bz] = body(angle);
    expect(bx).toBeCloseTo(Math.SQRT1_2);
    expect(bz).toBeCloseTo(Math.SQRT1_2);
  });

  it('continuous run: uses the element axis', () => {
    const angle = angleAwayFromElements(node, [
      { x: -1000, z: 0 },
      { x: 1000, z: 0 },
    ])!;
    const [bx, bz] = body(angle);
    expect(Math.abs(bx)).toBeCloseTo(1);
    expect(bz).toBeCloseTo(0);
  });

  it('no usable elements -> null', () => {
    expect(angleAwayFromElements(node, [])).toBeNull();
    expect(angleAwayFromElements(node, [node])).toBeNull();
  });

  it('bodyAngleToward round-trips', () => {
    for (const deg of [0, 30, 90, 135, -120]) {
      const [dx, dz] = [Math.cos(deg * DEG), Math.sin(deg * DEG)];
      const [bx, bz] = body(bodyAngleToward(dx, dz));
      expect(bx).toBeCloseTo(dx);
      expect(bz).toBeCloseTo(dz);
    }
  });
});

describe('collectSupportInstances', () => {
  function model(
    bcs: SupportModel['boundaryConditions'],
    elements: [string, string][] = [['a', 'b']]
  ): SupportModel {
    return {
      nodes: new Map([
        ['a', { pos: { x: 0, z: 0 } }],
        ['b', { pos: { x: 1000, z: 0 } }],
      ]),
      elements: new Map(
        elements.map(([p, q], i) => [String(i), { nodeIDs: [p, q] as const }])
      ),
      boundaryConditions: bcs,
    };
  }

  it('pin keeps the user rotation and ignores elements', () => {
    const [pin] = collectSupportInstances(
      model(
        new Map([
          ['a', { nodeId: 'a', rotation: 0.3, dirichlet: { 0: 0, 1: 0 } }],
        ])
      )
    );
    expect(pin.glyph).toBe('pin');
    expect(pin.angle).toBeCloseTo(0.3);
  });

  it('roller turns 90 degrees depending on the constrained DOF', () => {
    const [uy, ux] = collectSupportInstances(
      model(
        new Map([
          ['a', { nodeId: 'a', rotation: 0, dirichlet: { 1: 0 } }],
          ['b', { nodeId: 'b', rotation: 0, dirichlet: { 0: 0 } }],
        ])
      )
    );
    expect(uy.angle).toBeCloseTo(0);
    expect(ux.angle).toBeCloseTo(-90 * DEG);
    // Constraint along local x: the body points along +x.
    const [bx, bz] = body(ux.angle);
    expect(bx).toBeCloseTo(1);
    expect(bz).toBeCloseTo(0);
  });

  it('fixed support orients away from its element, ignoring rotation', () => {
    const [fixed] = collectSupportInstances(
      model(
        new Map([
          [
            'a',
            { nodeId: 'a', rotation: 1.0, dirichlet: { 0: 0, 1: 0, 2: 0 } },
          ],
        ])
      )
    );
    const [bx, bz] = body(fixed.angle);
    expect(bx).toBeCloseTo(-1);
    expect(bz).toBeCloseTo(0);
  });

  it('fixed support without elements falls back to rotation', () => {
    const [fixed] = collectSupportInstances(
      model(
        new Map([
          [
            'a',
            { nodeId: 'a', rotation: 0.5, dirichlet: { 0: 0, 1: 0, 2: 0 } },
          ],
        ]),
        []
      )
    );
    expect(fixed.angle).toBeCloseTo(0.5);
  });

  it('springs add glyphs for non-fixed DOFs only', () => {
    const out = collectSupportInstances(
      model(
        new Map([
          [
            'a',
            {
              nodeId: 'a',
              rotation: 0,
              dirichlet: { 1: 0 },
              spring: { 0: { stiffness: 1 }, 1: { stiffness: 1 } },
            },
          ],
        ])
      )
    );
    expect(out.map((i) => i.glyph)).toEqual(['roller', 'springTranslation']);
    expect(out[1].angle).toBeCloseTo(-90 * DEG);
  });

  it('skips boundary conditions on missing nodes', () => {
    expect(
      collectSupportInstances(
        model(
          new Map([['zz', { nodeId: 'zz', rotation: 0, dirichlet: { 0: 0 } }]])
        )
      )
    ).toEqual([]);
  });
});
