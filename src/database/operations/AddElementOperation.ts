import type { IOperation } from '../IOperation';
import { internalStore } from '../../stores/model/store';
import type { Element } from '../../stores/model/model.types';
import { v4 as uuidv4 } from 'uuid';
import { get } from 'svelte/store';

export class AddElementOperation implements IOperation {
  private readonly nodeAId: string;
  private readonly nodeBId: string;
  private createdElement?: Element;
  public id: string;

  constructor(nodeAId: string, nodeBId: string) {
    this.nodeAId = nodeAId;
    this.nodeBId = nodeBId;
    this.id = uuidv4();
  }

  do(): boolean {
    if (this.createdElement) {
      // If redoing, the element already exists with correct node references
      internalStore.update((model) => ({
        ...model,
        elements: [...(model.elements || []), this.createdElement!],
      }));
      return true; // exit early as we just re-added the existing element
    }

    const modelState = get(internalStore);
    const nodeA = modelState.nodes?.find((n) => n.id === this.nodeAId);
    const nodeB = modelState.nodes?.find((n) => n.id === this.nodeBId);

    if (!nodeA || !nodeB) {
      console.error(
        'AddElementOperation: Could not find one or both nodes by ID.',
        {
          nodeAId: this.nodeAId,
          nodeBId: this.nodeBId,
        }
      );
      return false;
    }

    const newElement: Element = {
      id: this.id,
      nodeA: nodeA,
      nodeB: nodeB,
    };

    internalStore.update((model) => {
      const elements = model.elements || [];
      return {
        ...model,
        elements: [...elements, newElement],
      };
    });

    // store the newly created element object
    this.createdElement = newElement;
    return true;
  }

  undo(): boolean {
    if (this.createdElement) {
      const elementIdToRemove = this.createdElement.id;
      internalStore.update((model) => {
        const remainingElements = (model.elements || []).filter(
          (el) => el.id !== elementIdToRemove
        );
        return {
          ...model,
          elements: remainingElements,
        };
      });
      return true;
    }
    console.warn(
      `AddElementOperation: No element was created previously for ID "${this.id}". Nothing to undo.`
    );
    return false;
  }
}
