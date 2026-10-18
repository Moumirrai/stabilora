<script lang="ts" module>
  import { type VariantProps, tv } from 'tailwind-variants';

  export const numericalInputVariants = tv({
    base: "group/numerical-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 relative flex h-8 w-full items-center overflow-hidden rounded-lg border bg-clip-padding text-sm font-medium outline-none transition-colors select-none focus-visible:ring-3 aria-invalid:ring-3 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground border-transparent',
        outline:
          'border-border bg-background text-foreground hover:bg-muted dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        secondary: 'bg-secondary text-secondary-foreground border-transparent',
        ghost: 'border-transparent hover:bg-muted dark:hover:bg-muted/50',
        destructive:
          'bg-destructive/10 text-destructive border-transparent dark:bg-destructive/20',
      },
      size: {
        default: 'h-8 gap-1.5',
        xs: 'h-6 gap-1 rounded-[min(var(--radius-md),10px)] text-xs',
        sm: 'h-7 gap-1 rounded-[min(var(--radius-md),12px)] text-[0.8rem]',
        lg: 'h-9 gap-1.5',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'default',
    },
  });

  export type NumericalInputVariant = VariantProps<
    typeof numericalInputVariants
  >['variant'];
  export type NumericalInputSize = VariantProps<
    typeof numericalInputVariants
  >['size'];
</script>

<script lang="ts">
  import { cn } from '$lib/utils.js';
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';

  let {
    value = $bindable(0),
    onchange,
    min = -Infinity,
    max = Infinity,
    step = 0.5,
    fineStep = 0.01,
    dragStep = 0.5,
    dragSensitivity = 0.1,
    precision = 2,
    prefix = '',
    suffix = '',
    prefixClass = undefined,
    suffixClass = undefined,
    affixClass = 'opacity-60',
    showAffixesWhileEditing = true,
    disabled = false,
    class: className,
    variant = 'secondary',
    size = 'default',
    tabindex = 0,
    ...restProps
  }: {
    value?: number;
    onchange?: (value: number, previous: number) => void;
    min?: number;
    max?: number;
    step?: number;
    fineStep?: number;
    dragStep?: number;
    dragSensitivity?: number;
    precision?: number;
    prefix?: string;
    suffix?: string;
    prefixClass?: string;
    suffixClass?: string;
    affixClass?: string;
    showAffixesWhileEditing?: boolean;
    disabled?: boolean;
    class?: string;
    variant?: NumericalInputVariant;
    size?: NumericalInputSize;
    tabindex?: number;
    [key: string]: unknown;
  } = $props();

  let editing = $state(false);
  let inputValue = $state('');
  let containerRef = $state<HTMLDivElement | null>(null);
  let inputRef = $state<HTMLInputElement | null>(null);

  function format(v: number): string {
    if (!Number.isFinite(v)) return String(v);
    const factor = Math.pow(10, precision);
    const rounded = Math.round(v * factor) / factor;
    if (rounded === 0 && v !== 0) return v.toExponential();
    return rounded.toFixed(precision);
  }

  function formatEdit(v: number): string {
    if (!Number.isFinite(v)) return String(v);
    return String(v);
  }

  let displayValue = $derived(format(value));

  function clamp(v: number): number {
    return Math.min(max, Math.max(min, v));
  }

  function round(v: number, to: number): number {
    const decimals = (String(to).split('.')[1] ?? '').length;
    return Number(v.toFixed(Math.min(decimals, 20)));
  }

  function snap(v: number, to: number = step): number {
    if (!Number.isFinite(to) || to === 0) return round(v, step);
    return round(Math.round(v / to) * to, to);
  }

  function commit(next: number) {
    const previous = value;
    const clamped = clamp(next);
    if (clamped === previous) return;
    value = clamped;
    onchange?.(clamped, previous);
  }

  function nudge(direction: 1 | -1) {
    commit(snap(value) + direction * step);
  }

  function startEditing(initial?: string) {
    if (disabled || editing) return;
    inputValue = initial ?? formatEdit(value);
    editing = true;
    requestAnimationFrame(() => {
      inputRef?.focus();
      if (initial === undefined) inputRef?.select();
    });
  }

  function stopEditing(save: boolean, restoreFocus = true) {
    if (!editing) return;
    if (save) {
      const parsed = parseFloat(inputValue);
      if (Number.isFinite(parsed)) commit(parsed);
    }
    editing = false;
    if (restoreFocus) {
      requestAnimationFrame(() => containerRef?.focus({ preventScroll: true }));
    }
  }

  let dragging = $state(false);
  let dragStartX = 0;
  let dragStartValue = 0;
  let dragMoved = 0;

  function onPointerDown(event: PointerEvent) {
    if (disabled || editing) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (!event.isPrimary) return;
    if ((event.target as HTMLElement).closest('[data-numerical-input-button]'))
      return;
    dragging = true;
    dragMoved = 0;
    dragStartX = event.clientX;
    dragStartValue = value;
    containerRef?.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function onPointerMove(event: PointerEvent) {
    if (!dragging || !event.isPrimary) return;
    const delta = event.clientX - dragStartX;
    dragMoved = Math.max(dragMoved, Math.abs(delta));
    const fine = fineStep ?? step;
    const snapTo = event.shiftKey ? fine : step;
    const increment = event.shiftKey
      ? fine
      : (dragStep ?? step) * dragSensitivity;
    commit(snap(dragStartValue + delta * increment, snapTo));
  }

  function onPointerUp(event: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    if (containerRef?.hasPointerCapture(event.pointerId))
      containerRef.releasePointerCapture(event.pointerId);
    if (dragMoved < 3) startEditing();
  }

  function onKeydown(event: KeyboardEvent) {
    if (editing) {
      if (event.key === 'Enter') {
        event.preventDefault();
        stopEditing(true);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        stopEditing(false);
      }
      return;
    }
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowRight':
        event.preventDefault();
        nudge(1);
        break;
      case 'ArrowDown':
      case 'ArrowLeft':
        event.preventDefault();
        nudge(-1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        startEditing();
        break;
      default:
        if (
          event.key.length === 1 &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey &&
          /[0-9a-zA-Z.\-+*/=]/.test(event.key)
        ) {
          event.preventDefault();
          startEditing(event.key);
        }
        break;
    }
  }
</script>

<div
  bind:this={containerRef}
  data-slot="numerical-input"
  data-disabled={disabled || undefined}
  class={cn(numericalInputVariants({ variant, size }), className)}
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerUp}
  onkeydown={onKeydown}
  {...restProps}
  tabindex={disabled ? -1 : tabindex}
  aria-disabled={disabled || undefined}
  aria-valuenow={value}
  aria-valuemin={Number.isFinite(min) ? min : undefined}
  aria-valuemax={Number.isFinite(max) ? max : undefined}
  style:touch-action="none"
  style:cursor={editing ? 'text' : 'ew-resize'}
  role="spinbutton"
>
  <button
    type="button"
    data-numerical-input-button="decrement"
    aria-label="Decrement"
    tabindex={-1}
    {disabled}
    onclick={(e) => {
      e.stopPropagation();
      nudge(-1);
    }}
    class={cn(
      'absolute inset-y-0 left-0 z-10 flex w-6 items-center justify-center border-r bg-transparent text-muted-foreground opacity-0 outline-none transition-opacity group-hover/numerical-input:opacity-100 hover:bg-transparent hover:text-foreground disabled:pointer-events-none active:not-aria-[haspopup]:translate-y-px'
    )}
  >
    <ChevronLeftIcon class="size-3.5" />
  </button>

  <div
    class={cn(
      'flex flex-1 items-center justify-center gap-0.5 px-7',
      !editing && 'pointer-events-none'
    )}
  >
    {#if editing}
      {#if showAffixesWhileEditing && prefix}
        <span class={cn(affixClass, prefixClass, 'shrink-0')}>{prefix}</span>
      {/if}
      <input
        bind:this={inputRef}
        bind:value={inputValue}
        {disabled}
        inputmode="decimal"
        class="w-full min-w-0 bg-transparent text-center tabular-nums outline-none"
        onkeydown={onKeydown}
        onpointerdown={(e) => e.stopPropagation()}
        onblur={() => stopEditing(true, false)}
      />
      {#if showAffixesWhileEditing && suffix}
        <span class={cn(affixClass, suffixClass, 'shrink-0')}>{suffix}</span>
      {/if}
    {:else}
      {#if prefix}
        <span class={cn(affixClass, prefixClass, 'shrink-0')}>{prefix}</span>
      {/if}
      <span class="tabular-nums">{displayValue}</span>
      {#if suffix}
        <span class={cn(affixClass, suffixClass, 'shrink-0')}>{suffix}</span>
      {/if}
    {/if}
  </div>

  <button
    type="button"
    data-numerical-input-button="increment"
    aria-label="Increment"
    tabindex={-1}
    {disabled}
    onclick={(e) => {
      e.stopPropagation();
      nudge(1);
    }}
    class={cn(
      'absolute inset-y-0 right-0 z-10 flex w-6 items-center justify-center border-l bg-transparent text-muted-foreground opacity-0 outline-none transition-opacity group-hover/numerical-input:opacity-100 hover:bg-transparent hover:text-foreground disabled:pointer-events-none active:not-aria-[haspopup]:translate-y-px'
    )}
  >
    <ChevronRightIcon class="size-3.5" />
  </button>
</div>
