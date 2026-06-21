<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { Button } from '$lib/components/ui/button';
  import { app } from '../../app/App';
  import { Transaction, AddNodeOperation, AddElementOperation } from '@stabilora/arcora';
  import TestComponent from '../../components/TestComponent.svelte';

  let { class: className }: { class?: string } = $props();

  function addRandomNode() {
    const scene = app.scene;
    if (!scene) return;
    const txn = new Transaction('addRandomNode');
    const nodeA = new AddNodeOperation({ x: randomNumber(), z: randomNumber() });
    const nodeB = new AddNodeOperation({ x: randomNumber(), z: randomNumber() });
    txn.addCommand(nodeA);
    txn.addCommand(nodeB);
    txn.addCommand(new AddElementOperation({ nodeIDs: [nodeA.id, nodeB.id] }));
    scene.repository.commit(txn);
    scene.renderSync();
  }

  function undo() {
    app.scene?.repository.undo();
    app.scene?.renderSync();
  }

  function redo() {
    app.scene?.repository.redo();
    app.scene?.renderSync();
  }

  function randomNumber(): number {
    return Math.floor((Math.random() - 0.5) * 5_000);
  }
</script>

<div class={cn('pb-12', className)}>
  <div class="space-y-4 py-4">
    <div class="px-3 py-2">
      <h2 class="mb-2 px-4 text-lg font-semibold tracking-tight">Stabilora</h2>
      <Button variant="outline" class="w-full" onclick={() => addRandomNode()}>
        Add Random Node
      </Button>
      <Button variant="outline" class="w-full" onclick={undo}>
        Undo
      </Button>
      <Button variant="outline" class="w-full" onclick={redo}>
        Redo
      </Button>
      <Button
        variant="outline"
        class="w-full"
        onclick={() => console.log(app.scene?.spatialIndex)}
      >
        Print
      </Button>
      <TestComponent />
    </div>
  </div>
</div>
