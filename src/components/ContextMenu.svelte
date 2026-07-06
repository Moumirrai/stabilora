<script lang="ts">
  import * as ContextMenu from '$lib/components/ui/context-menu';
  import { app, canRedo, canUndo } from '../app/App';

  let { children } = $props();
</script>

<ContextMenu.Root>
  <ContextMenu.Trigger class="w-full h-full">
    {@render children()}
  </ContextMenu.Trigger>

  <ContextMenu.Content class="w-52">
    <ContextMenu.Item onclick={() => app.scene?.fitInView()}>
      Fit in View
    </ContextMenu.Item>
    <ContextMenu.Item disabled={!$canUndo} onclick={() => app.scene?.undo()}>
      Undo
      <ContextMenu.Shortcut>Ctrl + Z</ContextMenu.Shortcut>
    </ContextMenu.Item>
    <ContextMenu.Item disabled={!$canRedo} onclick={() => app.scene?.redo()}>
      Redo
      <ContextMenu.Shortcut>Ctrl + Y</ContextMenu.Shortcut>
    </ContextMenu.Item>
    <!--
    <ContextMenu.Sub>
      <ContextMenu.SubTrigger>More Tools</ContextMenu.SubTrigger>
      <ContextMenu.SubContent class="w-48">
        <ContextMenu.Item>
          Save Page As...
          <ContextMenu.Shortcut>⇧⌘S</ContextMenu.Shortcut>
        </ContextMenu.Item>
        <ContextMenu.Item>Create Shortcut...</ContextMenu.Item>
        <ContextMenu.Item>Name Window...</ContextMenu.Item>
        <ContextMenu.Separator />
        <ContextMenu.Item>Developer Tools</ContextMenu.Item>
      </ContextMenu.SubContent>
    </ContextMenu.Sub>
    -->
  </ContextMenu.Content>
</ContextMenu.Root>
