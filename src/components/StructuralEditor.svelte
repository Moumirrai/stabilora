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
    Material,
    Crossection,
    LoadCase,
    LoadCaseType,
    NodalLoad
  } from '@stabilora/arcora';

  let toolbarItems = $state([
    { icon: Dot, action: () => console.log('Select'), active: true },
    { icon: Minus, action: () => console.log('Remove Node'), active: false },
    { icon: Triangle, action: () => console.log('Add Shape'), active: false },
    { icon: Plus, action: () => console.log('Add Node'), active: false },
    { icon: Square, action: () => console.log('Add Element'), active: false },
    { icon: Trash2, action: () => console.log('Remove'), active: false },
  ]);

  let unsubPointer: (() => void) | null = null;
  let unsubSelection: (() => void) | null = null;

  function toggleActive(index: number) {
    toolbarItems.forEach((item, i) => {
      item.active = i === index;
    });
    toolbarItems = [...toolbarItems];
  }

  function loadModel() {
    const scene = app.scene;
    const model = scene?.model;
    if (!model) return;
    if (!scene) return;

    const material = new Material(model, {
      E: 210e9,
      G: 81e9,
      alpha: 1.2e-5,
      density: 7850,
    });
    model.materials.set(material.id, material);
    const xs = new Crossection(model, {
      area: 0.02,
      Iy: 8.33e-5,
      Iz: 8.33e-5,
    });
    model.crossections.set(xs.id, xs);
    const lc = new LoadCase(model, {
      name: 'Test Load Case',
      type: LoadCaseType.Live,
      selfWeight: false,
    });
    model.loadCases.set(lc.id, lc);

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
      new AddElementOperation({ nodeIDs: [nodes[0].id, nodes[1].id], crossectionID: xs.id, materialID: material.id }),
      new AddElementOperation({ nodeIDs: [nodes[1].id, nodes[2].id], crossectionID: xs.id, materialID: material.id }),
      new AddElementOperation({ nodeIDs: [nodes[2].id, nodes[3].id], crossectionID: xs.id, materialID: material.id }),
      new AddElementOperation({ nodeIDs: [nodes[3].id, nodes[4].id], crossectionID: xs.id, materialID: material.id }),
      new AddElementOperation({ nodeIDs: [nodes[4].id, nodes[5].id], crossectionID: xs.id, materialID: material.id }),
      new AddElementOperation({ nodeIDs: [nodes[5].id, nodes[6].id], crossectionID: xs.id, materialID: material.id }),
      new AddElementOperation({ nodeIDs: [nodes[6].id, nodes[0].id], crossectionID: xs.id, materialID: material.id }),
      new AddElementOperation({ nodeIDs: [nodes[1].id, nodes[6].id], crossectionID: xs.id, materialID: material.id }),
      new AddElementOperation({ nodeIDs: [nodes[1].id, nodes[5].id], crossectionID: xs.id, materialID: material.id }),
      new AddElementOperation({ nodeIDs: [nodes[2].id, nodes[5].id], crossectionID: xs.id, materialID: material.id }),
      new AddElementOperation({ nodeIDs: [nodes[2].id, nodes[4].id], crossectionID: xs.id, materialID: material.id }),
    ];
    for (let i = 0; i < elements.length; i++) {
      txn.addCommand(elements[i]);
    }

    model.boundaryConditions.set(nodes[0].id, {
      nodeId: nodes[0].id,
      rotation: 0,
      dirichlet: { 0: 0, 1: 0, 2: 0 },
    });

    model.boundaryConditions.set(nodes[3].id, {
      nodeId: nodes[3].id,
      rotation: 0,
      dirichlet: { 0: 0, 1: 0, 2: 0 },
    });

    const load = new NodalLoad(model, {
      nodeID: nodes[5].id,
      loadCaseID: lc.id,
      Fx: 25000,
      Fy: 0,
      Mz: 0,
    });
    model.loads.set(load.id, load);

    scene.repository.commit(txn);
    scene.renderSync();
  }

  function handleViewport(viewport: ViewportEngine) {
    const scene = new Scene(viewport);
    app.setScene(scene);
    loadModel();
    scene.renderSync();

    scene.fitInView(true);

    const sel = scene.selection;
    unsubSelection = sel.onChange(() => scene.renderSync());

    unsubPointer = viewport.onPointerEvent.subscribe((e) => {
      const tol = 10 / viewport.camera.getState().scale;
      const hit = scene.hitTest(e.world.x, e.world.y, tol);

      if (e.type === 'pointermove') {
        sel.setHovered(hit?.entity ?? null);
      }

      if (e.button === 1 && e.type === 'pointerdown' && e.doubleClick) {
        scene.fitInView();
      }

      if (e.button === 0 && e.type === 'pointerdown') {
        if (hit) {
          if (e.ctrlKey) {
            sel.selectAdd(hit.entity);
          } else if (e.shiftKey) {
            sel.selectRemove(hit.entity);
          } else {
            sel.selectOnly(hit.entity);
          }
        } else {
          if (!e.ctrlKey && !e.shiftKey) sel.clearSelection();
        }
      }
    });
  }

  onDestroy(() => {
    unsubPointer?.();
    unsubSelection?.();
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
