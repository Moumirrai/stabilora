<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { previewStore } from '../stores/model/store';
  import Viewport from '../viewport/viewport';
  import ModelRenderer from '../viewport/rendering/ModelRenderer';
  import DotGrid from '../viewport/grid/DotGrid';
  import Grid from "../viewport/grid/SquareGrid"
  import Hud from '../viewport/hud';
  let viewportRef: HTMLDivElement;
  let hudRef: HTMLDivElement;
  let modelRenderer: ModelRenderer | null = null;
  let previewRenderer: ModelRenderer | null = null;
  let keydownHandler: (e: KeyboardEvent) => void;

  onMount(async () => {
    await tick();
    if (viewportRef && hudRef) {
      const stageManager = new Viewport(viewportRef);
      const hudManager = new Hud(hudRef, stageManager);
      const stage = stageManager.getStage();

      modelRenderer = new ModelRenderer(stageManager);
      modelRenderer.initialize();
      stageManager.fitInView(0)
      previewRenderer = new ModelRenderer(stageManager, previewStore, stageManager.getLayerManager().temporaryLayer);
      previewRenderer.initialize();

      if (!stage) {
        return;
      }
      //new Grid(stageManager.layerManager.baseLayer, stage);
      new DotGrid(stageManager.layerManager.baseLayer, stage);
    }
  });

  onDestroy(() => {
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
