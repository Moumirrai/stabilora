import type { ICommand } from '../ICommand';
import { internalStore } from '../../stores/model/store'; // (or wherever you keep your internal API)
import { generateNextNodeName } from '../Helpers';
import type { Element, Node } from '../../stores/model/model.types';
import { v4 as uuidv4 } from 'uuid';
import { get } from 'svelte/store'; // Import get from svelte/store

export class AddElementCommand implements ICommand {
    private nodeAId: string; // Store Node A ID
    private nodeBId: string; // Store Node B ID
    private createdElement?: Element;
    public id: string;

    constructor(nodeAId: string, nodeBId: string) { // Accept IDs in constructor
        this.nodeAId = nodeAId;
        this.nodeBId = nodeBId;
        this.id = uuidv4();
    }

    do(): void {
        if (this.createdElement) {
            // If redoing, the element already exists with correct node references
            internalStore.update(model => ({
                ...model,
                elements: [...(model.elements || []), this.createdElement!]
            }));
            return; // exit early as we just re-added the existing element
        }

        // Retrieve nodes from the store using IDs
        const modelState = get(internalStore); // Get current state
        const nodeA = modelState.nodes?.find(n => n.id === this.nodeAId);
        const nodeB = modelState.nodes?.find(n => n.id === this.nodeBId);

        // Ensure both nodes were found
        if (!nodeA || !nodeB) {
            console.error("AddElementCommand: Could not find one or both nodes by ID.", { nodeAId: this.nodeAId, nodeBId: this.nodeBId });
            // Optionally throw an error or handle it differently
            return;
        }

        const newElement: Element = {
            id: this.id,
            nodeA: nodeA, // Use retrieved node objects
            nodeB: nodeB  // Use retrieved node objects
        };

        internalStore.update(model => {
            const elements = model.elements || [];
            return {
                ...model,
                elements: [...elements, newElement]
            };
        });

        // store the newly created element object
        this.createdElement = newElement;
    }

    undo(): void {
        if (this.createdElement) {
            const elementIdToRemove = this.createdElement.id; // Use the element's ID
            internalStore.update(model => {
                const remainingElements = (model.elements || []).filter(el => el.id !== elementIdToRemove);
                return {
                    ...model,
                    elements: remainingElements
                };
            });
        }
    }
}