import { SceneNode } from '../SceneNode';
import type { Point } from './types';

export class LineNode extends SceneNode {
    from: Point;
    to: Point;
    width: number;
    color: number;

    constructor(from: Point, to: Point, width = 2, color = 0xffffff) {
        super();
        this.from = from;
        this.to = to;
        this.width = width;
        this.color = color;
    }
}