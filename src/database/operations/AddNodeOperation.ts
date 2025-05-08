import type { IOperation } from '../IOperation';
import { internalStore } from '../../stores/model/store'; // (or wherever you keep your internal API)
import { generateNextNodeName } from '../Helpers';
import type { Node } from '../../stores/model/model.types';
import { v4 as uuidv4 } from 'uuid';

export class AddNodeOperation implements IOperation {
  private readonly x: number;
  private readonly y: number;
  private readonly name?: number;
  private createdNode?: Node;
  public id: string;

  constructor(x: number, y: number, name?: number) {
    this.x = x;
    this.y = y;
    this.name = name;
    this.id = uuidv4();
  }

  do(): void {
    if (this.createdNode) {
      const nodeToAdd = this.createdNode;
      internalStore.update((model) => ({
        ...model,
        nodes: [...(model.nodes || []), nodeToAdd],
      }));
      return; // exit early as we just re-added the existing node
    }
    const assignedName =
      this.name === undefined ? generateNextNodeName() : this.name;
    const newNode: Node = {
      id: this.id,
      name: assignedName,
      dx: this.x,
      dy: this.y,
    };

    internalStore.update((model) => {
      const nodes = model.nodes || [];
      return {
        ...model,
        nodes: [...nodes, newNode],
      };
    });

    this.createdNode = newNode;
  }

  undo(): void {
    if (this.createdNode) {
      const nodeIdToRemove = this.createdNode.id;
      internalStore.update((model) => {
        const remainingNodes = (model.nodes || []).filter(
          (n) => n.id !== nodeIdToRemove
        );
        const remainingElements = (model.elements || []).filter(
          (el) =>
            el.nodeA.id !== nodeIdToRemove && el.nodeB.id !== nodeIdToRemove
        );
        return {
          ...model,
          nodes: remainingNodes,
          elements: remainingElements,
        };
      });
    }
  }
}
