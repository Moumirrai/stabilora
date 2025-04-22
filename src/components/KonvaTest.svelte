<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import ViewportManager from '../viewport/ViewportManager';
  import LineDrawer from '../viewport/LineDrawer';
  import ModelRenderer from '../rendering/ModelRenderer';
  import DotGrid from '../viewport/background/DotGrid';
  import HudManager from '../viewport/HudManager';
  let viewportRef: HTMLDivElement;
  let hudRef: HTMLDivElement;
  let modelRenderer: ModelRenderer | null = null;
  let keydownHandler: (e: KeyboardEvent) => void;

  onMount(async () => {
    await tick();
    if (viewportRef && hudRef) {
      const stageManager = new ViewportManager(viewportRef);
      const hudManager = new HudManager(hudRef, stageManager);
      const stage = stageManager.getStage();
      const lineDrawer = new LineDrawer(stageManager);

      modelRenderer = new ModelRenderer(stageManager);
      modelRenderer.initialize();

      // Configure snapping
      lineDrawer.setSnapConfig({
        enabled: true,
        endPointSnap: true,
        gridSnap: false,
        gridSize: 1,
        axisLock: false,
        orthogonalSnap: false,
      });

      keydownHandler = (e: KeyboardEvent) => {
        if (e.key === 'l') {
          console.log('l');
          hudManager.destroy();
        }
        if (e.key === 'Escape') {
          lineDrawer.cancel();
        }
      };

      window.addEventListener('keydown', keydownHandler);

      if (!stage) {
        return;
      }
      //new Grid(stageManager.layerManager.baseLayer, stage);
      new DotGrid(stageManager.layerManager.baseLayer, stage);
      //new Ruler(stageManager.layerManager.uiLayer, stage);
    }
  });

  onDestroy(() => {
    window.removeEventListener('keydown', keydownHandler);
    modelRenderer?.destroy();
  });
</script>

<div class="relative h-full w-full">
  <div bind:this={viewportRef} class="absolute inset-0 h-full w-full"></div>
  <div bind:this={hudRef} class="absolute inset-0 h-full w-full pointer-events-none">
  </div>
</div>
