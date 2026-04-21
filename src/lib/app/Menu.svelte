<script lang="ts">
  import * as Menubar from '$lib/components/ui/menubar';
  import { Button } from '$lib/components/ui/button';
  import { Separator } from '$lib/components/ui/separator';
  import { Undo, Redo } from '@lucide/svelte';
  import { db } from '../../database/DatabaseManager';
  import * as Tooltip from '$lib/components/ui/tooltip';
  import { viewportStore } from '../../stores/app/store';
  import { get } from 'svelte/store';
  import { Code } from '@lucide/svelte';

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
    <Menubar.Content>
      <Menubar.Item onclick={() => get(viewportStore)?.fitInView(0.3)}>
        Fit in view
      </Menubar.Item>
    </Menubar.Content>
  </Menubar.Menu>
  <Menubar.Menu>
    <Menubar.Trigger>Export</Menubar.Trigger>
    <Menubar.Content></Menubar.Content>
  </Menubar.Menu>
  <Menubar.Menu>
    <Menubar.Trigger>Help</Menubar.Trigger>
    <Menubar.Content>
      <Menubar.Item
        onclick={() =>
          window
            .open('https://github.com/Moumirrai/stabilora/issues/new', '_blank')
            ?.focus()}
        >New Github Issue<Menubar.Shortcut><Code size="16" /></Menubar.Shortcut
        ></Menubar.Item
      >
    </Menubar.Content>
  </Menubar.Menu>
  <Separator orientation="vertical" class="h-[20px]" />
  <Tooltip.Root delayDuration={0}>
    <Tooltip.Trigger id="undo_tooltip">
      <Button
        disabled={!$canUndo}
        onclick={() => {
          db.undo();
        }}
        variant="ghost"
        class="px-2 h-7"><Undo size="16" /></Button
      >
    </Tooltip.Trigger>
    <Tooltip.Content><p>Undo (Ctrl + Z)</p></Tooltip.Content>
  </Tooltip.Root>
  <Tooltip.Root delayDuration={0}>
    <Tooltip.Trigger id="redo_tooltip">
      <Button
        disabled={!$canRedo}
        onclick={() => {
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
