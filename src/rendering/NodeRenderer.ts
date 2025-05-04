import Konva from 'konva';
import type { Node } from '../stores/model/model.types';
import type ViewportManager from '../viewport/ViewportManager';
import { selectedNodeStore } from "../stores/ui/store"

class NodeRenderer {
    private targetLayer: Konva.Layer;
    private stageManager: ViewportManager;
    private nodeShapes: Map<string | number, Konva.Circle> = new Map(); // Cache for node shapes

    private nodeRadius = 5;
    private nodeColor = '#ffffff';

    constructor(targetLayer: Konva.Layer, stageManager: ViewportManager) {
        this.targetLayer = targetLayer;
        this.stageManager = stageManager;
    }

    public updateNode(node: Node): void {
        const stage = this.stageManager.getStage();
        if (!stage) return;
        const scale = stage.scaleX();
        // Find the existing node circle from the cache
        const nodeCircle = this.nodeShapes.get(node.id); // Use map for O(1) lookup
        if (!nodeCircle) {
            // Optional: Log warning or handle case where node shape wasn't cached
            // console.warn(`Node circle for node ${node.id} not found in cache`);
            return;
        }
        // Update the radius of the node circle
        nodeCircle.radius(this.nodeRadius / scale); // Adjust radius for zoom
        // IMPORTANT: Avoid drawing here. Call batchDraw() on the layer *after* all nodes are updated.
    }

    public drawNode(node: Node): void {
        const scale = this.stageManager.getStage()?.scaleX() || 1;
        const circle = new Konva.Circle({
            x: node.dx,
            y: node.dy,
            radius: this.nodeRadius / scale, // Adjust radius for zoom
            fill: this.nodeColor,
            draggable: false,
            id: `node-${node.id}`, // Keep ID for potential debugging or other uses
            hitStrokeWidth: this.nodeRadius * 2 - 1,
            strokeScaleEnabled: false,
            selectable: true,
            perfectDrawEnabled: false, // Good for performance
            listening: true // Keep true for events
        });

        // Add to cache
        this.nodeShapes.set(node.id, circle);

        circle.on('mouseover', () => {
            // Consider optimizing hover effects if they cause lag too
            circle.fill('red');
            // Use batchDraw for potentially better performance if many things change at once
            // this.targetLayer.draw();
             this.targetLayer.batchDraw();
        });
        circle.on('mouseout', () => {
            circle.fill(this.nodeColor);
            // this.targetLayer.draw();
             this.targetLayer.batchDraw();
        });
        circle.on('contextmenu', (e) => {
            e.evt.preventDefault();
            const screenPos = circle.getAbsolutePosition();
            selectedNodeStore.set({ node: node, screenPosition: screenPos });
            // No drawing needed here usually, unless the selection itself changes appearance immediately
            // this.targetLayer.batchDraw();
        });
        this.targetLayer.add(circle);
        // Avoid drawing here; draw should happen after adding multiple nodes if possible
    }

    // Add a method to remove nodes from the cache and layer when they are deleted
    public removeNode(nodeId: string | number): void {
        const nodeCircle = this.nodeShapes.get(nodeId);
        if (nodeCircle) {
            nodeCircle.destroy(); // Remove from Konva layer and clean up listeners
            this.nodeShapes.delete(nodeId); // Remove from cache
            // Consider calling batchDraw() after removing nodes if needed
        }
    }

    // Optional: Method to update all nodes at once, e.g., on zoom
    public updateAllNodeRadii(): void {
        const stage = this.stageManager.getStage();
        if (!stage) return;
        const scale = stage.scaleX();
        this.nodeShapes.forEach(nodeCircle => {
            nodeCircle.radius(this.nodeRadius / scale);
        });
        this.targetLayer.batchDraw(); // Draw once after all updates
    }
}

export default NodeRenderer;