<script lang="ts">
  import * as Menubar from '$lib/components/ui/menubar';
  import { Button } from '$lib/components/ui/button';
  import { Separator } from '$lib/components/ui/separator';
  import { Undo, Redo } from '@lucide/svelte';
  import { db } from '../../database/DatabaseManager';
  import * as Tooltip from '$lib/components/ui/tooltip';

  const { canRedo, canUndo } = db;
</script>

<Menubar.Root class="rounded-none border-b border-none px-2">
  <Menubar.Menu>
    <Menubar.Trigger class="font-bold">File</Menubar.Trigger>
    <Menubar.Content>
      <Menubar.Item>
        New <Menubar.Shortcut>Ctrl + N</Menubar.Shortcut>
      </Menubar.Item>
      <Menubar.Item>Open</Menubar.Item>
      <Menubar.Separator />
      <Menubar.Item>
        Save <Menubar.Shortcut>Ctrl + S</Menubar.Shortcut>
      </Menubar.Item>
      <Menubar.Item>
        Save As<Menubar.Shortcut>Ctrl + Shift + S</Menubar.Shortcut>
      </Menubar.Item>
      <Menubar.Separator />
      <Menubar.Item>Preferences</Menubar.Item>
    </Menubar.Content>
  </Menubar.Menu>
  <Menubar.Menu>
    <Menubar.Trigger class="relative">View</Menubar.Trigger>
    <Menubar.Content></Menubar.Content>
  </Menubar.Menu>
  <Menubar.Menu>
    <Menubar.Trigger>Export</Menubar.Trigger>
    <Menubar.Content></Menubar.Content>
  </Menubar.Menu>
  <Menubar.Menu>
    <Menubar.Trigger>Help</Menubar.Trigger>
    <Menubar.Content></Menubar.Content>
  </Menubar.Menu>
  <Separator orientation="vertical" class="h-[20px]" />
  <Tooltip.Root openDelay={0} group>
    <Tooltip.Trigger id="undo_tooltip" asChild let:builder>
      <Button
        builders={[builder]}
        disabled={!$canUndo}
        on:click={() => {
          db.undo();
        }}
        variant="ghost"
        class="px-2 h-7"><Undo size="16" /></Button
      >
    </Tooltip.Trigger>
    <Tooltip.Content><p>Undo (Ctrl + Z)</p></Tooltip.Content>
  </Tooltip.Root>
  <Tooltip.Root openDelay={0} group>
    <Tooltip.Trigger id="redo_tooltip" asChild let:builder>
      <Button
        builders={[builder]}
        disabled={!$canRedo}
        on:click={() => {
          db.redo();
        }}
        variant="ghost"
        class="px-2 h-7"
      >
        <Redo size="16" />
      </Button>
    </Tooltip.Trigger>
    <Tooltip.Content><p>Redo (Ctrl + Shift + Z)</p></Tooltip.Content>
  </Tooltip.Root>
</Menubar.Root>
