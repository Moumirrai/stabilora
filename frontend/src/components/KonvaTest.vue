<script setup lang="ts">
import { ref, onMounted } from 'vue';
import StageManager from '../viewport/StageManager';
/* import Konva from 'konva';
import LineDrawer from '../viewport/LineDrawer'; */

const stageRef = ref<HTMLDivElement | null>(null);
const fpsRef = ref<number>(0);
let pointerPositionRef = ref<{ x: number, y: number }>({ x: 0, y: 0 });

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
    //const lineDrawer = new LineDrawer(stageManager);

    // Configure snapping
    /* lineDrawer.setSnapConfig({
      enabled: true,
      endPointSnap: true,
      gridSnap: true,
      axisLock: true,
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
    }); */

    if (!stage) {
      return;
    }

    stageManager.setupEventHandlers();
    stageManager.addGrid();
    //stageManager.addGrid();
    pointerPositionRef = stageManager.pointerPositionRef;

    const layerManager = stageManager.getLayerManager();
    const geometryLayer = layerManager.geometryLayer

    /* for (let i = 0; i < 5; i++) {
      const circle = new Konva.Circle({
        x: Math.random() * stage.getStage().width() * 2 - stage.getStage().width() / 2,
        y: Math.random() * stage.getStage().height() * 2 - stage.getStage().height() / 2,
        radius: Math.random() * 50 + 10,
        fill: Konva.Util.getRandomColor(),
        stroke: 'black',
        strokeWidth: 2,
      });
      geometryLayer.add(circle);
    }

    const points = [50, 50, 100, 150, 150, 100, 200, 200, 250, 150];
    const line = new Konva.Line({
      points: points.concat([250, stage.getStage().height(), 50, stage.getStage().height()]), // Close the shape
      stroke: 'blue',
      strokeWidth: 2,
      fill: 'rgba(0, 0, 255, 0.3)', // Fill color with transparency
      closed: true,
      lineCap: 'round',
      lineJoin: 'round',
    });
    geometryLayer.add(line); */

    geometryLayer.draw();

  }
});
</script>

<template>
  <div ref="stageRef" class="viewport"></div>
  <div class="fps-counter">FPS: {{ fpsRef }}</div>
  <div class="pointer-position">Pointer: {{ pointerPositionRef.x.toPrecision(6) }}, {{ pointerPositionRef.y.toPrecision(6) }}</div>
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
  /* Adjust position to avoid overlap with FPS counter */
}

.viewport {
  width: 100vw;
  height: 100vh;
  background: #181818
}
</style>