<script lang="ts">
  import * as Menubar from '$lib/components/ui/menubar';
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
    </Menubar.Content>
  </Menubar.Menu>
  <Menubar.Menu>
    <Menubar.Trigger>Export</Menubar.Trigger>
    <Menubar.Content>
    </Menubar.Content>
  </Menubar.Menu>
  <Menubar.Menu>
    <Menubar.Trigger>Help</Menubar.Trigger>
    <Menubar.Content>
    </Menubar.Content>
  </Menubar.Menu>
</Menubar.Root>
