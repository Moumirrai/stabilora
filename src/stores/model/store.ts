import { writable } from 'svelte/store';
import type { Model, Node, Element } from './model.types';
import { v4 as uuidv4 } from 'uuid';

// initial state for the model

const initDebugModel = (): Model => {
  const nodes: Node[] = [
    { id: uuidv4(), name: 1, dx: -6000, dy: 0 }, //0
    { id: uuidv4(), name: 2, dx: -2000, dy: 0 }, //1
    { id: uuidv4(), name: 3, dx: 2000, dy: 0 }, //2
    { id: uuidv4(), name: 4, dx: 6000, dy: 0 }, //3
    { id: uuidv4(), name: 5, dx: 4000, dy: -3000 }, //4
    { id: uuidv4(), name: 5, dx: 0, dy: -3000 }, //5
    { id: uuidv4(), name: 5, dx: -4000, dy: -3000 }, //6
  ];
  const elements: Element[] = [
    { id: uuidv4(), nodeA: nodes[0], nodeB: nodes[1] },
    { id: uuidv4(), nodeA: nodes[1], nodeB: nodes[2] },
    { id: uuidv4(), nodeA: nodes[2], nodeB: nodes[3] },
    { id: uuidv4(), nodeA: nodes[3], nodeB: nodes[4] },
    { id: uuidv4(), nodeA: nodes[4], nodeB: nodes[5] },
    { id: uuidv4(), nodeA: nodes[5], nodeB: nodes[6] },
    { id: uuidv4(), nodeA: nodes[6], nodeB: nodes[0] },
    { id: uuidv4(), nodeA: nodes[1], nodeB: nodes[6] },
    { id: uuidv4(), nodeA: nodes[1], nodeB: nodes[5] },
    { id: uuidv4(), nodeA: nodes[2], nodeB: nodes[5] },
    { id: uuidv4(), nodeA: nodes[2], nodeB: nodes[4] },
  ];
  return { nodes, elements };
};

const initialModel: Model = initDebugModel();

// create the writable store
export const internalStore = writable<Model>(initialModel);

export const modelStore = {
  subscribe: internalStore.subscribe,
};

/* const addNode = (x: number, y: number, name?: number): Node => {
    const nodeName = name === undefined ? generateNextNodeName() : name;
    const newNode: Node = { id: uuidv4(), name: nodeName, dx: x, dy: y };
    update(model => ({
        ...model,
        nodes: [...model.nodes, newNode]
    }));
    return newNode;
};

const generateNextNodeName = (): number => {
    const currentModel = get({ subscribe }); // Use get to read current state
    if (currentModel.nodes.length === 0) {
        return 1;
    }
    const maxName = Math.max(...currentModel.nodes.map(n => n.name));
    return maxName + 1;
};

const isNodeNameUsed = (name: number): boolean => {
    const currentModel = get({ subscribe }); // Use get to read current state
    return currentModel.nodes.some(n => n.name === name);
};

const deleteNode = (id: string) => {
    update(model => {
        const remainingNodes = model.nodes.filter(n => n.id !== id);
        const remainingElements = model.elements.filter(
            el => el.nodeA.id !== id && el.nodeB.id !== id
        );
        return { nodes: remainingNodes, elements: remainingElements };
    });
};

const addElement = (nodeAId: string, nodeBId: string): Element | null => {
    let newElement: Element | null = null;
    update(model => {
        const nodeA = model.nodes.find(n => n.id === nodeAId);
        const nodeB = model.nodes.find(n => n.id === nodeBId);
        if (nodeA && nodeB) {
            newElement = { id: uuidv4(), nodeA, nodeB };
            return { ...model, elements: [...model.elements, newElement] };
        }
        return model;
    });
    return newElement;
};

const deleteElement = (id: string) => {
    update(model => ({
        ...model,
        elements: model.elements.filter(el => el.id !== id)
    }));
};

const resetModel = () => {
    set({ nodes: [], elements: [] });
}; */

/* export const modelStore = {
    subscribe,
    set, // allow replacing the whole state
    reset: resetModel,
    addNode,
    deleteNode,
    addElement,
    deleteElement,
}; */
