<script lang="ts">
  import { renderingConfigStore } from '../viewport/rendering/store/RenderingConfig';
  import Slider from '$lib/components/ui/slider/slider.svelte';
  import { Checkbox } from '$lib/components/ui/checkbox';
  import { Label } from '$lib/components/ui/label';

  let config = $renderingConfigStore;

  // Reactive variables for binding
  $: nodeScale = config.node.scale;
  $: supportScale = config.supports.scale;
  $: indicatorVisible = config.element.bottomFibersVisible;
  $: bottomFibersDashed = config.element.bottomFibersDashed;
  $: supportsVisible = config.supports.visible;

  // Update store when reactive variables change
  $: renderingConfigStore.update((current) => ({
    ...current,
    node: { ...current.node, scale: nodeScale },
    supports: { ...current.supports, scale: supportScale, visible: supportsVisible },
    element: {
      ...current.element,
      bottomFibersVisible: indicatorVisible,
      bottomFibersDashed: bottomFibersDashed,
    },
    isDirty: true,
  }));
</script>

<div class="mb-4">
  <label for="node-scale">Node Scale: {nodeScale}</label>
  <Slider
    id="node-scale"
    type="single"
    bind:value={nodeScale}
    min={0.5}
    max={5.0}
    step={0.1}
    class="max-w-[70%]"
  />
</div>

<div class="flex items-center gap-3 mb-4">
  <Checkbox bind:checked={indicatorVisible} id="indicator-visible" />
  <Label for="indicator-visible">Indicator Visible</Label>
</div>

<div class="mb-4">
  <label for="support-scale">Support Scale: {supportScale}</label>
  <Slider
    id="support-scale"
    type="single"
    bind:value={supportScale}
    min={0.5}
    max={5.0}
    step={0.1}
    class="max-w-[70%]"
  />
</div>

<div class="flex items-center gap-3 mb-4">
  <Checkbox bind:checked={bottomFibersDashed} id="bottom-fibers-dashed" />
  <Label for="bottom-fibers-dashed">Bottom Fibers Dashed</Label>
</div>

<div class="flex items-center gap-3">
  <Checkbox bind:checked={supportsVisible} id="supports-visible" />
  <Label for="supports-visible">Supports Visible</Label>
</div>

