<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { Button } from '$lib/components/ui/button';
  import { NumericalInput, NumericalInputGroup, NumericalInputGroupLabel } from '$lib/components/ui/numerical-input';
  import { app } from '../../app/App';
  import {
    Node,
    Element,
    Transaction,
    AddNodeOperation,
    AddElementOperation,
    RemoveElementOperation,
    RemoveNodeOperation
  } from '@stabilora/arcora';

  let { class: className }: { class?: string } = $props();

  function addRandomNode() {
    const scene = app.scene;
    const dM = scene?.model?.materials.values().next().value!;
    const dXS = scene?.model?.crossections.values().next().value!;
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
    txn.addCommand(new AddElementOperation({ nodeIDs: [nodeA.id, nodeB.id], materialID: dM.id, crossectionID: dXS.id }));
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

  function slv() {
    const currentTime = performance.now();
    const scene = app.scene;
    if (!scene) return;
    const model = scene.model!;
    const lc = model.loadCases.values().next().value!;
    if (!lc) return;
    const res = scene.solver.solve(lc.id);
    console.log('Solver result:', res);
    const elapsedTime = performance.now() - currentTime;
    console.log(`Solver took ${elapsedTime.toFixed(2)} ms`);
  }

  function randomNumber(): number {
    return Math.floor((Math.random() - 0.5) * 5_000);
  }

  let span = $state(5);
  let step = $state(0.1);
  let x = $state(0);
  let y = $state(0);
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
        onclick={() => slv()}
      >
        Solve
      </Button>

      <div class="space-y-2 pt-2">
        <p class="text-xs font-medium text-muted-foreground">Numerical Input</p>
        <NumericalInput
          bind:value={span}
          min={0}
          max={100}
          step={0.5}
          dragStep={0.5}
          fineStep={0.01}
          dragSensitivity={0.1}
          suffix=" m"
          onchange={(v, prev) => console.log('span', prev, '->', v)}
        />

        <p class="pt-2 text-xs font-medium text-muted-foreground">
          Horizontal Group
        </p>
        <NumericalInputGroup>
          <NumericalInput bind:value={x} step={0.1} prefix="X = " />
          <NumericalInput bind:value={y} step={0.1} prefix="Y = "/>
        </NumericalInputGroup>

        <p class="pt-2 text-xs font-medium text-muted-foreground">
          Vertical Group
        </p>
        <NumericalInputGroup orientation="vertical" class="w-full">
          <NumericalInputGroupLabel>
            <span class="truncate">Length</span>
            <NumericalInput bind:value={span} step={0.1} suffix=" m"  precision={2}/>
          </NumericalInputGroupLabel>
          <NumericalInputGroupLabel>
            <span class="truncate">Coefficient</span>
            <NumericalInput bind:value={step} step={0.1} />
          </NumericalInputGroupLabel>
        </NumericalInputGroup>
      </div>
    </div>
  </div>
</div>
