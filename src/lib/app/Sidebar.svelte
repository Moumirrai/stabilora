<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { Button } from "$lib/components/ui/button";
	import { modelStore } from '../../stores/model/store';

	let className: string | null | undefined = undefined;
	export { className as class };
</script>

<div class={cn("pb-12", className)}>
	<div class="space-y-4 py-4">
		<div class="px-3 py-2">
			<h2 class="mb-2 px-4 text-lg font-semibold tracking-tight">Stabilora</h2>
			<Button variant="outline" class="w-full" on:click={() => modelStore.reset()}>
				Reset Model
			</Button>
		</div>
	</div>
</div>