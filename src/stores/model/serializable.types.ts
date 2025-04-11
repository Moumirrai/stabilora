export interface SerializableModel {
    elements: SerializableElement[];
    nodes: SerializableNode[];
    loadCases: LoadCase[];
}

export interface SerializableElement {
    id: string;
    nodeAId: string; // Reference by ID for serialization
    nodeBId: string; // Reference by ID for serialization
    loads: Record<string, SerializableElementLoad>; // loadCaseId -> load
}

export interface SerializableNode {
    id: string;
    name: number;
    dx: number;
    dy: number;
    constraint: NodeConstraint;
    loads: Record<string, SerializableNodeLoad>; // loadCaseId -> load
}

export interface LoadCase {
    id: string;
    name: string;
}

export interface SerializableElementLoad {
    id: string;
    type: 'constant' | 'pointForce' | 'pointMoment';
    start?: number;
    end?: number;
    position?: number;
    value: number;
    direction?: number;
}

export interface SerializableNodeLoad {
    id: string;
    type: 'force' | 'moment';
    value: number;
    direction?: number;
}

export enum NodeConstraint {
    NONE = 0,
    FIXED = 1,
    ROLLER = 2,
    VROLLER = 3,
    PINNED = 4,
}

export enum ElementLoadType {
    POINT = 'point',
    UNIFORM = 'uniform',
    TRAPEZOIDAL = 'trapezoidal',

}