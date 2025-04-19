<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { EukliaRuntime } from '../eukleia/EukliaRuntime';

  export let runtime: EukliaRuntime;
  onDestroy(() => {
    runtime?.destroy();
    console.log("PixiCanvasTest destroyed, runtime cleanup called.");
  });
</script>