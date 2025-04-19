import { SceneGraph } from '../scene/SceneGraph';
import { LineNode } from '../scene/nodes/LineNode';

export function createDemoSceneGraph(): SceneGraph {
    const graph = new SceneGraph();
    const root = graph.getRoot();
    root.add(new LineNode({ x: 0, y: 0 }, { x: 400, y: 300 }, 4, 0xff0000));
    root.add(new LineNode({ x: 400, y: 300 }, { x: 800, y: 0 }, 4, 0x00ff00));
    root.add(new LineNode({ x: 800, y: 0 }, { x: 0, y: 0 }, 4, 0x0000ff));
    root.add(new LineNode({ x: 0, y: 0 }, { x: 985.4548, y: 500 }, 4, 0xffff00));
    return graph;
}