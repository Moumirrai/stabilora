import {getContext, setContext} from 'svelte';

// Create a unique symbol for the pointer position context key
const pointerPositionRefKey = Symbol('pointerPositionRef');

export { pointerPositionRefKey };