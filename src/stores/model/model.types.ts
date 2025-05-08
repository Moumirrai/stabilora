export interface Model {
  elements: Element[];
  nodes: Node[];
  //loadCases: LoadCase[];
}

export interface Element {
  id: string;
  nodeA: Node; // Direct reference
  nodeB: Node; // Direct reference
  //loads: Record<string, ElementLoad>; // loadCaseId -> loads
}

export interface Node {
  id: string;
  name: number;
  dx: number;
  dy: number;
  //constraint: NodeConstraint;
  //loads: Record<string, NodeLoad>; // loadCaseId -> loads
}

/* // Strongly typed loads
export interface BaseLoad {
    id: string;
}

export interface ElementLoad extends BaseLoad {}

export interface ConstantElementLoad extends ElementLoad {
    type: 'constant';
    start: number;
    end: number;
    value: number;
    direction: number;
}

export interface PointForceElementLoad extends ElementLoad {
    type: 'pointForce';
    position: number;
    value: number;
    direction: number;
}

export interface PointMomentElementLoad extends ElementLoad {
    type: 'pointMoment';
    position: number;
    value: number;
}

export interface NodeLoad extends BaseLoad {}

export interface PointForceNodeLoad extends NodeLoad {
    type: 'force';
    value: number;
    direction: number;
}

export interface PointMomentNodeLoad extends NodeLoad {
    type: 'moment';
    value: number;
} */
