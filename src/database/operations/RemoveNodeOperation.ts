import type { IOperation } from '../IOperation';
import { internalStore } from '../../stores/model/store';
import type { Node } from '../../stores/model/model.types';
import { v4 as uuidv4 } from 'uuid';
import { get } from 'svelte/store';

export class RemoveNodeOperation implements IOperation {
  private readonly nodeIdToRemove: string;
  private removedNode?: Node;
  public id: string;

  constructor(nodeIdToRemove: string) {
    this.nodeIdToRemove = nodeIdToRemove;
    this.id = uuidv4();
  }

  do(): void {
    const modelState = get(internalStore);
    const nodeToRemove = modelState.nodes?.find(
      (n) => n.id === this.nodeIdToRemove
    );

    if (!nodeToRemove) {
      console.warn(
        `RemoveNodeOperation: Node with ID "${this.nodeIdToRemove}" not found. Nothing to remove.`
      );
      return;
    }

    // check for connected elements
    const isConnected = modelState.elements?.some(
      (el) =>
        el.nodeA.id === this.nodeIdToRemove ||
        el.nodeB.id === this.nodeIdToRemove
    );

    if (isConnected) {
      console.error(
        `RemoveNodeOperation: Node "${nodeToRemove.name}" (ID: ${this.nodeIdToRemove}) cannot be removed because it has connected elements.`
      );
      // TODO: throw error
      return;
    }

    this.removedNode = nodeToRemove; // store the node before removing

    internalStore.update((model) => {
      const remainingNodes = (model.nodes || []).filter(
        (n) => n.id !== this.nodeIdToRemove
      );
      return {
        ...model,
        nodes: remainingNodes,
      };
    });
  }

  undo(): void {
    if (this.removedNode) {
      internalStore.update((model) => {
        // Ensure no duplicate if node somehow got re-added by another means
        if (model.nodes?.find((n) => n.id === this.removedNode!.id)) {
          return model;
        }
        return {
          ...model,
          nodes: [...(model.nodes || []), this.removedNode!],
        };
      });
    } else {
      console.warn(
        `RemoveNodeOperation: No node was removed previously for ID "${this.nodeIdToRemove}" (or removal was prevented). Nothing to undo.`
      );
    }
  }
}
