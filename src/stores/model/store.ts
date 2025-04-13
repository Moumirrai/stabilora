import { writable } from 'svelte/store';
import type { Model, Node, Element } from './model.types';
import { v4 as uuidv4 } from 'uuid';

// initial state for the model
const initialModel: Model = {
    nodes: [
        { id: uuidv4(), name: 1, dx: 0, dy: 0 },
        { id: uuidv4(), name: 2, dx: 100, dy: 0 },
        { id: uuidv4(), name: 3, dx: 100, dy: 100 },
        { id: uuidv4(), name: 4, dx: 0, dy: 100 },
    ],
    elements: [],
};

// create the writable store
const { subscribe, set, update } = writable<Model>(initialModel);

const addNode = (x: number, y: number, name: number): Node => {
    const newNode: Node = { id: uuidv4(), name, dx: x, dy: y };
    update(model => ({
        ...model,
        nodes: [...model.nodes, newNode]
    }));
    return newNode;
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
};


export const modelStore = {
    subscribe,
    set, // allow replacing the whole state
    reset: resetModel,
    addNode,
    deleteNode,
    addElement,
    deleteElement,
};