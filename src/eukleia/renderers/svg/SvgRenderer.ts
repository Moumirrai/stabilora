import type { SceneGraph } from '../../scene/SceneGraph';
import type { SceneNode } from '../../scene/SceneNode';
import { LineNode } from '../../scene/nodes/LineNode';

/**
 * Renders a SceneGraph to an SVG element
 * @param scene The scene graph to render
 * @param svgElement The target SVG element
 */
export function renderSceneGraphToSvg(scene: SceneGraph, svgElement: SVGSVGElement) {
    // Clear existing content
    while (svgElement.firstChild) {
        svgElement.removeChild(svgElement.firstChild);
    }
    
    const root = scene.getRoot();
    renderNodeRecursive(root, svgElement);
}

function hexColorToString(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
}

/**
 * Recursively renders a scene node and its children to the SVG element
 */
function renderNodeRecursive(node: SceneNode, svgElement: SVGSVGElement) {
    if (node instanceof LineNode) {
        console.log("Rendering LineNode to SVG", node);
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', node.from.x.toString());
        line.setAttribute('y1', node.from.y.toString());
        line.setAttribute('x2', node.to.x.toString());
        line.setAttribute('y2', node.to.y.toString());
        line.setAttribute('stroke', hexColorToString(node.color));
        line.setAttribute('stroke-width', '1');
        
        svgElement.appendChild(line);
    }

    // Recursively render all children
    for (const child of node.children) {
        renderNodeRecursive(child, svgElement);
    }
}

/**
 * Creates an SVG element that can be used with the renderer
 * @param width The width of the SVG
 * @param height The height of the SVG
 * @returns A new SVG element
 */
export function createSvgElement(width: number, height: number): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width.toString());
    svg.setAttribute('height', height.toString());
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    return svg;
}