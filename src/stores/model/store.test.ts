import { describe, it, expect, beforeEach } from 'vitest';
import { modelStore } from './store'; // Import the store implementation
import { get } from 'svelte/store';
import type { Model, Node, Element } from './model.types';

// Helper function to get the current store value easily
const getCurrentModel = (): Model => get(modelStore);

describe('modelStore', () => {
    // Reset the store to a known empty state before each test
    beforeEach(() => {
        modelStore.reset(); // Use the reset function from the store
    });

    it('should initialize with an empty model after reset', () => {
        const model = getCurrentModel();
        expect(model.nodes).toEqual([]);
        expect(model.elements).toEqual([]);
    });

    it('should add the first node', () => {
        // Action: Add a node
        const addedNode = modelStore.addNode(10, 20, 1);
        const model = getCurrentModel();

        // Assertions
        expect(model.nodes.length).toBe(1);
        const nodeInStore = model.nodes[0];
        expect(nodeInStore.id).toBe(addedNode.id); // Check if the returned node is the one in store
        expect(nodeInStore.dx).toBe(10);
        expect(nodeInStore.dy).toBe(20);
        expect(nodeInStore.id).toBeTypeOf('string');
        // Note: The current implementation doesn't auto-increment names,
        // it uses the provided name or defaults to 0. Let's test the default.
        expect(nodeInStore.name).toBe(1);
        expect(model.elements.length).toBe(0); // No elements should exist yet
    });

    it('should add a second node', () => {
        // Action: Add two nodes
        const node1 = modelStore.addNode(10, 20, 1);
        const node2 = modelStore.addNode(50, 60, 2); // Provide a name for the second node
        const model = getCurrentModel();

        // Assertions
        expect(model.nodes.length).toBe(2);
        expect(model.nodes[0].id).toBe(node1.id);
        expect(model.nodes[0].dx).toBe(10);
        expect(model.nodes[0].dy).toBe(20);
        expect(model.nodes[0].name).toBe(1); // Default name

        expect(model.nodes[1].id).toBe(node2.id);
        expect(model.nodes[1].dx).toBe(50);
        expect(model.nodes[1].dy).toBe(60);
        expect(model.nodes[1].name).toBe(2); // Explicitly provided name

        expect(model.elements.length).toBe(0);
    });

    it('should add an element connecting two existing nodes', () => {
        // Setup: Add two nodes
        const nodeA = modelStore.addNode(0, 0, 1);
        const nodeB = modelStore.addNode(100, 50, 2);

        // Action: Add an element connecting them
        const addedElement = modelStore.addElement(nodeA.id, nodeB.id);
        const model = getCurrentModel();

        // Assertions
        expect(model.nodes.length).toBe(2); // Nodes should still be there
        expect(model.elements.length).toBe(1);

        const elementInStore = model.elements[0];
        expect(elementInStore).not.toBeNull(); // Check if element was actually created
        expect(elementInStore.id).toBe(addedElement?.id); // Check if the returned element is the one in store
        expect(elementInStore.id).toBeTypeOf('string');
        expect(elementInStore.nodeA.id).toBe(nodeA.id); // Check connection by ID
        expect(elementInStore.nodeB.id).toBe(nodeB.id); // Check connection by ID
        // Optionally check object references if important
        expect(elementInStore.nodeA).toBe(nodeA);
        expect(elementInStore.nodeB).toBe(nodeB);
    });

    // --- Add more tests below for deletion, edge cases, etc. ---

});