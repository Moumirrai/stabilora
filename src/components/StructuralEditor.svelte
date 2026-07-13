<script lang="ts">
  import PixiViewportComponent from './PixiViewportComponent.svelte';
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card/index.js';
  import { Plus, Square, Trash2, Triangle, Dot, Minus } from '@lucide/svelte';
  import ContextMenu from './ContextMenu.svelte';
  import type { ViewportEngine } from '../viewport/ViewportEngine';
  import { Scene } from '../scene/Scene';
  import { app } from '../app/App';
  import { onDestroy } from 'svelte';
  import {
    Transaction,
    AddElementOperation,
    AddNodeOperation,
  } from '@stabilora/arcora';
  import { SpatialItemType } from '../spatial/ISpatialItem';

  let toolbarItems = $state([
    { icon: Dot, action: () => console.log('Select'), active: true },
    { icon: Minus, action: () => console.log('Remove Node'), active: false },
    { icon: Triangle, action: () => console.log('Add Shape'), active: false },
    { icon: Plus, action: () => console.log('Add Node'), active: false },
    { icon: Square, action: () => console.log('Add Element'), active: false },
    { icon: Trash2, action: () => console.log('Remove'), active: false },
  ]);

  let unsubPointer: (() => void) | null = null;

  function toggleActive(index: number) {
    toolbarItems.forEach((item, i) => {
      item.active = i === index;
    });
    toolbarItems = [...toolbarItems];
  }

  function loadModel() {
    const scene = app.scene;
    if (!scene) return;
    const txn = new Transaction('Load Model');
    const nodes = [
      new AddNodeOperation({ x: -6000, z: 0 }),
      new AddNodeOperation({ x: -2000, z: 0 }),
      new AddNodeOperation({ x: 2000, z: 0 }),
      new AddNodeOperation({ x: 6000, z: 0 }),
      new AddNodeOperation({ x: 4000, z: -3000 }),
      new AddNodeOperation({ x: 0, z: -3000 }),
      new AddNodeOperation({ x: -4000, z: -3000 }),
    ];
    for (let i = 0; i < nodes.length; i++) {
      txn.addCommand(nodes[i]);
    }
    const elements = [
      new AddElementOperation({ nodeIDs: [nodes[0].id, nodes[1].id] }),
      new AddElementOperation({ nodeIDs: [nodes[1].id, nodes[2].id] }),
      new AddElementOperation({ nodeIDs: [nodes[2].id, nodes[3].id] }),
      new AddElementOperation({ nodeIDs: [nodes[3].id, nodes[4].id] }),
      new AddElementOperation({ nodeIDs: [nodes[4].id, nodes[5].id] }),
      new AddElementOperation({ nodeIDs: [nodes[5].id, nodes[6].id] }),
      new AddElementOperation({ nodeIDs: [nodes[6].id, nodes[0].id] }),
      new AddElementOperation({ nodeIDs: [nodes[1].id, nodes[6].id] }),
      new AddElementOperation({ nodeIDs: [nodes[1].id, nodes[5].id] }),
      new AddElementOperation({ nodeIDs: [nodes[2].id, nodes[5].id] }),
      new AddElementOperation({ nodeIDs: [nodes[2].id, nodes[4].id] }),
    ];
    for (let i = 0; i < elements.length; i++) {
      txn.addCommand(elements[i]);
    }
    scene.repository.commit(txn);
    scene.renderSync();
  }

  function handleViewport(viewport: ViewportEngine) {
    const scene = new Scene(viewport);
    app.setScene(scene);
    loadModel();
    scene.renderSync();

    scene.fitInView(true);

    unsubPointer = viewport.onPointerEvent.subscribe((e) => {
      const tol = 10 / viewport.camera.getState().scale;
      const hit = scene.hitTest(e.world.x, e.world.y, tol);

      if (e.button === -1) {
        console.log('Pointer Move', e.world, hit);
      }

      if (e.button === 1 && e.type === 'pointerdown' && e.doubleClick) {
        scene.fitInView();
      }

      if (e.button === 0 && e.type === 'pointerdown' && hit) {
        console.log(hit);

        if (hit.type === SpatialItemType.Node) {
          const p = hit.node.pos;
          viewport.camera.zoomToRect(
            { minX: p.x, maxX: p.x, minY: p.z, maxY: p.z },
            { marginPercent: 0.1 },
          );
        } else {
          const a = scene.model.nodes.get(hit.element.nodeIDs[0]);
          const b = scene.model.nodes.get(hit.element.nodeIDs[1]);
          if (a && b) {
            viewport.camera.zoomToRect(
              {
                minX: Math.min(a.pos.x, b.pos.x),
                maxX: Math.max(a.pos.x, b.pos.x),
                minY: Math.min(a.pos.z, b.pos.z),
                maxY: Math.max(a.pos.z, b.pos.z),
              },
              { marginPercent: 0.1 },
            );
          }
        }
      }
    });
  }

  onDestroy(() => {
    unsubPointer?.();
  });
</script>

<div class="h-full relative">
  <ContextMenu>
    <PixiViewportComponent onviewport={handleViewport} />
  </ContextMenu>
  <Card.Root
    class="absolute bottom-4 left-1/2 transform -translate-x-1/2 p-2 flex flex-row gap-2"
  >
    {#each toolbarItems as item, index}
      <Button
        variant={item.active ? 'default' : 'ghost'}
        size="icon"
        onclick={() => {
          toggleActive(index);
          item.action();
        }}
      >
        <svelte:component this={item.icon} class="h-4 w-4" />
      </Button>
    {/each}
  </Card.Root>
</div>
