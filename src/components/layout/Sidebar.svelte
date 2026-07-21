<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { Button } from '$lib/components/ui/button';
  import { app } from '../../app/App';
  import {
    Node,
    Element,
    Transaction,
    AddNodeOperation,
    AddElementOperation,
    RemoveElementOperation,
    RemoveNodeOperation,
    add
  } from '@stabilora/arcora';

  let { class: className }: { class?: string } = $props();

  function addRandomNode() {
    const scene = app.scene;
    if (!scene) return;
    const txn = new Transaction('addRandomNode');
    const nodeA = new AddNodeOperation({
      x: randomNumber(),
      z: randomNumber(),
    });
    const nodeB = new AddNodeOperation({
      x: randomNumber(),
      z: randomNumber(),
    });
    txn.addCommand(nodeA);
    txn.addCommand(nodeB);
    txn.addCommand(new AddElementOperation({ nodeIDs: [nodeA.id, nodeB.id] }));
    scene.repository.commit(txn);
    scene.renderSync();
  }

  function deleteSelected() {
    const scene = app.scene;
    if (!scene) return;
    const txn = new Transaction('Delete selection');
    for (const entity of scene.selection.selected.values()) {
      if (entity instanceof Node) {
        txn.addCommand(new RemoveNodeOperation(entity.id));
      } else {
        txn.addCommand(new RemoveElementOperation(entity.id));
      }
    }
    scene.repository.commit(txn);
    scene.selection.clearSelection();
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
      <Button variant="outline" class="w-full" onclick={undo}>Undo</Button>
      <Button variant="outline" class="w-full" onclick={redo}>Redo</Button>
      <Button
        variant="outline"
        class="w-full"
        onclick={() => console.log(app.scene?.spatialIndex)}
      >
        Print
      </Button>
      <Button
        variant="outline"
        class="w-full"
        onclick={() => deleteSelected()}
      >
        Delete selected
      </Button>
      <Button
        variant="outline"
        class="w-full"
        onclick={() => console.log(add(5, 8))}
      >
        Test WASM
      </Button>
    </div>
  </div>
</div>
