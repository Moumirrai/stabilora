<script lang="ts">
  import Viewport from './ViewportComponent.svelte';
  import PixiViewportComponent from './PixiViewportComponent.svelte';
  import { Button } from '$lib/components/ui/button';
  import * as Card from '$lib/components/ui/card/index.js';
  import { Plus, Square, Trash2, Triangle, Dot, Minus } from '@lucide/svelte';
  import ContextMenu from './ContextMenu.svelte';

  // Define toolbar items with icon, action, and initial active state
  let toolbarItems = [
    { icon: Dot, action: () => console.log('Select'), active: true },
    { icon: Minus, action: () => console.log('Remove Node'), active: false },
    { icon: Triangle, action: () => console.log('Add Shape'), active: false },
    { icon: Plus, action: () => console.log('Add Node'), active: false },
    { icon: Square, action: () => console.log('Add Element'), active: false },
    { icon: Trash2, action: () => console.log('Remove'), active: false },
  ];

  // Function to toggle active state
  function toggleActive(index: number) {
    toolbarItems.forEach((item, i) => {
      item.active = i === index;
    });
    toolbarItems = [...toolbarItems]; // Trigger reactivity
  }
</script>

<div class="h-full relative">
  <ContextMenu>
    <PixiViewportComponent />
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
