<script setup lang="ts">
import { ref, onMounted } from 'vue';
import StageManager from '../viewport/StageManager';
import LineDrawer from '../viewport/LineDrawer';
import { GridType } from '../viewport/types';

const stageRef = ref<HTMLDivElement | null>(null);
const fpsRef = ref<number>(0);
let pointerPositionRef = ref<{ x: number; y: number }>({ x: 0, y: 0 });

/* const calculateFPS = () => {
  let lastFrameTime = performance.now();
  const updateFPS = () => {
    const now = performance.now();
    const delta = now - lastFrameTime;
    fpsRef.value = Math.round(1000 / delta);
    lastFrameTime = now;
    requestAnimationFrame(updateFPS);
  };
  requestAnimationFrame(updateFPS);
}; */

onMounted(() => {
  //calculateFPS();

  if (stageRef.value) {
    const stageManager = new StageManager(stageRef.value);
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

    window.addEventListener('keydown', (e) => {
      if (e.key === 'l') {
        lineDrawer.startNew();
      }
    });

    //on escape cancel line drawing
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        lineDrawer.cancel();
      }
    });

    if (!stage) {
      return;
    }

    stageManager.setupEventHandlers();
    stageManager.setGrid(GridType.DOT)
    pointerPositionRef = stageManager.pointerPositionRef;
  }
});
</script>

<template>
  <div ref="stageRef" class="viewport"></div>
  <div class="fps-counter">FPS: {{ fpsRef }}</div>
  <div class="pointer-position">
    Pointer: {{ pointerPositionRef.x.toPrecision(6) }},
    {{ pointerPositionRef.y.toPrecision(6) }}
  </div>
</template>

<style scoped>
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
