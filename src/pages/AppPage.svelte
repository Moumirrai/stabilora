<script lang="ts">
  import { slide } from 'svelte/transition';
  import Viewport from '../components/ViewportComponent.svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import StructuralEditor from '../components/StructuralEditor.svelte';
  import Menu from '$lib/app/Menu.svelte';
  import Sidebar from '$lib/app/Sidebar.svelte';
  import NodeInfoCard from '../components/NodeInfoCard.svelte';

  let showPanel = false;
</script>

<div class="h-screen grid grid-rows-[auto_1fr]">
  <div class="md:block border-b">
    <Menu />
  </div>

  <div class="grid grid-cols-[auto_1fr] overflow-hidden">
    <Sidebar class="w-80 flex-shrink-0 border-r overflow-y-auto" />
    <div class="relative overflow-hidden min-w-0 min-h-0 grid grid-rows-[1fr_auto]">
      <div class="relative overflow-hidden min-w-0 min-h-0">
        <StructuralEditor />
        <NodeInfoCard />
      </div>
      {#if showPanel}
        <div class="border-t p-4 overflow-y-auto h-[300px]" transition:slide={{ duration: 300 }}>
          <!-- Panel content here -->
          <p>Toggleable Panel</p>
          <Button onclick={() => showPanel = false}>Close Panel</Button>
        </div>
      {/if}
      <Button onclick={() => showPanel = !showPanel} class="absolute bottom-0 right-0 m-2">
        {showPanel ? 'Hide' : 'Show'} Panel
      </Button>
    </div>
  </div>
</div>

<style>
  :global(.konva-container-wrapper) {
    width: 100%;
    height: 100%;
  }
</style>