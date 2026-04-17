<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { ViewportEngine } from '../viewport/ViewportEngine';

  let containerRef: HTMLDivElement;
  let engine: ViewportEngine | null = null;

  onMount(async () => {
    if (containerRef) {
      engine = await ViewportEngine.create(containerRef);

      // additional setup like adding grids or handling stores
      // can be done here using engine.worldContainer or engine.screenContainer
    }
  });

  onDestroy(() => {
    if (engine) {
      engine.destroy();
      engine = null;
    }
  });
</script>

<div class="relative h-full w-full">
  <div
    bind:this={containerRef}
    class="absolute inset-0 h-full w-full overflow-hidden"
  ></div>

  <!-- <div class="absolute inset-0 h-full w-full pointer-events-none"></div> -->
</div>
