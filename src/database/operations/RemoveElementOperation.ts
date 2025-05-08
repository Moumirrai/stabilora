import type { IOperation } from '../IOperation';
import { internalStore } from '../../stores/model/store';
import type { Element } from '../../stores/model/model.types';
import { get } from 'svelte/store';

export class RemoveElementOperation implements IOperation {
  private readonly elementIdToRemove: string;
  private removedElement?: Element;

  constructor(elementIdToRemove: string) {
    this.elementIdToRemove = elementIdToRemove;
  }

  do(): void {
    const modelState = get(internalStore);
    const elementToRemove = modelState.elements?.find(
      (el) => el.id === this.elementIdToRemove
    );

    if (!elementToRemove) {
      console.warn(
        `RemoveElementOperation: Element with ID "${this.elementIdToRemove}" not found. Nothing to remove.`
      );
      return;
    }

    this.removedElement = elementToRemove; // Store the element before removing

    internalStore.update((model) => {
      const remainingElements = (model.elements || []).filter(
        (el) => el.id !== this.elementIdToRemove
      );
      return {
        ...model,
        elements: remainingElements,
      };
    });
  }

  undo(): void {
    if (this.removedElement) {
      internalStore.update((model) => {
        // Ensure no duplicate if element somehow got re-added by another means
        if (model.elements?.find((el) => el.id === this.removedElement!.id)) {
          return model;
        }
        return {
          ...model,
          elements: [...(model.elements || []), this.removedElement!],
        };
      });
    } else {
      console.warn(
        `RemoveElementOperation: No element was removed previously for ID "${this.elementIdToRemove}". Nothing to undo.`
      );
    }
  }
}
