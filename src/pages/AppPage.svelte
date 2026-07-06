<script lang="ts">
  import Button from '$lib/components/ui/button/button.svelte';
  import StructuralEditor from '../components/StructuralEditor.svelte';
  import Menu from '../components/layout/Menu.svelte';
  import Sidebar from '../components/layout/Sidebar.svelte';
  import { SplitPane } from '@rich_harris/svelte-split-pane';

  let showPanel = $state(false);
</script>

<div class="h-screen flex flex-col">
  <div class="md:block border-b">
    <Menu />
  </div>

  <div class="flex-1 overflow-hidden">
    <SplitPane
      type="columns"
      id="main-horizontal"
      min="250px"
      max="600px"
      pos="350px"
    >
      {#snippet a()}
        <Sidebar class="w-full h-full border-r overflow-y-auto" />
      {/snippet}

      {#snippet b()}
        <SplitPane
          type="rows"
          id="main-vertical"
          min={showPanel ? '-50%' : '100%'}
          max={showPanel ? '-200px' : '100%'}
          pos={showPanel ? '-300px' : '100%'}
        >
          {#snippet a()}
            <div class="relative overflow-hidden min-w-0 min-h-0 h-full">
              <StructuralEditor />
              <Button
                onclick={() => (showPanel = !showPanel)}
                class="absolute bottom-0 right-0 m-2"
              >
                {showPanel ? 'Hide' : 'Show'} Panel
              </Button>
            </div>
          {/snippet}

          {#snippet b()}
            {#if showPanel}
              <div class="border-t p-4 overflow-y-auto h-full">
                <p>Toggleable Panel</p>
                <Button onclick={() => (showPanel = false)}>Close Panel</Button>
              </div>
            {/if}
          {/snippet}
        </SplitPane>
      {/snippet}
    </SplitPane>
  </div>
</div>

<style>
  :global(.konva-container-wrapper) {
    width: 100%;
    height: 100%;
  }
</style>
