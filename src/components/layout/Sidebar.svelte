<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { Button } from '$lib/components/ui/button';
  import {
    NumericalInput,
    NumericalInputGroup,
    NumericalInputGroupLabel,
  } from '$lib/components/ui/numerical-input';
  import { app } from '../../app/App';
  import { Checkbox } from '$lib/components/ui/checkbox';
  import { DEFAULT_SUPPORT_SIZE } from '../../viewport/rendering/primitives/supportStyle';
  import { DEFAULT_REACTION_SIZE } from '../../viewport/rendering/primitives/reactionStyle';
  import { DEFAULT_LABEL_FONT_SIZE_PX } from '../../viewport/rendering/labels/labelSystem';
  import { NODE_LABEL_CHANNEL } from '../../scene/NodeLabels';
  import { REACTION_LABEL_CHANNEL } from '../../scene/ReactionLabels';
  import {
    Node,
    Transaction,
    AddNodeOperation,
    AddElementOperation,
    RemoveElementOperation,
    RemoveNodeOperation,
  } from '@stabilora/arcora';
  import { buildFrame } from '../../utils/DemoFrame';

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
    txn.addCommand(
      new AddElementOperation({
        nodeIDs: [nodeA.id, nodeB.id],
        materialID: dM.id,
        crossectionID: dXS.id,
      })
    );
    scene.repository.commit(txn);
    scene.renderSync();
  }

  function deleteSelected() {
    const scene = app.scene;
    if (!scene) return;
    const txn = new Transaction('Delete selection');
    for (const entity of scene.selection.selected.values()) {
      if (entity instanceof Node) {
        if (!scene.model.nodes.has(entity.id)) continue;
        txn.addCommand(new RemoveNodeOperation(entity.id));
      } else {
        if (!scene.model.elements.has(entity.id)) continue;
        txn.addCommand(new RemoveElementOperation(entity.id));
      }
    }
    scene.repository.commit(txn);
    scene.selection.clearSelection();
    scene.renderSync();
  }

  function slv() {
    const currentTime = performance.now();
    const scene = app.scene;
    if (!scene) return;
    const res = scene.solve();
    const elapsedTime = performance.now() - currentTime;
    console.log('Solver result:', res);
    console.log(`Solver took ${elapsedTime.toFixed(2)} ms`);
  }

  function randomNumber(): number {
    return Math.floor((Math.random() - 0.5) * 5_000);
  }

  let bays = $state(3);
  let storeys = $state(4);

  let supportSize = $state(DEFAULT_SUPPORT_SIZE);

  function handleSupportSize(value: number) {
    app.scene?.setSupportSize(value);
  }

  let nodeLabelSize = $state(DEFAULT_LABEL_FONT_SIZE_PX);
  let nodeLabelsVisible = $state(true);

  function handleNodeLabelSize(value: number) {
    app.scene?.setLabelSize(value, NODE_LABEL_CHANNEL);
  }

  function handleNodeLabelsVisible(visible: boolean) {
    nodeLabelsVisible = visible;
    app.scene?.setChannelVisible(NODE_LABEL_CHANNEL, visible);
  }

  let reactionSize = $state(DEFAULT_REACTION_SIZE);
  let reactionsVisible = $state(true);
  let reactionLabelSize = $state(DEFAULT_LABEL_FONT_SIZE_PX);

  function handleReactionSize(value: number) {
    app.scene?.setReactionSize(value);
  }

  function handleReactionsVisible(visible: boolean) {
    reactionsVisible = visible;
    app.scene?.setReactionsVisible(visible);
  }

  function handleReactionLabelSize(value: number) {
    app.scene?.setLabelSize(value, REACTION_LABEL_CHANNEL);
  }

  function genFrame() {
    const scene = app.scene;
    if (!scene) return;
    const frame = buildFrame(bays, storeys);
    scene.repository.commit(frame);
    scene.renderSync();
  }
</script>

<div class={cn('pb-12', className)}>
  <div class="space-y-4 py-4">
    <div class="px-3 py-2">
      <h2 class="mb-2 px-4 text-lg font-semibold tracking-tight">Stabilora</h2>
      <Button variant="outline" class="w-full" onclick={() => addRandomNode()}>
        Add Random Node
      </Button>
      <Button variant="outline" class="w-full" onclick={() => deleteSelected()}>
        Delete selected
      </Button>
      <Button variant="outline" class="w-full" onclick={() => slv()}>
        Solve
      </Button>

      <div class="space-y-2 pt-2">
        <NumericalInputGroupLabel>Frame generator</NumericalInputGroupLabel>
        <NumericalInputGroup>
          <NumericalInput
            bind:value={bays}
            step={1}
            precision={0}
            prefix="Bays = "
          />
          <NumericalInput
            bind:value={storeys}
            step={1}
            precision={0}
            prefix="Storeys = "
          />
        </NumericalInputGroup>
        <Button variant="outline" class="w-full" onclick={() => genFrame()}>
          Generate Frame
        </Button>

        <div class="space-y-2 pt-4">
          <p class="text-xs font-medium text-muted-foreground">Support size</p>
          <NumericalInput
            bind:value={supportSize}
            min={20}
            max={60}
            step={1}
            dragStep={1}
            precision={0}
            suffix=" px"
            onchange={handleSupportSize}
          />
        </div>

        <div class="space-y-2 pt-2">
          <p class="text-xs font-medium text-muted-foreground">
            Node label size
          </p>
          <NumericalInput
            bind:value={nodeLabelSize}
            min={6}
            max={48}
            step={1}
            dragStep={1}
            precision={0}
            suffix=" px"
            onchange={handleNodeLabelSize}
          />
        </div>

        <div class="flex items-center gap-2 pt-2">
          <Checkbox
            checked={nodeLabelsVisible}
            onCheckedChange={(v) => handleNodeLabelsVisible(v)}
          />
          <span class="text-xs font-medium text-muted-foreground">
            Show node labels
          </span>
        </div>

        <div class="space-y-2 pt-4">
          <p class="text-xs font-medium text-muted-foreground">Reaction size</p>
          <NumericalInput
            bind:value={reactionSize}
            min={16}
            max={60}
            step={1}
            dragStep={1}
            precision={0}
            suffix=" px"
            onchange={handleReactionSize}
          />
        </div>

        <div class="space-y-2 pt-2">
          <p class="text-xs font-medium text-muted-foreground">
            Reaction label size
          </p>
          <NumericalInput
            bind:value={reactionLabelSize}
            min={6}
            max={48}
            step={1}
            dragStep={1}
            precision={0}
            suffix=" px"
            onchange={handleReactionLabelSize}
          />
        </div>

        <div class="flex items-center gap-2 pt-2">
          <Checkbox
            checked={reactionsVisible}
            onCheckedChange={(v) => handleReactionsVisible(v)}
          />
          <span class="text-xs font-medium text-muted-foreground">
            Show reactions
          </span>
        </div>
      </div>
    </div>
  </div>
</div>
