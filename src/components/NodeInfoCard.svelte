<script lang="ts">
    import { selectedNodeStore } from '../stores/ui/store';
    import { onDestroy } from 'svelte';

    let cardElement: HTMLDivElement; // Reference to the card's div element

    // Reactive variables derived from the store
    $: node = $selectedNodeStore.node;
    $: screenPosition = $selectedNodeStore.screenPosition; // Holds viewport coordinates

    // Calculate card position: Top-left corner at the screenPosition
    $: cardStyle = screenPosition
      ? `position: fixed; top: ${screenPosition.y}px; left: ${screenPosition.x}px; z-index: 1000;` // Top-left at click point
      : 'display: none;'; // Hide if no position

    function handleClickOutside(event: MouseEvent | WheelEvent) {
      // If a node is selected and the click/wheel is outside the card element
      if (node && cardElement && !cardElement.contains(event.target as Node)) {
        selectedNodeStore.set({ node: null, screenPosition: null });
      }
    }

    let clickListenerAdded = false;
    let wheelListenerAdded = false;

    // Separate functions to add listeners
    function addClickOutsideListener() {
      if (!clickListenerAdded) {
        window.addEventListener('click', handleClickOutside, true);
        clickListenerAdded = true;
      }
    }

    function addWheelOutsideListener() {
       if (!wheelListenerAdded) {
          window.addEventListener('wheel', handleClickOutside, true);
          wheelListenerAdded = true;
       }
    }

    // Use a reactive statement to add/remove listeners
    $: if (node && screenPosition) {
      const timerId = setTimeout(() => {
          addClickOutsideListener();
          addWheelOutsideListener();
      }, 0);
      () => clearTimeout(timerId); // Cleanup for the reactive statement
    } else {
      // If the card is hidden, remove the listeners immediately
      window.removeEventListener('click', handleClickOutside, true);
      window.removeEventListener('wheel', handleClickOutside, true);
      clickListenerAdded = false;
      wheelListenerAdded = false;
    }


    onDestroy(() => {
      // Final cleanup when the component is destroyed
      window.removeEventListener('click', handleClickOutside, true);
      window.removeEventListener('wheel', handleClickOutside, true);
    });
</script>

{#if node && screenPosition}
  <div
    bind:this={cardElement}
    class="bg-background border border-border shadow-md rounded-md text-sm text-foreground"
    style={cardStyle}
    on:click|stopPropagation={() => {}} 
    on:wheel|stopPropagation={() => {}}
  >
    <p><strong>Node ID:</strong> {node.id}</p>
    <p>
      Click Pos: ({Math.round(screenPosition.x)}, {Math.round(
        screenPosition.y
      )})
    </p>
    <!-- Display actual node data coordinates if needed -->
    <p>Node Pos: ({Math.round(node.dx)}, {Math.round(node.dy)})</p>
  </div>
{/if}

<style>
  /* Basic styles for the card */
  div {
    min-width: 150px; /* Ensure a minimum width */
    /* pointer-events: auto; is the default, no need to set explicitly */
  }
</style>