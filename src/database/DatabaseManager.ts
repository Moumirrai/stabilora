import { derived, writable, type Readable } from 'svelte/store';
import { internalStore } from '../stores/model/store';
import type { Transaction } from './Transaction';

class Database {
  // single instance of the Database
  private static instance: Database;
  private historyLimit = 100; // limit for the undo/redo stacks

  public readonly store = {
    subscribe: internalStore.subscribe,
  };

  private _undoStackStore = writable<Transaction[]>([]);
  private _redoStackStore = writable<Transaction[]>([]);

  // Read-only stores for external use
  public readonly undoStack: Readable<Transaction[]> = {
    subscribe: this._undoStackStore.subscribe,
  };

  public readonly redoStack: Readable<Transaction[]> = {
    subscribe: this._redoStackStore.subscribe,
  };

  public readonly canUndo = derived(
    this.undoStack,
    ($stack) => $stack.length > 0
  );
  public readonly canRedo = derived(
    this.redoStack,
    ($stack) => $stack.length > 0
  );

  private constructor() {}

  // static method to get the single instance
  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public commit(transaction: Transaction) {
    transaction.do();
    this._undoStackStore.update((stack) => {
      const newStack = [...stack, transaction];
      // Apply history limit
      if (newStack.length > this.historyLimit) {
        return newStack.slice(1); // Remove oldest item
      }
      return newStack;
    });
    this._redoStackStore.set([]); // clear redo stack on new commit
  }

  public undo() {
    let transaction: Transaction | undefined;

    // Remove last transaction from undo stack
    this._undoStackStore.update((stack) => {
      if (stack.length === 0) return stack;

      const newStack = [...stack];
      transaction = newStack.pop();
      return newStack;
    });

    // If we got a transaction, undo it and add to redo stack
    if (transaction) {
      transaction.undo();
      this._redoStackStore.update((stack) => [...stack, transaction!]);
    }
  }

  public redo() {
    let transaction: Transaction | undefined;

    // Remove last transaction from redo stack
    this._redoStackStore.update((stack) => {
      if (stack.length === 0) return stack;

      const newStack = [...stack];
      transaction = newStack.pop();
      return newStack;
    });

    // If we got a transaction, do it and add to undo stack
    if (transaction) {
      transaction.do();
      this._undoStackStore.update((stack) => [...stack, transaction!]);
    }
  }
}

export const db = Database.getInstance();
