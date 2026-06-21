<script lang="ts">
  import Button from '$lib/components/ui/button/button.svelte';
  import StructuralEditor from '../components/StructuralEditor.svelte';
  import Menu from '$lib/app/Menu.svelte';
  import Sidebar from '$lib/app/Sidebar.svelte';
  import { PaneGroup, Pane, Handle } from '$lib/components/ui/resizable';

  let showPanel = $state(false);
</script>

<div class="h-screen flex flex-col">
  <div class="md:block border-b">
    <Menu />
  </div>

  <div class="flex-1 overflow-hidden">
    <PaneGroup direction="horizontal">
      <Pane defaultSize={15} minSize={10} maxSize={30}>
        <Sidebar class="w-full h-full border-r overflow-y-auto" />
      </Pane>
      <Handle />
      <Pane defaultSize={80}>
        <div class="relative overflow-hidden min-w-0 min-h-0 h-full">
          <PaneGroup direction="vertical">
            <Pane defaultSize={showPanel ? 70 : 100}>
              <div class="relative overflow-hidden min-w-0 min-h-0 h-full">
                <StructuralEditor />
                <Button
                  onclick={() => (showPanel = !showPanel)}
                  class="absolute bottom-0 right-0 m-2"
                >
                  {showPanel ? 'Hide' : 'Show'} Panel
                </Button>
              </div>
            </Pane>
            {#if showPanel}
              <Handle />
              <Pane defaultSize={30} minSize={20} maxSize={50}>
                <div class="border-t p-4 overflow-y-auto h-full">
                  <p>Toggleable Panel</p>
                  <Button onclick={() => (showPanel = false)}
                    >Close Panel</Button
                  >
                </div>
              </Pane>
            {/if}
          </PaneGroup>
        </div>
      </Pane>
    </PaneGroup>
  </div>
</div>

<style>
  :global(.konva-container-wrapper) {
    width: 100%;
    height: 100%;
  }
</style>
