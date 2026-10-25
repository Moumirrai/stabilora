<script lang="ts">
  import PixiViewportComponent from './PixiViewportComponent.svelte';
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card/index.js';
  import {
    Plus,
    Square,
    Trash2,
    Triangle,
    Dot,
    Minus,
    Hand,
  } from '@lucide/svelte';
  import ContextMenu from './ContextMenu.svelte';
  import type { ViewportEngine } from '../viewport/ViewportEngine';
  import { Scene } from '../scene/Scene';
  import { SelectMoveTool } from '../tools/SelectMoveTool';
  import { HandTool } from '../tools/HandTool';
  import { app } from '../app/App';
  import { buildFrame } from '../utils/DemoFrame';

  let toolbarItems = $state([
    {
      icon: Dot,
      toolId: SelectMoveTool.ID as string | null,
      action: null as (() => void) | null,
      active: true,
    },
    {
      icon: Hand,
      toolId: HandTool.ID as string | null,
      action: null,
      active: false,
    },
    {
      icon: Minus,
      toolId: null,
      action: () => console.log('Remove Node'),
      active: false,
    },
    {
      icon: Triangle,
      toolId: null,
      action: () => console.log('Add Shape'),
      active: false,
    },
    {
      icon: Plus,
      toolId: null,
      action: () => console.log('Add Node'),
      active: false,
    },
    {
      icon: Square,
      toolId: null,
      action: () => console.log('Add Element'),
      active: false,
    },
    {
      icon: Trash2,
      toolId: null,
      action: () => console.log('Remove'),
      active: false,
    },
  ]);

  function syncToolbar() {
    const active = app.scene?.tools.activeToolId;
    toolbarItems.forEach((item) => {
      if (item.toolId !== null) item.active = item.toolId === active;
    });
    toolbarItems = [...toolbarItems];
  }

  function toggleActive(index: number) {
    const item = toolbarItems[index];
    if (item.toolId !== null)
      app.scene?.tools.setActive(item.toolId); // highlight follows tools.onChanged
    else {
      toolbarItems.forEach((entry, i) => {
        entry.active = i === index;
      });
      toolbarItems = [...toolbarItems];
    }
    item.action?.();
  }

  function loadModel() {
    const scene = app.scene;
    if (!scene) return;
    scene.repository.commit(buildFrame(8, 8));
  }

  async function handleViewport(viewport: ViewportEngine): Promise<() => void> {
    // Scene owns rendering, selection and pointer interaction (see
    // InteractionController). The Svelte layer only wires up the viewport.
    const scene = await Scene.create(viewport);
    app.setScene(scene);
    loadModel();

    scene.fitInView(true);

    syncToolbar();
    const unsubTools = scene.tools.onChanged.subscribe(syncToolbar);

    return () => {
      unsubTools();
      scene.destroy();
    };
  }
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
        onclick={() => toggleActive(index)}
      >
        <item.icon class="h-4 w-4" />
      </Button>
    {/each}
  </Card.Root>
</div>
