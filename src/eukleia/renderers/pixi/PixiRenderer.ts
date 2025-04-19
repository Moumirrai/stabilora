import { Graphics, Text, Container } from 'pixi.js';
import type { SceneGraph } from '../../scene/SceneGraph';
import type { SceneNode } from '../../scene/SceneNode';
import { LineNode } from '../../scene/nodes/LineNode';

export function renderSceneGraphToPixi(scene: SceneGraph, container: Container) {
    container.removeChildren();
    const root = scene.getRoot();
    renderNodeRecursive(root, container);
}

function renderNodeRecursive(node: SceneNode, container: Container) {
    if (node instanceof LineNode) {
        console.log("Rendering LineNode", node);
        const g = new Graphics()
            .moveTo(node.from.x, node.from.y)
            .lineTo(node.to.x, node.to.y)
            .stroke({ color: node.color, pixelLine: true })
        container.addChild(g);
    }

    for (const child of node.children) {
        renderNodeRecursive(child, container);
    }
}