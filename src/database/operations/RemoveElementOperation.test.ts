import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RemoveElementOperation } from './RemoveElementOperation';
import { internalStore } from '../../stores/model/store';
import { get } from 'svelte/store';
import type { Model, Node, Element } from '../../stores/model/model.types';

const getCurrentModel = (): Model => get(internalStore);
const resetTestState = (initialModel: Model = { nodes: [], elements: [] }) => {
  internalStore.set(initialModel);
};

describe('RemoveElementOperation', () => {
  let nodeA: Node;
  let nodeB: Node;
  let element1: Element;
  let element2: Element;

  beforeEach(() => {
    nodeA = { id: 'node-a', name: 1, dx: 0, dy: 0 };
    nodeB = { id: 'node-b', name: 2, dx: 0, dy: 0 };
    element1 = { id: 'el-1', nodeA, nodeB };
    element2 = { id: 'el-2', nodeA, nodeB }; // Another element for testing filtering

    resetTestState({ nodes: [nodeA, nodeB], elements: [element1, element2] });
    vi.restoreAllMocks();
  });

  it('should remove the specified element when do() is called', () => {
    const command = new RemoveElementOperation(element1.id);
    command.do();

    const model = getCurrentModel();
    expect(model.elements.length).toBe(1);
    expect(model.elements.find((el) => el.id === element1.id)).toBeUndefined();
    expect(model.elements[0]).toBe(element2);
    expect((command as any).removedElement).toBe(element1);
  });

  it('should re-add the removed element when undo() is called', () => {
    const command = new RemoveElementOperation(element1.id);
    command.do();
    expect(getCurrentModel().elements.length).toBe(1);

    command.undo();
    const model = getCurrentModel();
    expect(model.elements.length).toBe(2);
    expect(model.elements.find((el) => el.id === element1.id)).toEqual(
      element1
    );
  });

  it('should correctly remove element on redo after undo', () => {
    const command = new RemoveElementOperation(element1.id);
    command.do(); // remove el-1
    command.undo(); // re-add el-1
    command.do(); // remove el-1 again

    const model = getCurrentModel();
    expect(model.elements.length).toBe(1);
    expect(model.elements.find((el) => el.id === element1.id)).toBeUndefined();
    expect(model.elements[0]).toBe(element2);
  });

  it('undo before do does nothing', () => {
    const initialModel = getCurrentModel();
    const command = new RemoveElementOperation(element1.id);

    command.undo();
    const finalModel = getCurrentModel();
    expect(finalModel).toEqual(initialModel);
    expect((command as any).removedElement).toBeUndefined();
  });

  it('do() should do nothing and log warning if element not found', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const command = new RemoveElementOperation('non-existent-element');
    const initialElements = [...getCurrentModel().elements];

    command.do();

    expect(warnSpy).toHaveBeenCalledWith(
      'RemoveElementOperation: Element with ID "non-existent-element" not found. Nothing to remove.'
    );
    expect(getCurrentModel().elements).toEqual(initialElements);
    expect((command as any).removedElement).toBeUndefined();
    warnSpy.mockRestore();
  });

  it('undo() should do nothing and log warning if no element was previously removed', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const command = new RemoveElementOperation(element1.id);
    // 'do' is not called, so 'removedElement' is not set

    command.undo();

    expect(warnSpy).toHaveBeenCalledWith(
      `RemoveElementOperation: No element was removed previously for ID "${element1.id}". Nothing to undo.`
    );
    expect(getCurrentModel().elements.length).toBe(2); // No change
    warnSpy.mockRestore();
  });
});
