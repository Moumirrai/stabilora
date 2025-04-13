<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import StageManager from '../viewport/StageManager';
  import LineDrawer from '../viewport/LineDrawer';
  import ModelRenderer from '../rendering/ModelRenderer';
  import DotGrid from '../viewport/background/DotGrid';
  import Ruler from '../viewport/Ruler';
  let stageRef: HTMLDivElement;
  let modelRenderer: ModelRenderer | null = null;
  let keydownHandler: (e: KeyboardEvent) => void;

  onMount(async () => {
    await tick();
    if (stageRef) {
      const stageManager = new StageManager(stageRef);
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
          lineDrawer.startNew();
        }
        if (e.key === 'Escape') {
          lineDrawer.cancel();
        }
      };

      window.addEventListener('keydown', keydownHandler);

      if (!stage) {
        return;
      }

      new DotGrid(stageManager.layerManager.baseLayer, stage);
      new Ruler(stageManager.layerManager.uiLayer, stage);
    }
  });

  onDestroy(() => {
    window.removeEventListener('keydown', keydownHandler);
    modelRenderer?.destroy();
  });
</script>

<div bind:this={stageRef} class="h-full"></div>
