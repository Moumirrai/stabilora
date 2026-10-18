<script lang="ts" module>
  import { tv, type VariantProps } from 'tailwind-variants';

  export const numericalInputGroupVariants = tv({
    base: 'group/numerical-input-group flex w-full items-stretch',
    variants: {
      orientation: {
        horizontal:
          "[&>[data-slot=numerical-input]]:w-0 [&>[data-slot=numerical-input]]:flex-1 [&>[data-slot=numerical-input]:not(:has(~[data-slot=numerical-input]))]:rounded-r-lg! [&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none",
        vertical: 'grid numerical-input-group-vertical',
      },
    },
    defaultVariants: {
      orientation: 'horizontal',
    },
  });

  export type NumericalInputGroupOrientation = VariantProps<
    typeof numericalInputGroupVariants
  >['orientation'];
</script>

<script lang="ts">
  import { cn, type WithElementRef } from '$lib/utils.js';
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    ref = $bindable(null),
    class: className,
    children,
    orientation = 'horizontal',
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
    orientation?: NumericalInputGroupOrientation;
  } = $props();
</script>

<div
  bind:this={ref}
  role="group"
  data-slot="numerical-input-group"
  data-orientation={orientation}
  class={cn(numericalInputGroupVariants({ orientation }), className)}
  {...restProps}
>
  {@render children?.()}
</div>

<style>
  .numerical-input-group-vertical {
    grid-template-columns: var(--numerical-input-group-label-width, auto) 1fr;
    column-gap: var(--numerical-input-group-label-gap, 0.5rem);
    row-gap: var(--numerical-input-group-gap, 0px);
    align-items: center;
  }

  .numerical-input-group-vertical
    :global([data-slot='numerical-input-group-label']) {
    display: contents;
  }

  .numerical-input-group-vertical :global([data-slot='numerical-input']) {
    width: 100%;
  }

  .numerical-input-group-vertical
    :global(> *:not(:first-child) [data-slot='numerical-input']),
  .numerical-input-group-vertical
    :global(> [data-slot='numerical-input']:not(:first-child)) {
    border-top-left-radius: 0;
    border-top-right-radius: 0;
    border-top-width: 0;
  }

  .numerical-input-group-vertical
    :global(> *:not(:last-child) [data-slot='numerical-input']),
  .numerical-input-group-vertical
    :global(> [data-slot='numerical-input']:not(:last-child)) {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }
</style>
