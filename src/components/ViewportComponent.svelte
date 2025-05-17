<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { previewStore } from '../stores/model/store';
  import { viewportStore } from '../stores/app/store';
  import Viewport from '../viewport/viewport';
  import ModelRenderer from '../viewport/rendering/ModelRenderer';
  import DotGrid from '../viewport/grid/DotGrid';
  import Grid from '../viewport/grid/SquareGrid';
  import Hud from '../viewport/hud';
  let viewportRef: HTMLDivElement;
  let hudRef: HTMLDivElement;
  let modelRenderer: ModelRenderer | null = null;
  let previewRenderer: ModelRenderer | null = null;
  let keydownHandler: (e: KeyboardEvent) => void;

  onMount(async () => {
    await tick();
    if (viewportRef && hudRef) {
      const viewport = new Viewport(viewportRef);
      viewportStore.set(viewport);
      const hudManager = new Hud(hudRef, viewport);
      const stage = viewport.getStage();

      modelRenderer = new ModelRenderer(viewport);
      modelRenderer.initialize();
      viewport.fitInView(0);
      previewRenderer = new ModelRenderer(
        viewport,
        previewStore,
        viewport.getLayerManager().temporaryLayer
      );
      previewRenderer.initialize();

      if (!stage) {
        return;
      }
      //new Grid(stageManager.layerManager.baseLayer, stage);
      new DotGrid(viewport.layerManager.baseLayer, stage);
    }
  });

  onDestroy(() => {
    viewportStore.set(null);
    modelRenderer?.destroy();
  });
</script>

<div class="relative h-full w-full">
  <div bind:this={viewportRef} class="absolute inset-0 h-full w-full"></div>
  <div
    bind:this={hudRef}
    class="absolute inset-0 h-full w-full pointer-events-none"
  ></div>
</div>
