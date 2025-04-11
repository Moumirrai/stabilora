<script lang="ts">
  import { onMount, onDestroy, getContext } from 'svelte';
  import StageManager from '../viewport/StageManager';
  import LineDrawer from '../viewport/LineDrawer';
  import { GridType } from '../viewport/types';
  import { pointerPositionRefKey } from '../viewport/symbols';

  let stageRef: HTMLDivElement;
  let fps: number = 0;
  let pointerPosition: { x: number; y: number } = { x: 0, y: 0 };

  /* const calculateFPS = () => {
      let lastFrameTime = performance.now();
      const updateFPS = () => {
        const now = performance.now();
        const delta = now - lastFrameTime;
        fps = Math.round(1000 / delta);
        lastFrameTime = now;
        requestAnimationFrame(updateFPS);
      };
      requestAnimationFrame(updateFPS);
    }; */

  onMount(() => {
    //calculateFPS();

    if (stageRef) {
      const stageManager = new StageManager(stageRef);
      const stage = stageManager.getStage();
      const lineDrawer = new LineDrawer(stageManager);

      // Configure snapping
      lineDrawer.setSnapConfig({
        enabled: true,
        endPointSnap: true,
        gridSnap: false,
        gridSize: 1,
        axisLock: false,
        orthogonalSnap: false,
      });

      const keydownHandler = (e: KeyboardEvent) => {
        if (e.key === 'l') {
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

      stageManager.setupEventHandlers();
      stageManager.setGrid(GridType.DOT);
      stageManager.pointerPositionRef.subscribe((value) => {
        pointerPosition = value;
      });

      onDestroy(() => {
        window.removeEventListener('keydown', keydownHandler);
      });
    }
  });
</script>

<div bind:this={stageRef} class="viewport"></div>
<div class="fps-counter">FPS: {fps}</div>
<div class="pointer-position">
  Pointer: {pointerPosition.x.toPrecision(6)}, {pointerPosition.y.toPrecision(
    6
  )}
</div>

<style>
  .fps-counter,
  .pointer-position {
    position: fixed;
    top: 10px;
    left: 10px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 5px;
    border-radius: 3px;
    font-family: monospace;
  }

  .pointer-position {
    top: 40px;
  }

  .viewport {
    width: 100vw;
    height: 100vh;
    background: #181818;
    will-change: transform;
    transform: translateZ(0);
  }
</style>
