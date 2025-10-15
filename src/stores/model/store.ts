import { writable } from 'svelte/store';
import type { Model, Node, Element } from './model.types';
import { v4 as uuidv4 } from 'uuid';
import RBush from 'rbush';
import type { SpatialItem } from './ISpatialItem';

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

export const spatialIndex = new RBush<SpatialItem>();

export const reindexModel = (currentModel: Model) => {
  spatialIndex.clear();
  let items: SpatialItem[] = [];
  if (currentModel.nodes) {
    items = currentModel.nodes.map((node) => ({
      minX: node.dx,
      minY: node.dy,
      maxX: node.dx,
      maxY: node.dy,
      id: node.id,
    }));
  }
  if (currentModel.elements) {
    const elementItems = currentModel.elements.map((element) => {
      const minX = Math.min(element.nodeA.dx, element.nodeB.dx);
      const minY = Math.min(element.nodeA.dy, element.nodeB.dy);
      const maxX = Math.max(element.nodeA.dx, element.nodeB.dx);
      const maxY = Math.max(element.nodeA.dy, element.nodeB.dy);
      return {
        minX,
        minY,
        maxX,
        maxY,
        id: element.id,
      };
    });
    items = items.concat(elementItems);
  }
  if (items.length > 0) {
    spatialIndex.load(items);
  }
}
// create the writable store
export const internalStore = writable<Model>(initialModel);

export const modelStore = {
  subscribe: internalStore.subscribe,
};

// create preview store
export const previewStore = writable<Model>({
  nodes: [],
  elements: [],
});
