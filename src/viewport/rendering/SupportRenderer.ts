import Konva from 'konva';
import type { Model, Node } from '../../stores/model/model.types';
import type Viewport from '../viewport';
import type IRenderer from './IRenderer';
import type { RenderingConfig } from './store/RenderingConfig';

// SVG path data for different support types
const fixedPath =
  'M1 1L36 1 M1 10L10 1 M1 4L4 1 M7 10L16 1 M13 10L22 1 M19 10L28 1 M25 10L34 1 M31 10L36 5';
const pinnedPath =
  'M12.7279 1.99646C12.5521 1.69338 12.2998 1.44181 11.9962 1.26693C11.6926 1.09205 11.3483 1 10.9979 1C10.6476 1 10.3033 1.09205 9.99972 1.26693C9.69611 1.44181 9.44376 1.69338 9.26795 1.99646L1.26795 15.9965C1.0925 16.3003 1.00009 16.645 1 16.9959C0.99991 17.3468 1.09214 17.6916 1.26744 17.9956C1.44273 18.2995 1.69492 18.5521 1.99867 18.7277C2.30242 18.9034 2.64705 18.9961 2.99795 18.9965H18.9979C19.3488 18.9961 19.6935 18.9034 19.9972 18.7277C20.301 18.5521 20.5532 18.2995 20.7285 17.9956C20.9038 17.6916 20.996 17.3468 20.9959 16.9959C20.9958 16.645 20.9034 16.3003 20.7279 15.9965L12.7279 1.99646Z';
const rollerPath =
  'M12.7304 1.99665C12.5545 1.69351 12.3021 1.44189 11.9984 1.26698C11.6948 1.09207 11.3505 1 11 1C10.6495 1 10.3052 1.09207 10.0016 1.26698C9.69789 1.44189 9.44549 1.69351 9.26965 1.99665L1.268 15.9994C1.09252 16.3034 1.00009 16.6481 1 16.9991C0.99991 17.3501 1.09216 17.6949 1.26749 17.9989C1.44282 18.303 1.69506 18.5555 1.99887 18.7312C2.30269 18.9069 2.64739 18.9996 2.99836 19H19.0016C19.3526 18.9996 19.6973 18.9069 20.0011 18.7312C20.3049 18.5555 20.5572 18.303 20.7325 17.9989C20.9078 17.6949 21.0001 17.3501 21 16.9991C20.9999 16.6481 20.9075 16.3034 20.732 15.9994L12.7304 1.99665Z M1.00205 24H21.0021';

// configs holding path data and offsets for different support types
const supportConfigs = {
  fixed: {
    data: fixedPath,
    offsetX: 18,
    offsetY: 1,
    rotation: 0,
  },
  pinned: {
    data: pinnedPath,
    offsetX: 11,
    offsetY: 1,
  },
  roller: {
    data: rollerPath,
    offsetX: 11,
    offsetY: 1,
  },
  verticalRoller: {
    data: rollerPath, // reuse roller path with rotation
    offsetX: 11,
    offsetY: 1,
    rotation: 90,
  },
};

class SupportRenderer implements IRenderer {
  private supportShapes: Map<string | number, Konva.Path> = new Map(); // Cache for node shapes
  private nodeColor = '#d8d8d8ff';
  private prototypes: Map<string, Konva.Path> = new Map();

  // create prototypes for each support type, so we can clone them later and avoid recreating from scratch
  constructor() {
    this.prototypes.set(
      'fixed',
      new Konva.Path({
        ...supportConfigs.fixed,
        stroke: this.nodeColor,
        strokeWidth: 2,
        strokeScaleEnabled: false,
        perfectDrawEnabled: false,
        listening: true,
      })
    );
    this.prototypes.set(
      'pinned',
      new Konva.Path({
        ...supportConfigs.pinned,
        stroke: this.nodeColor,
        strokeWidth: 2,
        strokeScaleEnabled: false,
        perfectDrawEnabled: false,
        listening: true,
      })
    );
    this.prototypes.set(
      'roller',
      new Konva.Path({
        ...supportConfigs.roller,
        stroke: this.nodeColor,
        strokeWidth: 2,
        strokeScaleEnabled: false,
        perfectDrawEnabled: false,
        listening: true,
      })
    );
    this.prototypes.set(
      'verticalRoller',
      new Konva.Path({
        ...supportConfigs.verticalRoller,
        stroke: this.nodeColor,
        strokeWidth: 2,
        strokeScaleEnabled: false,
        perfectDrawEnabled: false,
        listening: true,
      })
    );
  }

  public update(
    _: Model,
    viewport: Viewport,
    layer: Konva.Layer,
    config: RenderingConfig,
    selection: string[]
  ): void {
    if (!config.supports.visible) {
      return;
    }
    const stage = viewport.getStage();
    if (!stage) return;
    const scale = stage.scaleX();
    for (const support of this.supportShapes.values()) {
      support.scale({
        x: config.supports.scale / scale,
        y: config.supports.scale / scale,
      }); // scales to counteract viewport zoom
    }
  }

  public draw(
    model: Model,
    viewport: Viewport,
    layer: Konva.Layer,
    config: RenderingConfig,
    selection: string[] //TODO: unused property
  ): void {
    if (!config.supports.visible) {
      return;
    }
    const scale = viewport.getStage()?.scaleX() || 1;
    this.reset();

    model.nodes.forEach((node, index) => {
      let supportType: string | null = null;
      const constraint = node.constraint;
      if (!constraint) return; // skip nodes without constraints

      // determine support type based on constraints
      if (constraint.fixedX && constraint.fixedY && constraint.fixedRotation) {
        supportType = 'fixed';
      } else if (
        constraint.fixedX &&
        constraint.fixedY &&
        !constraint.fixedRotation
      ) {
        supportType = 'pinned';
      } else if (
        !constraint.fixedX &&
        constraint.fixedY &&
        !constraint.fixedRotation
      ) {
        supportType = 'roller';
      } else if (
        constraint.fixedX &&
        !constraint.fixedY &&
        !constraint.fixedRotation
      ) {
        supportType = 'verticalRoller';
      }

      if (supportType && this.prototypes.has(supportType)) {
        const prototype = this.prototypes.get(supportType)!;
        let rotation = prototype.rotation(); // Default from config

        // Special handling for vertical roller
        // If no element connects to the left (same Y, lower X), rotate to -90; otherwise, 90
        if (supportType === 'verticalRoller') {
          const hasLeftElement = model.elements.some((element) => {
            let otherNode = null;
            // Find the other node connected by this element
            if (element.nodeA.id === node.id) {
              otherNode = element.nodeB;
            } else if (element.nodeB.id === node.id) {
              otherNode = element.nodeA;
            }
            // Check if other node is to the left and at same Y
            if (
              otherNode &&
              otherNode.dy === node.dy &&
              otherNode.dx < node.dx
            ) {
              return true; // Found a left element
            }
            return false;
          });
          if (!hasLeftElement) {
            rotation = 90;
          } else {
            rotation = -90;
          }
        }

        if (supportType === 'fixed') {
          let sumDx = 0;
          let sumDy = 0;
          let count = 0;
          model.elements.forEach((element) => {
            let otherNode = null;
            if (element.nodeA.id === node.id) {
              otherNode = element.nodeB;
            } else if (element.nodeB.id === node.id) {
              otherNode = element.nodeA;
            }
            if (otherNode) {
              sumDx += otherNode.dx - node.dx;
              sumDy += otherNode.dy - node.dy;
              count++;
            }
          });
          if (count > 0) {
            const avgAngle = Math.atan2(sumDy, sumDx); // Average direction in radians
            rotation = (avgAngle * 180) / Math.PI; // Convert to degrees for Konva
            rotation += 90; // Adjust to be perpendicular to average element direction
          }
        }

        const support = prototype.clone({
          x: node.dx,
          y: node.dy,
          scale: {
            x: config.supports.scale / scale,
            y: config.supports.scale / scale,
          },
          rotation: rotation,
          id: `support-${index}`, // unique id for caching
        });
        this.supportShapes.set(index, support); // cache the support shape
        layer.add(support);
      }
    });
  }

  public reset(): void {
    this.supportShapes.clear(); // clear the cache
  }
}

export default SupportRenderer;
