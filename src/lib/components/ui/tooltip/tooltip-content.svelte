<script lang="ts">
  import { Tooltip as TooltipPrimitive } from 'bits-ui';
  import { cn, flyAndScale } from '$lib/utils.js';

  type $$Props = TooltipPrimitive.ContentProps;

  let className: $$Props['class'] = undefined;
  export let sideOffset: $$Props['sideOffset'] = 4;
  export let transition: $$Props['transition'] = flyAndScale;
  export let transitionConfig: $$Props['transitionConfig'] = {
    y: 8,
    duration: 150,
  };
  export { className as class };
</script>

<TooltipPrimitive.Content
  {transition}
  {transitionConfig}
  {sideOffset}
  class={cn(
    'bg-popover text-popover-foreground z-50 overflow-hidden rounded-md px-3 py-1.5 text-xs',
    className
  )}
  {...$$restProps}
>
  <slot />
</TooltipPrimitive.Content>
