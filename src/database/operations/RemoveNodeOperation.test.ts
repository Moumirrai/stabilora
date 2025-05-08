import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RemoveNodeOperation } from './RemoveNodeOperation';
import { internalStore } from '../../stores/model/store';
import { get } from 'svelte/store';
import type { Model, Node, Element } from '../../stores/model/model.types';

const getCurrentModel = (): Model => get(internalStore);
const resetTestState = (initialModel: Model = { nodes: [], elements: [] }) => {
  internalStore.set(initialModel);
};

describe('RemoveNodeOperation', () => {
  let node1: Node;
  let node2: Node;
  let node3: Node; // Node to be removed (initially without connections)
  let element12: Element; // Element connecting node1 and node2

  beforeEach(() => {
    node1 = { id: 'node-1', name: 1, dx: 0, dy: 0 };
    node2 = { id: 'node-2', name: 2, dx: 10, dy: 0 };
    node3 = { id: 'node-3', name: 3, dx: 20, dy: 0 }; // Target for removal
    element12 = { id: 'el-12', nodeA: node1, nodeB: node2 };

    resetTestState({ nodes: [node1, node2, node3], elements: [element12] });
    vi.restoreAllMocks(); // Clears mocks and spies
  });

  it('should remove the specified node if it has no connected elements', () => {
    const command = new RemoveNodeOperation(node3.id);
    command.do();

    const model = getCurrentModel();
    expect(model.nodes.length).toBe(2);
    expect(model.nodes.find((n) => n.id === node3.id)).toBeUndefined();
    expect(model.nodes).toContain(node1);
    expect(model.nodes).toContain(node2);
    expect((command as any).removedNode).toBe(node3);
    expect(model.elements.length).toBe(1); // Elements should be untouched
  });

  it('should re-add the removed node when undo() is called', () => {
    const command = new RemoveNodeOperation(node3.id);
    command.do();
    expect(
      getCurrentModel().nodes.find((n) => n.id === node3.id)
    ).toBeUndefined();

    command.undo();
    const model = getCurrentModel();
    expect(model.nodes.length).toBe(3);
    expect(model.nodes.find((n) => n.id === node3.id)).toEqual(node3);
  });

  it('should correctly remove node on redo after undo', () => {
    const command = new RemoveNodeOperation(node3.id);
    command.do();
    command.undo();
    command.do();

    const model = getCurrentModel();
    expect(model.nodes.length).toBe(2);
    expect(model.nodes.find((n) => n.id === node3.id)).toBeUndefined();
  });

  it('undo before do does nothing', () => {
    const initialModel = getCurrentModel();
    const command = new RemoveNodeOperation(node3.id);

    command.undo();
    const finalModel = getCurrentModel();
    expect(finalModel).toEqual(initialModel);
    expect((command as any).removedNode).toBeUndefined();
  });

  it('do() should do nothing and log warning if node not found', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const command = new RemoveNodeOperation('non-existent-node');
    const initialNodes = [...getCurrentModel().nodes];

    command.do();

    expect(warnSpy).toHaveBeenCalledWith(
      'RemoveNodeOperation: Node with ID "non-existent-node" not found. Nothing to remove.'
    );
    expect(getCurrentModel().nodes).toEqual(initialNodes);
    expect((command as any).removedNode).toBeUndefined();
    warnSpy.mockRestore();
  });

  it('should NOT remove node and log error if it has connected elements', () => {
    // node2 is connected by element12
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const command = new RemoveNodeOperation(node2.id);
    const initialModel = getCurrentModel();

    command.do();

    expect(errorSpy).toHaveBeenCalledWith(
      `RemoveNodeOperation: Node "${node2.name}" (ID: ${node2.id}) cannot be removed because it has connected elements.`
    );
    const finalModel = getCurrentModel();
    expect(finalModel.nodes.length).toBe(initialModel.nodes.length);
    expect(finalModel.nodes.find((n) => n.id === node2.id)).toBe(node2);
    expect(finalModel.elements.length).toBe(initialModel.elements.length);
    expect((command as any).removedNode).toBeUndefined();
    errorSpy.mockRestore();
  });

  it('undo() should do nothing and log warning if no node was previously removed or removal was prevented', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Attempt to remove a connected node (do() will fail to remove)
    const commandWithConnectedNode = new RemoveNodeOperation(node1.id);
    vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress expected error from do()
    commandWithConnectedNode.do(); // This will prevent removal
    vi.restoreAllMocks(); // Restore console.error, keep warnSpy for next check
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    commandWithConnectedNode.undo(); // Should log warning because removedNode is undefined

    expect(warnSpy).toHaveBeenCalledWith(
      `RemoveNodeOperation: No node was removed previously for ID "${node1.id}" (or removal was prevented). Nothing to undo.`
    );
    expect(getCurrentModel().nodes.length).toBe(3); // No change
    warnSpy.mockRestore();
  });
});
