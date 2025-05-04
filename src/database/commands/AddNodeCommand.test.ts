import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AddNodeCommand } from './AddNodeCommand';
import { internalStore } from '../../stores/model/store';
import { get } from 'svelte/store';
import type { Model, Node, Element } from '../../stores/model/model.types';

// helper function to get the current store value easily
const getCurrentModel = (): Model => get(internalStore);

// helper to reset the store and mocks
const resetTestState = (initialModel: Model = { nodes: [], elements: [] }) => {
    internalStore.set(initialModel); // reset store to a specific state
};

describe('AddNodeCommand', () => {


    beforeEach(() => {
        resetTestState();
        // provide default mock implementations
    });

    it('should add a node with specified name when do() is called', () => {
        const command = new AddNodeCommand(10, 20, 5);

        // action
        command.do();
        const model = getCurrentModel();

        // assertions
        expect(model.nodes.length).toBe(1);
        const addedNode = model.nodes[0];
        expect(addedNode.dx).toBe(10);
        expect(addedNode.dy).toBe(20);
        expect(addedNode.name).toBe(5); // specified name
        expect(model.elements).toEqual([]);
    });

    it('should autoincrement largest node name when creating new one', () => {
        const initialNode: Node = { id: 'debug', name: 42, dx: 0, dy: 0 }; // use a distinct id
        resetTestState({ nodes: [initialNode], elements: [] });
        const command = new AddNodeCommand(30, 40); // no name provided

        // action
        command.do();
        const model = getCurrentModel();

        // assertions
        expect(model.nodes.length).toBe(2);
        const addedNode = model.nodes[1];
        expect(addedNode.dx).toBe(30);
        expect(addedNode.dy).toBe(40);
        expect(addedNode.name).toBe(43); // generated name
        expect(model.elements).toEqual([]);
    });

    it('should remove the added node when undo() is called', () => {
        const command = new AddNodeCommand(10, 20, 1);

        // action: do then undo
        command.do();
        expect(getCurrentModel().nodes.length).toBe(1); // verify node was added
        command.undo();
        const model = getCurrentModel();

        // assertions
        expect(model.nodes.length).toBe(0);
        expect(model.elements.length).toBe(0);
    });

    it('should remove the correct node when undo() is called with multiple nodes present', () => {
        // setup: add an initial node directly to the store
        const initialNode: Node = { id: 'initial-node-id', name: 100, dx: 0, dy: 0 }; // use a distinct id
        resetTestState({ nodes: [initialNode], elements: [] });

        const command = new AddNodeCommand(50, 60, 2); // command for the second node

        // action: do then undo
        command.do();
        let modelAfterDo = getCurrentModel();
        expect(modelAfterDo.nodes.length).toBe(2); // verify second node was added

        // get the id of the node that was actually created by the command
        const createdNode = (command as any).createdNode as Node | undefined;
        expect(createdNode).toBeDefined(); // ensure the command stored the created node
        const idToRemove = createdNode!.id;

        // verify the created node is in the store
        expect(modelAfterDo.nodes.some(n => n.id === idToRemove)).toBe(true);

        command.undo();
        let modelAfterUndo = getCurrentModel();

        // assertions
        expect(modelAfterUndo.nodes.length).toBe(1);
        expect(modelAfterUndo.nodes[0].id).toBe(initialNode.id); // initial node should remain
        expect(modelAfterUndo.nodes.some(n => n.id === idToRemove)).toBe(false); // command's node should be gone
        expect(modelAfterUndo.elements.length).toBe(0);
    });

    it('should remove associated elements when undo() is called', () => {
        // setup: add two nodes and an element connecting them
        const nodeA: Node = { id: 'debug', name: 1, dx: 0, dy: 0 };
        const nodeBData = { x: 100, y: 100, name: 2 };
        const commandForNodeB = new AddNodeCommand(nodeBData.x, nodeBData.y, nodeBData.name);

        // add node a directly
        resetTestState({ nodes: [nodeA], elements: [] });

        // add node b using the command
        commandForNodeB.do();
        const nodeB = getCurrentModel().nodes.find(n => n.name === nodeBData.name)!;
        expect(nodeB).toBeDefined();

        // TODO: add an element connecting a and b directly to the store for this test

        expect(getCurrentModel().nodes.length).toBe(2);
        expect(getCurrentModel().elements.length).toBe(1);

        // action: undo adding node b
        commandForNodeB.undo();
        const model = getCurrentModel();

        // assertions
        expect(model.nodes.length).toBe(1);
        expect(model.nodes[0].id).toBe('debug'); // node a should remain
        expect(model.elements.length).toBe(0); // element should be removed
    });

    it('should handle do() when node was already created (redo scenario)', () => {
        const command = new AddNodeCommand(10, 20, 1);

        // simulate initial creation and storage
        command.do();
        const createdNodeInstance = (command as any).createdNode;
        expect(createdNodeInstance).toBeDefined();
        expect(getCurrentModel().nodes.length).toBe(1);

        // simulate undo (remove from store but command retains creatednode)
        command.undo();
        expect(getCurrentModel().nodes.length).toBe(0);

        // call do() again
        command.do();
        const model = getCurrentModel();

        // assertions
        expect(model.nodes.length).toBe(1);
        expect(model.nodes[0]).toBe(createdNodeInstance); // should re-add the stored instance
    });

    it('should handle undo() when createdNode is not set (e.g., command never executed)', () => {
        const command = new AddNodeCommand(10, 20, 1);
        const initialState = getCurrentModel();

        // action: call undo without calling do first
        command.undo();
        const finalState = getCurrentModel();

        // assertions
        expect(finalState).toEqual(initialState); // state should remain unchanged
        expect(finalState.nodes.length).toBe(0);
    });
});