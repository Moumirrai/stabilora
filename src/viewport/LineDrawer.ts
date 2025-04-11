// LineDrawer.ts
import Konva from 'konva';
import StageManager from './StageManager';
import { SnapManager } from './SnapManager';
import { v4 as uuidv4 } from 'uuid'; // for generating unique IDs
import { SnapService } from './services/SnapService';
import type { SnapConfig } from './types';
import { get } from 'svelte/store';

class LineDrawer {
  private stageManager: StageManager;
  private snapManager: SnapManager;
  private isDrawing = false;
  private startPoint: { x: number; y: number } | null = null;
  private previewLine: Konva.Line | null = null;

  public isDrawingRef = false;

  constructor(stageManager: StageManager) {
    this.stageManager = stageManager;
    this.snapManager = SnapService.getInstance().getSnapManager();
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    const stage = this.stageManager.getStage();
    if (!stage) return;

    stage.on('click', (e) => {
      if (e.evt.button !== 0) return;
      const pos = get(this.stageManager.pointerPositionRef);

      if (!this.isDrawing) {
        // Start drawing
        this.startDrawing(pos);
      } else {
        // Finish drawing
        this.finishDrawing(pos);
      }
    });

    stage.on('mousemove', () => {
      if (this.isDrawing) {
        this.updatePreview();
      }
    });

    stage.on('redraw', () => {
      if (this.isDrawing) {
        this.updatePreview();
      }
    });
  }

  // In LineDrawer.ts
  public startNew() {
    this.isDrawing = true;
  }

  private startDrawing(pos: { x: number; y: number }) {
    this.isDrawing = true;
    this.isDrawingRef = true;

    const scale = this.stageManager.getStage()?.scaleX() || 1;

    // Add snap handling
    const snappedPos = this.snapManager.snapPoint(pos, scale);
    this.startPoint = snappedPos;
    this.snapManager.setStartPoint(snappedPos); // For axis locking

    // Create preview line
    this.previewLine = new Konva.Line({
      points: [snappedPos.x, snappedPos.y, snappedPos.x, snappedPos.y],
      stroke: '#fff',
      strokeWidth: 2,
      dash: [5, 5],
      strokeScaleEnabled: false,
    });

    const layer = this.stageManager.getLayerManager().geometryLayer;
    layer?.add(this.previewLine);
  }

  private updatePreview() {
    if (!this.previewLine || !this.startPoint) return;
    const scale = this.stageManager.getStage()?.scaleX() || 1;

    const currentPos = get(this.stageManager.pointerPositionRef);
    const snappedPos = this.snapManager.snapPoint(currentPos, scale);

    this.previewLine.points([
      this.startPoint.x,
      this.startPoint.y,
      snappedPos.x,
      snappedPos.y,
    ]);
  }

  private finishDrawing(endPos: { x: number; y: number }) {
    if (!this.startPoint || !this.previewLine) return;
    const scale = this.stageManager.getStage()?.scaleX() || 1;

    const snappedEndPos = this.snapManager.snapPoint(endPos, scale);

    // Create the line data structure
    const lineData = {
      id: uuidv4(),
      start: this.startPoint,
      end: snappedEndPos,
      center: {
        x: (this.startPoint.x + snappedEndPos.x) / 2,
        y: (this.startPoint.y + snappedEndPos.y) / 2,
      },
      length: Math.sqrt(
        Math.pow(snappedEndPos.x - this.startPoint.x, 2) +
        Math.pow(snappedEndPos.y - this.startPoint.y, 2)
      ),
      angle: Math.atan2(
        snappedEndPos.y - this.startPoint.y,
        snappedEndPos.x - this.startPoint.x
      ),
    };

    // Add to snap manager
    this.snapManager.addLine(lineData);

    // Create permanent line
    const permanentLine = new Konva.Line({
      points: [
        this.startPoint.x,
        this.startPoint.y,
        snappedEndPos.x,
        snappedEndPos.y,
      ],
      stroke: '#f14c4c',
      strokeWidth: 2,
      id: lineData.id, // Store the ID for later reference
      strokeScaleEnabled: false,
    });

    const layer = this.stageManager.getLayerManager().geometryLayer;
    layer?.add(permanentLine);

    // Clean up
    this.previewLine.destroy();
    this.previewLine = null;
    this.startPoint = null;
    this.isDrawing = false;
    this.isDrawingRef = false;
    this.snapManager.clearStartPoint();

    //this.stageManager.render(layer);
  }

  public cancel() {
    if (this.previewLine) {
      this.previewLine.destroy();
      this.previewLine = null;
    }
    this.startPoint = null;
    this.isDrawing = false;
    this.isDrawingRef = false;
  }

  // Add methods to control snapping behavior
  public setSnapConfig(config: Partial<SnapConfig>) {
    this.snapManager.setConfig(config);
  }
}

export default LineDrawer;