// SnapManager.ts
import { Point, Line, SnapConfig } from './types';

export class SnapManager {
  private lines: Line[] = [];
  private config: SnapConfig = {
    enabled: true,
    endPointSnap: true,
    endPointSnapDistance: 10,
    axisLock: false,
    centerSnap: true,
    centerSnapDistance: 10,
    gridSnap: true,
    gridSize: 20,
    orthogonalSnap: true,
    orthogonalSnapDistance: 10
  };

  constructor(config?: Partial<SnapConfig>) {
    this.config = { ...this.config, ...config };
  }

  public setConfig(config: Partial<SnapConfig>) {
    this.config = { ...this.config, ...config };
  }

  public addLine(line: Line) {
    this.lines.push(line);
  }

  public removeLine(id: string) {
    this.lines = this.lines.filter(l => l.id !== id);
  }

  public snapPoint(point: Point, excludeLineId?: string): Point {
    if (!this.config.enabled) return point;

    let snappedPoint = { ...point };
    let minDistance = Infinity;

    // 1. End point snapping
    if (this.config.endPointSnap) {
      const endPoint = this.findNearestEndPoint(point, excludeLineId);
      if (endPoint && this.getDistance(point, endPoint) < this.config.endPointSnapDistance) {
        snappedPoint = endPoint;
        minDistance = this.getDistance(point, endPoint);
      }
    }

    // 2. Axis locking (relative to start point)
    if (this.config.axisLock && this.currentStartPoint) {
      const axisLocked = this.getAxisLockedPoint(point, this.currentStartPoint);
      const distance = this.getDistance(point, axisLocked);
      if (distance < minDistance) {
        snappedPoint = axisLocked;
        minDistance = distance;
      }
    }

    // 3. Center point snapping
    if (this.config.centerSnap) {
      const centerPoint = this.findNearestCenterPoint(point, excludeLineId);
      if (centerPoint && this.getDistance(point, centerPoint) < this.config.centerSnapDistance) {
        const distance = this.getDistance(point, centerPoint);
        if (distance < minDistance) {
          snappedPoint = centerPoint;
          minDistance = distance;
        }
      }
    }

    // 4. Grid snapping
    if (this.config.gridSnap) {
      const gridPoint = this.snapToGrid(point);
      const distance = this.getDistance(point, gridPoint);
      if (distance < minDistance) {
        snappedPoint = gridPoint;
        minDistance = distance;
      }
    }

    // 5. Orthogonal snapping
    if (this.config.orthogonalSnap) {
      const orthogonalPoint = this.findOrthogonalPoint(point, excludeLineId);
      if (orthogonalPoint) {
        const distance = this.getDistance(point, orthogonalPoint);
        if (distance < this.config.orthogonalSnapDistance && distance < minDistance) {
          snappedPoint = orthogonalPoint;
        }
      }
    }

    return snappedPoint;
  }

  private currentStartPoint: Point | null = null;
  
  public setStartPoint(point: Point) {
    this.currentStartPoint = point;
  }

  public clearStartPoint() {
    this.currentStartPoint = null;
  }

  private getDistance(p1: Point, p2: Point): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  private findNearestEndPoint(point: Point, excludeLineId?: string): Point | null {
    let nearest: Point | null = null;
    let minDistance = Infinity;

    this.lines
      .filter(l => l.id !== excludeLineId)
      .forEach(line => {
        [line.start, line.end].forEach(endPoint => {
          const distance = this.getDistance(point, endPoint);
          if (distance < minDistance) {
            minDistance = distance;
            nearest = endPoint;
          }
        });
      });

    return nearest;
  }

  private getAxisLockedPoint(point: Point, startPoint: Point): Point {
    const dx = Math.abs(point.x - startPoint.x);
    const dy = Math.abs(point.y - startPoint.y);
    
    if (dx > dy) {
      return { x: point.x, y: startPoint.y };
    } else {
      return { x: startPoint.x, y: point.y };
    }
  }

  private findNearestCenterPoint(point: Point, excludeLineId?: string): Point | null {
    let nearest: Point | null = null;
    let minDistance = Infinity;

    this.lines
      .filter(l => l.id !== excludeLineId)
      .forEach(line => {
        const distance = this.getDistance(point, line.center);
        if (distance < minDistance) {
          minDistance = distance;
          nearest = line.center;
        }
      });

    return nearest;
  }

  private snapToGrid(point: Point): Point {
    return {
      x: Math.round(point.x / this.config.gridSize) * this.config.gridSize,
      y: Math.round(point.y / this.config.gridSize) * this.config.gridSize
    };
  }

  private findOrthogonalPoint(point: Point, excludeLineId?: string): Point | null {
    let nearest: Point | null = null;
    let minDistance = Infinity;

    this.lines
      .filter(l => l.id !== excludeLineId)
      .forEach(line => {
        const orthogonal = this.getOrthogonalProjection(point, line);
        if (orthogonal) {
          const distance = this.getDistance(point, orthogonal);
          if (distance < minDistance) {
            minDistance = distance;
            nearest = orthogonal;
          }
        }
      });

    return nearest;
  }

  private getOrthogonalProjection(point: Point, line: Line): Point | null {
    const dx = line.end.x - line.start.x;
    const dy = line.end.y - line.start.y;
    const magnitude = Math.sqrt(dx * dx + dy * dy);
    
    if (magnitude === 0) return null;

    const u = ((point.x - line.start.x) * dx + (point.y - line.start.y) * dy) / (magnitude * magnitude);
    
    if (u < 0 || u > 1) return null;

    return {
      x: line.start.x + u * dx,
      y: line.start.y + u * dy
    };
  }
}