export abstract class SceneNode {
    children: SceneNode[] = [];
    add(child: SceneNode) {
        this.children.push(child);
    }
}