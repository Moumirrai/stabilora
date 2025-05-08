import { writable } from 'svelte/store';
import type { Node } from '../model/model.types';

interface SelectedNodeState {
  node: Node | null;
  screenPosition: { x: number; y: number } | null;
}

export const selectedNodeStore = writable<SelectedNodeState>({
  node: null,
  screenPosition: null,
});
