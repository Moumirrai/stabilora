import { internalStore } from '../stores/model/store';
import type { Transaction } from './Transaction';

class Database {
  // single instance of the Database
  private static instance: Database;
  private historyLimit = 100; // limit for the undo/redo stacks

  public readonly store = {
    subscribe: internalStore.subscribe,
  };

  private undoStack: Transaction[] = [];
  private redoStack: Transaction[] = [];

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
    this.undoStack.push(transaction);
    if (this.undoStack.length > this.historyLimit) {
      this.undoStack.shift(); // removes first (oldest) element
    }
    this.redoStack = []; // clear redo stack on new commit
  }

  public undo() {
    if (this.undoStack.length > 0) {
      const transaction = this.undoStack.pop()!;
      transaction.undo();
      this.redoStack.push(transaction);
    }
  }

  public redo() {
    if (this.redoStack.length > 0) {
      const transaction = this.redoStack.pop()!;
      transaction.do();
      this.undoStack.push(transaction);
    }
  }
}

export const db = Database.getInstance();
