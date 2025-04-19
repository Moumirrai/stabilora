import { GroupNode } from './nodes/GroupNode';

export class SceneGraph {
  root: GroupNode = new GroupNode();
  getRoot() {
    return this.root;
  }
}