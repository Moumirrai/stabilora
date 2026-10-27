import {
  Model,
  Material,
  NodalLoad,
  LoadCaseType,
  Transaction,
  AddCrossectionOperation,
  AddElementOperation,
  AddLoadCaseOperation,
  AddMaterialOperation,
  AddNodeOperation,
  AddLoadOperation,
  AddBoundaryConditionOperation,
} from '@stabilora/arcora';

const BAY_L = 6; // m
const STOREY_H = 3.5; // m

interface Frame {
  model: Model;
  loadCaseID: string;
  material: Material;
  windLoads: NodalLoad[];
  roofLoads: NodalLoad[];
}

export function buildFrame(bays: number, storeys: number): Transaction {
  const ts = new Transaction('Load demo frame');

  const material = new AddMaterialOperation({
    alpha: 1.2e-5,
    density: 7850,
    E: 210e9,
    G: 81e9,
  });

  ts.addCommand(material);

  const xs = new AddCrossectionOperation({
    area: 0.02,
    Iy: 8.33e-5,
    Iz: 8.33e-5,
  });

  ts.addCommand(xs);

  const lc = new AddLoadCaseOperation({
    name: 'Wind+Dead',
    type: LoadCaseType.Live,
    selfWeight: false,
  });

  ts.addCommand(lc);

  const rows: string[][] = [];
  for (let j = 0; j <= storeys; j++) {
    const row: string[] = [];
    for (let i = 0; i <= bays; i++) {
      const n = new AddNodeOperation({
        x: i * BAY_L,
        z: j * -STOREY_H,
        name: `${j * (bays + 1) + i}`,
      });
      ts.addCommand(n);
      row.push(n.id);
    }
    rows.push(row);
  }

  // Columns
  for (let j = 0; j < storeys; j++) {
    for (let i = 0; i <= bays; i++) {
      const el = new AddElementOperation({
        nodeIDs: [rows[j]![i]!, rows[j + 1]![i]!],
        materialID: material.id,
        crossectionID: xs.id,
      });
      ts.addCommand(el);
    }
  }

  // Beams
  for (let j = 1; j <= storeys; j++) {
    for (let i = 0; i < bays; i++) {
      const el = new AddElementOperation({
        nodeIDs: [rows[j]![i]!, rows[j]![i + 1]!],
        materialID: material.id,
        crossectionID: xs.id,
      });
      ts.addCommand(el);
    }
  }

  // Track nodes that already have boundary conditions assigned
  const assignedBcNodes = new Set<string>();

  // Fixed base
  for (let i = 0; i <= bays; i++) {
    const nodeId = rows[0]![i]!;
    if (!assignedBcNodes.has(nodeId)) {
      const bc = new AddBoundaryConditionOperation({
        nodeId,
        rotation: 0,
        dirichlet: { 0: 0, 1: 0, 2: 0 },
      });
      ts.addCommand(bc);
      assignedBcNodes.add(nodeId);
    }
  }

  // Wind load: lateral load applied along column line 0
  for (let j = 1; j <= storeys; j++) {
    const load = new AddLoadOperation({
      nodeID: rows[j]![0]!,
      type: 'nodal',
      loadCaseID: lc.id,
      Fx: 25000,
      Fy: 0,
      Mz: 0,
    });
    ts.addCommand(load);
  }

  // Gravity load: vertical load on top storey nodes
  for (let i = 0; i <= bays; i++) {
    const load = new AddLoadOperation({
      nodeID: rows[storeys]![i]!,
      type: 'nodal',
      loadCaseID: lc.id,
      Fx: 0,
      Fy: 120000,
      Mz: 0,
    });
    ts.addCommand(load);
  }

  return ts;
}
