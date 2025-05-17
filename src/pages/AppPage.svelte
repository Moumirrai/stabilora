<script lang="ts">
  import KonvaTest from '../components/ViewportComponent.svelte';
  import { Button } from '$lib/components/ui/button';
  import Menu from '$lib/app/Menu.svelte';
  import Sidebar from '$lib/app/Sidebar.svelte';
  import NodeInfoCard from '../components/NodeInfoCard.svelte';
</script>

<div class="h-screen grid grid-rows-[auto_1fr]">
  <div class="md:block border-b">
    <Menu />
  </div>

  <div class="grid grid-cols-[auto_1fr] overflow-hidden">
    <Sidebar class="w-80 flex-shrink-0 border-r overflow-y-auto" />
    <div class="relative overflow-hidden min-w-0 min-h-0">
      <KonvaTest />
      <NodeInfoCard />
    </div>
  </div>
</div>

<style>
  :global(.konva-container-wrapper) {
    width: 100%;
    height: 100%;
  }
</style>
