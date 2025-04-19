<script lang="ts">
  import PixiCanvas from './PixiCanvasTest.svelte';
  import { createDemoSceneGraph } from '../eukleia/demo/demoScene';
  import { EukliaRuntime } from '../eukleia/EukliaRuntime';
  import { onDestroy, onMount } from 'svelte'; // Import onMount

  let runtime: EukliaRuntime | undefined = undefined; // Initialize as undefined
  let containerElement: HTMLDivElement; // Renamed to avoid conflict, holds the bound element
  let isLoading = true; // Added state for loading indicator

  // This function will be called by the use:action directive
  function setupContainer(node: HTMLDivElement) {
    containerElement = node; // Assign the node
    // Trigger the async initialization, but don't await it here
    initializeRuntime();

    // Svelte actions can return an object with a destroy method for cleanup
    return {
      destroy() {
        // Cleanup related to the action itself, if any
        // Runtime destruction is handled separately in onDestroy
      }
    };
  }

  // Separate async function for initialization
  async function initializeRuntime() {
    if (!containerElement) return; // Guard against element not being ready

    const scene = createDemoSceneGraph();
    const rt = new EukliaRuntime(scene, containerElement);
    try {
        await rt.init(); // Await initialization
        runtime = rt; // Assign only after successful init
    } catch (error) {
        console.error("Failed to initialize EukliaRuntime:", error);
        // Handle initialization error appropriately (e.g., show error message)
    } finally {
        isLoading = false; // Update loading state regardless of success/failure
    }
  }

  // Use onDestroy for runtime cleanup when the component is destroyed
  onDestroy(() => {
    runtime?.destroy();
    console.log("KonvaTest destroyed, runtime cleanup called.");
  });

</script>

<!-- Use the synchronous action function -->
<div use:setupContainer style="width: 100%; height: 100%;">
  {#if isLoading}
    <p>Loading Runtime...</p>
  {:else if runtime}
    <PixiCanvas {runtime} />
  {:else}
    <p>Error initializing Runtime.</p> <!-- Optional: Show error state -->
  {/if}
</div>