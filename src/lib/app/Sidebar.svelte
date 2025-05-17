<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { Button } from '$lib/components/ui/button';
  import { modelStore } from '../../stores/model/store';

  let className: string | null | undefined = undefined;
  export { className as class };
  import { db } from '../../database/DatabaseManager';
  import { Transaction } from '../../database/Transaction';

  function addRandomNode() {
    const transaction = new Transaction('addRandomNode');
    const nodeA = transaction.addNode(randomNumber(), randomNumber());
    const nodeB = transaction.addNode(randomNumber(), randomNumber());
    //get those two nodes
    const node1 = transaction.addElement(nodeA, nodeB);
    //transaction.addNode(randomNumber(), randomNumber());
    db.commit(transaction);
  }

  function randomNumber(): number {
    const randomNumber = Math.floor((Math.random() - 0.5) * 5_000);
    return randomNumber;
  }
</script>

<div class={cn('pb-12', className)}>
  <div class="space-y-4 py-4">
    <div class="px-3 py-2">
      <h2 class="mb-2 px-4 text-lg font-semibold tracking-tight">Stabilora</h2>
      <Button variant="outline" class="w-full" on:click={() => addRandomNode()}>
        Add Random Node
      </Button>
      <Button variant="outline" class="w-full" on:click={() => db.undo()}>
        Undo
      </Button>
      <Button variant="outline" class="w-full" on:click={() => db.redo()}>
        Redo
      </Button>
    </div>
  </div>
</div>
