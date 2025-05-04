import { internalStore } from "../stores/model/store"
import { get } from 'svelte/store';

export const generateNextNodeName = (): number => {
    const currentModel = get(internalStore); // get current state
    if (!currentModel.nodes || currentModel.nodes.length === 0) {
        return 1;
    }
 
    const names = currentModel.nodes.map(n => n.name);
    if (names.length === 0) {
        return 1;
    }
    const maxName = Math.max(...names);
    return maxName + 1;
};