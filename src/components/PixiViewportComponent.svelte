<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { ViewportEngine } from '../viewport/ViewportEngine';
  import type { ViewportEngine as ViewportEngineType } from '../viewport/ViewportEngine';

  let { onviewport }: { onviewport?: (viewport: ViewportEngineType) => void } =
    $props();

  let containerRef: HTMLDivElement;
  let engine: ViewportEngine | null = null;
  let ready = $state(false);

  onMount(async () => {
    if (containerRef) {
      engine = await ViewportEngine.create(containerRef);
      onviewport?.(engine);
      ready = true;
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

  <div
    class="pointer-events-none absolute inset-0 transition-opacity duration-200"
    style="opacity: {ready ? 0 : 1}; background: var(--background);"
  ></div>
</div>
