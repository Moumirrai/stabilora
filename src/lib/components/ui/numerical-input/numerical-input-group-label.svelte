<script lang="ts">
  import { cn, type WithElementRef } from '$lib/utils.js';
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
  bind:this={ref}
  data-slot="numerical-input-group-label"
  class={cn(
    'text-sm font-medium text-muted-foreground gap-2 flex w-full min-w-0 items-center',
    className
  )}
  {...restProps}
>
  {@render children?.()}
</div>
