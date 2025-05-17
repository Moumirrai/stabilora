import { writable } from 'svelte/store';
import type { Node } from '../model/model.types';
import Viewport from '../../viewport/viewport';

interface SelectedNodeState {
  node: Node | null;
  screenPosition: { x: number; y: number } | null;
}

export const viewportStore = writable<Viewport | null>(null);

export const selectedNodeStore = writable<SelectedNodeState>({
  node: null,
  screenPosition: null,
});
