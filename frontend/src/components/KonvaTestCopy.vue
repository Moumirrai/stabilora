<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Konva from 'konva'
import gsap from 'gsap'

const stageRef = ref<HTMLDivElement | null>(null)
const fpsRef = ref<number>(0)
const pointerPositionRef = ref<{ x: number, y: number }>({ x: 0, y: 0 })

const zoomSpeed = 0.05

const calculateFPS = () => {
  let lastFrameTime = performance.now()
  const updateFPS = () => {
    const now = performance.now()
    const delta = now - lastFrameTime
    fpsRef.value = Math.round(1000 / delta)
    lastFrameTime = now
    requestAnimationFrame(updateFPS)
  }
  requestAnimationFrame(updateFPS)
}

onMounted(() => {
  calculateFPS()

  if (stageRef.value) {
    const stage = new Konva.Stage({
      container: stageRef.value,
      width: window.innerWidth,
      height: window.innerHeight,
      draggable: false,
    })

    const layer = new Konva.Layer()
    stage.add(layer)

    const updateLineThickness = () => {
      const scale = stage.scaleX()
      layer.getChildren().forEach((shape) => {
        if (shape instanceof Konva.Line) {
          shape.strokeWidth(2 / scale)
        }
      })
      layer.batchDraw()
    }

    stage.on('mousedown', (e) => {
      if (e.evt.button === 1) {
        e.evt.preventDefault()
        stage.draggable(true)
        stage.startDrag()
      }
    })

    stage.on('mouseup', (e) => {
      if (e.evt.button === 1) {
        stage.draggable(false)
      }
    })

    stage.on('wheel', (e) => {
      // stop default scrolling
      e.evt.preventDefault()

      const oldScale = stage.scaleX()
      const pointer = stage.getPointerPosition()

      if (!pointer) return

      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      }

      // how to scale? Zoom in? Or zoom out?
      let direction = e.evt.deltaY > 0 ? -1 : 1

      // when we zoom on trackpad, e.evt.ctrlKey is true
      // in that case lets revert direction
      if (e.evt.ctrlKey) {
        direction = -direction
      }

      // Logarithmic zoom factor with adjustable speed
      const scaleBy = 1 + zoomSpeed
      const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy

      stage.scale({ x: newScale, y: newScale })

      const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      }
      stage.position(newPos)

      updateLineThickness()
    })

    stage.on('dblclick', (e) => {
      if (e.evt.button === 1) {
        const box = layer.getClientRect({ relativeTo: stage });

        const scaleX = stage.width() / box.width
        const scaleY = stage.height() / box.height
        const newScale = Math.min(scaleX, scaleY)

        const newPos = {
          x: -box.x * newScale,
          y: -box.y * newScale,
        }

        gsap.to(stage, {
          scaleX: newScale,
          scaleY: newScale,
          x: newPos.x,
          y: newPos.y,
          duration: 0.3,
          ease: 'power2.inOut',
          onComplete: () => {
            //layer.batchDraw()
            //gsap.ticker.fps(144)
            updateLineThickness()
          }
        })

        updateLineThickness()
      }
    })

    stage.on('mousemove', (e) => {
      const pointer = stage.getPointerPosition()
      if (pointer) {
        const scale = stage.scaleX()
        const stagePos = stage.position()
        pointerPositionRef.value = {
          x: (pointer.x - stagePos.x) / scale,
          y: (pointer.y - stagePos.y) / scale
        }
      }
    })

    for (let i = 0; i < 1000; i++) {
      const circle = new Konva.Circle({
        x: Math.random() * stage.width() * 2 - stage.width() / 2,
        y: Math.random() * stage.height() * 2 - stage.height() / 2,
        radius: Math.random() * 50 + 10,
        fill: Konva.Util.getRandomColor(),
        stroke: 'black',
        strokeWidth: 2,
      })
      layer.add(circle)
    }

    const points = [50, 50, 100, 150, 150, 100, 200, 200, 250, 150]
    const line = new Konva.Line({
      points: points.concat([250, stage.height(), 50, stage.height()]), // Close the shape
      stroke: 'blue',
      strokeWidth: 2,
      fill: 'rgba(0, 0, 255, 0.3)', // Fill color with transparency
      closed: true,
      lineCap: 'round',
      lineJoin: 'round',
    })
    layer.add(line)

    var topLayer = new Konva.Layer();
    stage.add(topLayer);

    var selectionRectangle = new Konva.Rect({
      fill: 'rgba(0,0,255,0.5)',
    });
    topLayer.add(selectionRectangle);

    layer.draw()
  }
})
</script>

<template>
  <div ref="stageRef"></div>
  <div class="fps-counter">FPS: {{ fpsRef }}</div>
  <div class="pointer-position">Pointer: {{ pointerPositionRef.x.toPrecision(6) }}, {{ pointerPositionRef.y.toPrecision(6) }}</div>
</template>

<style scoped>
.fps-counter, .pointer-position {
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
  top: 40px; /* Adjust position to avoid overlap with FPS counter */
}
</style>