<script setup lang="ts">
import { ref, onMounted } from 'vue';
import StageManager from '../viewport/StageManager';

const stageRef = ref<HTMLDivElement | null>(null);
//let pointerPositionRef = ref<{ x: number; y: number }>({ x: 0, y: 0 });

onMounted(() => {
  if (stageRef.value) {
    const stageManager = new StageManager(stageRef.value);
    const stage = stageManager.getStage();

    if (!stage) {
      return;
    }

    stageManager.setupEventHandlers();
    stageManager.addGrid();
    //pointerPositionRef = stageManager.pointerPositionRef;

    const layerManager = stageManager.getLayerManager();
    const geometryLayer = layerManager.geometryLayer;

    geometryLayer.draw();
  }
});
</script>

<template>
  <div ref="stageRef" class="viewport"></div>
</template>

<style scoped>
.viewport {
  width: 100vw;
  height: 100vh;
  background: #181818;
}
</style>
