<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { ViewportEngine } from '../viewport/ViewportEngine';
  import type { ViewportEngine as ViewportEngineType } from '../viewport/ViewportEngine';

  type ViewportCleanup = void | (() => void);
  type ViewportSetup = (
    viewport: ViewportEngineType
  ) => ViewportCleanup | Promise<ViewportCleanup>;

  let {
    onviewport,
  }: {
    onviewport?: ViewportSetup;
  } = $props();

  let containerRef: HTMLDivElement;
  let engine: ViewportEngine | null = null;
  let ready = $state(false);
  let cleanup: (() => void) | null = null;
  let cancelled = false;

  onMount(async () => {
    if (!containerRef) return;

    try {
      const created = await ViewportEngine.create(containerRef);
      if (cancelled) {
        created.destroy();
        return;
      }
      engine = created;

      const result = await onviewport?.(created);
      if (cancelled) {
        if (typeof result === 'function') result();
        created.destroy();
        return;
      }

      cleanup = typeof result === 'function' ? result : null;
      ready = true;
    } catch (error) {
      console.error('Failed to initialize viewport.', error);
      if (engine) {
        engine.destroy();
        engine = null;
      }
    }
  });

  onDestroy(() => {
    cancelled = true;
    cleanup?.();
    cleanup = null;
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
