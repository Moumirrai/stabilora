<script lang="ts">
  import KonvaTest from '../components/KonvaTest.svelte';
  import { Button } from '$lib/components/ui/button';
  import Menu from '$lib/app/Menu.svelte';
  import Sidebar from '$lib/app/Sidebar.svelte';
</script>

<main class="h-screen flex flex-col">
  <div class="md:block">
    <Menu />
    <div class="border-t"></div>
  </div>
  <div class="bg-background flex flex-grow overflow-hidden">
    <Sidebar class="w-80 flex-shrink-0" />
    <div class="flex-grow border-l">
      <KonvaTest />
    </div>
  </div>
</main>

<style>
</style>
