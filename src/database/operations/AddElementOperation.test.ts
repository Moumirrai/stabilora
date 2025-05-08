import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AddElementOperation } from './AddElementOperation';
import { internalStore } from '../../stores/model/store';
import { get } from 'svelte/store';
import type { Model, Node, Element } from '../../stores/model/model.types';

const getCurrentModel = (): Model => get(internalStore);
const resetTestState = (initialModel: Model = { nodes: [], elements: [] }) => {
  internalStore.set(initialModel);
};

describe('AddElementOperation', () => {
  beforeEach(() => {
    resetTestState();
    vi.restoreAllMocks();
  });

  it('should add element connecting specified nodes when do() is called', () => {
    const nodeA: Node = { id: 'node-1', name: 1, dx: 0, dy: 0 };
    const nodeB: Node = { id: 'node-2', name: 2, dx: 0, dy: 0 };
    resetTestState({ nodes: [nodeA, nodeB], elements: [] });

    const command = new AddElementOperation(nodeA.id, nodeB.id);
    command.do();

    const model = getCurrentModel();
    expect(model.elements.length).toBe(1);

    const added: Element = model.elements[0];
    expect(added.id).toBe(command.id);
    expect(added.nodeA).toBe(nodeA);
    expect(added.nodeB).toBe(nodeB);

    // ensure nodes unchanged
    expect(model.nodes).toEqual([nodeA, nodeB]);
  });

  it('should remove the element when undo() is called', () => {
    const nodeA: Node = { id: 'a', name: 1, dx: 0, dy: 0 };
    const nodeB: Node = { id: 'b', name: 2, dx: 0, dy: 0 };
    resetTestState({ nodes: [nodeA, nodeB], elements: [] });

    const command = new AddElementOperation(nodeA.id, nodeB.id);
    command.do();
    expect(getCurrentModel().elements.length).toBe(1);

    command.undo();
    expect(getCurrentModel().elements.length).toBe(0);
  });

  it('should re-add the same element instance on redo', () => {
    const nodeA: Node = { id: 'x', name: 1, dx: 0, dy: 0 };
    const nodeB: Node = { id: 'y', name: 2, dx: 0, dy: 0 };
    resetTestState({ nodes: [nodeA, nodeB], elements: [] });

    const command = new AddElementOperation(nodeA.id, nodeB.id);
    command.do();
    command.undo();
    command.do();

    const model = getCurrentModel();
    expect(model.elements.length).toBe(1);
    expect(model.elements[0]).toBe((command as any).createdElement);
  });

  it('undo before do does nothing', () => {
    const initial = getCurrentModel();
    const command = new AddElementOperation('no', 'nodes');

    command.undo();
    const final = getCurrentModel();
    expect(final).toEqual(initial);
  });

  it('should not add and log error if nodes not found', () => {
    const nodeA: Node = { id: 'only', name: 1, dx: 0, dy: 0 };
    resetTestState({ nodes: [nodeA], elements: [] });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const command = new AddElementOperation(nodeA.id, 'missing');
    command.do();

    expect(errorSpy).toHaveBeenCalled();
    expect(getCurrentModel().elements).toEqual([]);
  });
});
