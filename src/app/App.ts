import { writable } from 'svelte/store';
import type { Scene } from '../scene/Scene';

export const canUndo = writable(false);
export const canRedo = writable(false);

class App {
  scene: Scene | null = null;

  setScene(scene: Scene): void {
    this.scene = scene;
    this.refreshUndoRedo();
    scene.repository.onChange(() => this.refreshUndoRedo());
  }

  private refreshUndoRedo(): void {
    if (!this.scene) return;
    canUndo.set(this.scene.repository.undoStack.length > 0);
    canRedo.set(this.scene.repository.redoStack.length > 0);
  }
}

export const app = new App();
